"""LLM chat integration for FinAlly AI trading assistant."""

from __future__ import annotations

import json
import os
from typing import TYPE_CHECKING, Any

import app.db as db
from app.market import PriceCache

if TYPE_CHECKING:
    import aiosqlite

# Model config
LLM_MODEL = "openrouter/openai/gpt-oss-120b"
LLM_MOCK = os.environ.get("LLM_MOCK", "false").lower() == "true"

SYSTEM_PROMPT = """You are FinAlly, an AI trading assistant for a simulated trading workstation. You help users analyze their portfolio, suggest trades, and execute orders.

You MUST respond with valid JSON matching this exact schema:
{
  "message": "Your conversational response to the user",
  "trades": [{"ticker": "AAPL", "side": "buy", "quantity": 10}],
  "watchlist_changes": [{"ticker": "PYPL", "action": "add"}]
}

Rules:
- "message" is required and contains your text response
- "trades" is optional — include only when executing trades. side must be "buy" or "sell". quantity minimum is 0.01.
- "watchlist_changes" is optional — include only when modifying the watchlist. action must be "add" or "remove".
- Be concise and data-driven
- Analyze portfolio composition, risk concentration, and P&L when asked
- Execute trades when the user asks or agrees
- Manage the watchlist proactively when relevant
- Always respond with valid JSON — no markdown, no code fences"""


def _build_portfolio_context(
    cash: float,
    positions: list[dict],
    watchlist: list[dict],
    price_cache: PriceCache,
) -> str:
    """Build a context string with current portfolio state."""
    lines = [f"Cash Balance: ${cash:,.2f}"]

    # Positions with live prices
    total_positions_value = 0.0
    if positions:
        lines.append("\nPositions:")
        for pos in positions:
            ticker = pos["ticker"]
            qty = pos["quantity"]
            avg_cost = pos["avg_cost"]
            current_price = price_cache.get_price(ticker) or avg_cost
            market_value = qty * current_price
            cost_basis = qty * avg_cost
            unrealized_pnl = market_value - cost_basis
            pnl_pct = (unrealized_pnl / cost_basis * 100) if cost_basis else 0
            total_positions_value += market_value
            lines.append(
                f"  {ticker}: {qty} shares @ avg ${avg_cost:.2f}, "
                f"current ${current_price:.2f}, "
                f"P&L ${unrealized_pnl:+,.2f} ({pnl_pct:+.1f}%)"
            )
    else:
        lines.append("\nPositions: None")

    total_value = cash + total_positions_value
    lines.append(f"\nTotal Portfolio Value: ${total_value:,.2f}")

    # Watchlist with prices
    lines.append("\nWatchlist:")
    for item in watchlist:
        ticker = item["ticker"]
        price = price_cache.get_price(ticker)
        if price:
            lines.append(f"  {ticker}: ${price:.2f}")
        else:
            lines.append(f"  {ticker}: (no price)")

    return "\n".join(lines)


def _build_messages(
    portfolio_context: str,
    chat_history: list[dict],
    user_message: str,
) -> list[dict]:
    """Build the messages array for the LLM call."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT + "\n\n--- Current Portfolio ---\n" + portfolio_context},
    ]
    for msg in chat_history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_message})
    return messages


def _mock_response(user_message: str) -> dict:
    """Return deterministic mock LLM responses for testing."""
    msg_lower = user_message.lower()

    if "buy" in msg_lower:
        # Extract ticker and quantity if possible
        return {
            "message": "I've executed a buy order for 10 shares of AAPL.",
            "trades": [{"ticker": "AAPL", "side": "buy", "quantity": 10}],
            "watchlist_changes": [],
        }
    elif "sell" in msg_lower:
        return {
            "message": "I've executed a sell order for 5 shares of AAPL.",
            "trades": [{"ticker": "AAPL", "side": "sell", "quantity": 5}],
            "watchlist_changes": [],
        }
    elif "add" in msg_lower and "watchlist" in msg_lower:
        return {
            "message": "I've added PYPL to your watchlist.",
            "trades": [],
            "watchlist_changes": [{"ticker": "PYPL", "action": "add"}],
        }
    elif "remove" in msg_lower and "watchlist" in msg_lower:
        return {
            "message": "I've removed TSLA from your watchlist.",
            "trades": [],
            "watchlist_changes": [{"ticker": "TSLA", "action": "remove"}],
        }
    else:
        return {
            "message": "Your portfolio is valued at $10,000 in cash with no open positions. Consider diversifying across sectors.",
            "trades": [],
            "watchlist_changes": [],
        }


async def _call_llm(messages: list[dict]) -> dict:
    """Call the LLM via LiteLLM and parse structured JSON response."""
    from litellm import acompletion

    response = await acompletion(
        model=LLM_MODEL,
        messages=messages,
        response_format={"type": "json_object"},
        api_key=os.environ.get("OPENROUTER_API_KEY"),
    )

    content = response.choices[0].message.content
    return json.loads(content)


async def _execute_trade(
    conn: aiosqlite.Connection,
    ticker: str,
    side: str,
    quantity: float,
    price_cache: PriceCache,
) -> dict:
    """Execute a single trade and return result with status."""
    ticker = ticker.upper()
    result = {"ticker": ticker, "side": side, "quantity": quantity}

    if quantity < 0.01:
        result["status"] = "error"
        result["error"] = "Minimum order quantity is 0.01"
        return result

    current_price = price_cache.get_price(ticker)
    if current_price is None:
        result["status"] = "error"
        result["error"] = f"No price available for {ticker}"
        return result

    cash = await db.get_cash_balance(conn)

    if side == "buy":
        cost = quantity * current_price
        if cost > cash:
            result["status"] = "error"
            result["error"] = f"Insufficient cash: need ${cost:.2f}, have ${cash:.2f}"
            return result

        await db.update_cash_balance(conn, cash - cost)

        existing = await db.get_position(conn, ticker)
        if existing:
            total_qty = existing["quantity"] + quantity
            new_avg = (existing["quantity"] * existing["avg_cost"] + cost) / total_qty
            await db.upsert_position(conn, ticker, total_qty, new_avg)
        else:
            await db.upsert_position(conn, ticker, quantity, current_price)

    elif side == "sell":
        existing = await db.get_position(conn, ticker)
        if not existing or existing["quantity"] < quantity:
            owned = existing["quantity"] if existing else 0
            result["status"] = "error"
            result["error"] = f"Insufficient shares: own {owned}, trying to sell {quantity}"
            return result

        proceeds = quantity * current_price
        await db.update_cash_balance(conn, cash + proceeds)

        remaining = existing["quantity"] - quantity
        if remaining < 0.001:  # Effectively zero
            await db.delete_position(conn, ticker)
        else:
            await db.upsert_position(conn, ticker, remaining, existing["avg_cost"])
    else:
        result["status"] = "error"
        result["error"] = f"Invalid side: {side}"
        return result

    trade = await db.create_trade(conn, ticker, side, quantity, current_price)
    result["status"] = "executed"
    result["price"] = current_price
    result["trade_id"] = trade["id"]
    return result


async def _execute_watchlist_change(
    conn: aiosqlite.Connection,
    ticker: str,
    action: str,
) -> dict:
    """Execute a watchlist change and return result with status."""
    ticker = ticker.upper()
    result = {"ticker": ticker, "action": action}

    if action == "add":
        await db.add_to_watchlist(conn, ticker)
        result["status"] = "executed"
    elif action == "remove":
        await db.remove_from_watchlist(conn, ticker)
        result["status"] = "executed"
    else:
        result["status"] = "error"
        result["error"] = f"Invalid action: {action}"

    return result


async def handle_chat_message(
    user_message: str,
    price_cache: PriceCache,
    conn: Any = None,
) -> dict:
    """Process a user chat message: call LLM, execute actions, store messages.

    Returns: {message, trades_executed, watchlist_changes_executed}
    """
    close_conn = False
    if conn is None:
        conn = await db.get_db()
        close_conn = True

    try:
        # Store user message
        await db.create_chat_message(conn, "user", user_message)

        # Build context
        cash = await db.get_cash_balance(conn)
        positions = await db.get_positions(conn)
        watchlist = await db.get_watchlist(conn)
        chat_history = await db.get_recent_chat_messages(conn, limit=20)

        portfolio_context = _build_portfolio_context(cash, positions, watchlist, price_cache)

        # Call LLM or mock
        try:
            if LLM_MOCK:
                llm_response = _mock_response(user_message)
            else:
                messages = _build_messages(portfolio_context, chat_history, user_message)
                llm_response = await _call_llm(messages)
        except Exception as e:
            llm_response = {
                "message": f"I'm sorry, I encountered an error processing your request. Please try again. (Error: {e})",
                "trades": [],
                "watchlist_changes": [],
            }

        # Extract fields with defaults
        assistant_message = llm_response.get("message", "I couldn't generate a response.")
        trades = llm_response.get("trades", [])
        watchlist_changes = llm_response.get("watchlist_changes", [])

        # Execute trades
        trades_executed = []
        for trade in trades:
            result = await _execute_trade(
                conn,
                trade.get("ticker", ""),
                trade.get("side", ""),
                trade.get("quantity", 0),
                price_cache,
            )
            trades_executed.append(result)

        # Execute watchlist changes
        watchlist_changes_executed = []
        for change in watchlist_changes:
            result = await _execute_watchlist_change(
                conn,
                change.get("ticker", ""),
                change.get("action", ""),
            )
            watchlist_changes_executed.append(result)

        # Store assistant message with actions
        actions = None
        if trades_executed or watchlist_changes_executed:
            actions = json.dumps({
                "trades_executed": trades_executed,
                "watchlist_changes_executed": watchlist_changes_executed,
            })

        await db.create_chat_message(conn, "assistant", assistant_message, actions)

        return {
            "message": assistant_message,
            "trades_executed": trades_executed,
            "watchlist_changes_executed": watchlist_changes_executed,
        }
    finally:
        if close_conn:
            await conn.close()
