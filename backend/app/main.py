<<<<<<< HEAD
"""FastAPI application entry point for FinAlly."""
=======
"""FastAPI application for FinAlly."""
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7

import asyncio
import logging
from contextlib import asynccontextmanager
<<<<<<< HEAD

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app import db
from app.market import PriceCache, create_market_data_source, create_stream_router

logger = logging.getLogger(__name__)

price_cache = PriceCache()
market_source = create_market_data_source(price_cache)

_snapshot_task: asyncio.Task | None = None


async def _snapshot_loop():
    """Record portfolio value every 30 seconds."""
    while True:
        await asyncio.sleep(30)
        try:
            conn = await db.get_db()
            try:
                cash = await db.get_cash_balance(conn)
                positions = await db.get_positions(conn)
                total = cash + sum(
                    p["quantity"] * (price_cache.get_price(p["ticker"]) or p["avg_cost"])
                    for p in positions
                )
                await db.create_portfolio_snapshot(conn, total)
            finally:
                await conn.close()
        except Exception:
            logger.exception("Error in snapshot loop")
=======
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.db import get_cash_balance, get_positions, get_watchlist, init_db, insert_snapshot
from app.market import PriceCache, create_market_data_source, create_stream_router
from app.routes import chat, portfolio, watchlist

logger = logging.getLogger(__name__)

# Module-level PriceCache — shared between SSE router and the rest of the app
price_cache = PriceCache()


async def _snapshot_loop(cache: PriceCache):
    """Background task: record portfolio snapshot every 30 seconds."""
    while True:
        await asyncio.sleep(30)
        try:
            cash = await get_cash_balance()
            positions = await get_positions()
            total_value = cash
            for pos in positions:
                price = cache.get_price(pos["ticker"]) or pos["avg_cost"]
                total_value += price * pos["quantity"]
            await insert_snapshot(round(total_value, 2))
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Error recording portfolio snapshot")
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7


@asynccontextmanager
async def lifespan(app: FastAPI):
<<<<<<< HEAD
    global _snapshot_task
    # Init DB
    await db.init_db()

    # Get tickers to track: union of watchlist + positions
    conn = await db.get_db()
    try:
        watchlist = await db.get_watchlist(conn)
        positions = await db.get_positions(conn)
    finally:
        await conn.close()

    tickers = list({w["ticker"] for w in watchlist} | {p["ticker"] for p in positions})
    await market_source.start(tickers)
    _snapshot_task = asyncio.create_task(_snapshot_loop())

    yield

    _snapshot_task.cancel()
    try:
        await _snapshot_task
    except asyncio.CancelledError:
        pass
    await market_source.stop()
=======
    """Startup/shutdown lifecycle."""
    await init_db()

    source = create_market_data_source(price_cache)

    app.state.price_cache = price_cache
    app.state.market_source = source

    # Start market data with watchlist tickers
    wl = await get_watchlist()
    tickers = [entry["ticker"] for entry in wl]
    await source.start(tickers)
    logger.info("Market data source started with %d tickers", len(tickers))

    # Start snapshot background task
    snapshot_task = asyncio.create_task(_snapshot_loop(price_cache))

    # Record initial snapshot
    cash = await get_cash_balance()
    await insert_snapshot(round(cash, 2))

    yield

    # Shutdown
    snapshot_task.cancel()
    try:
        await snapshot_task
    except asyncio.CancelledError:
        pass

    await source.stop()
    logger.info("Market data source stopped")
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7


app = FastAPI(title="FinAlly", lifespan=lifespan)

<<<<<<< HEAD
# SSE streaming
=======
# API routes
app.include_router(portfolio.router)
app.include_router(watchlist.router)
app.include_router(chat.router)

# SSE streaming — uses the module-level price_cache
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7
stream_router = create_stream_router(price_cache)
app.include_router(stream_router)


<<<<<<< HEAD
# --- Health ---

=======
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7
@app.get("/api/health")
async def health():
    return {"status": "ok"}


<<<<<<< HEAD
# --- Portfolio ---

@app.get("/api/portfolio")
async def get_portfolio():
    conn = await db.get_db()
    try:
        cash = await db.get_cash_balance(conn)
        positions = await db.get_positions(conn)
    finally:
        await conn.close()

    enriched = []
    total_positions_value = 0.0
    for p in positions:
        current_price = price_cache.get_price(p["ticker"]) or p["avg_cost"]
        unrealized_pnl = (current_price - p["avg_cost"]) * p["quantity"]
        pnl_percent = ((current_price - p["avg_cost"]) / p["avg_cost"] * 100) if p["avg_cost"] else 0.0
        position_value = current_price * p["quantity"]
        total_positions_value += position_value
        enriched.append({
            "ticker": p["ticker"],
            "quantity": p["quantity"],
            "avg_cost": p["avg_cost"],
            "current_price": round(current_price, 2),
            "unrealized_pnl": round(unrealized_pnl, 2),
            "pnl_percent": round(pnl_percent, 2),
        })

    return {
        "cash_balance": round(cash, 2),
        "positions": enriched,
        "total_value": round(cash + total_positions_value, 2),
    }


class TradeRequest(BaseModel):
    ticker: str
    quantity: float = Field(ge=0.01)
    side: str


@app.post("/api/portfolio/trade")
async def execute_trade(req: TradeRequest):
    ticker = req.ticker.upper()
    side = req.side.lower()
    if side not in ("buy", "sell"):
        raise HTTPException(400, "side must be 'buy' or 'sell'")

    current_price = price_cache.get_price(ticker)
    if current_price is None:
        raise HTTPException(400, f"No price available for {ticker}")

    conn = await db.get_db()
    try:
        cash = await db.get_cash_balance(conn)

        if side == "buy":
            cost = req.quantity * current_price
            if cost > cash:
                raise HTTPException(400, "Insufficient cash")
            await db.update_cash_balance(conn, cash - cost)

            existing = await db.get_position(conn, ticker)
            if existing:
                total_qty = existing["quantity"] + req.quantity
                new_avg = (existing["avg_cost"] * existing["quantity"] + cost) / total_qty
                position = await db.upsert_position(conn, ticker, total_qty, new_avg)
            else:
                position = await db.upsert_position(conn, ticker, req.quantity, current_price)

        else:  # sell
            existing = await db.get_position(conn, ticker)
            if not existing or existing["quantity"] < req.quantity:
                raise HTTPException(400, "Insufficient shares")
            proceeds = req.quantity * current_price
            await db.update_cash_balance(conn, cash + proceeds)

            remaining = existing["quantity"] - req.quantity
            if remaining < 0.0001:  # effectively zero
                await db.delete_position(conn, ticker)
                position = None
            else:
                position = await db.upsert_position(conn, ticker, remaining, existing["avg_cost"])

        trade = await db.create_trade(conn, ticker, side, req.quantity, current_price)
        new_cash = await db.get_cash_balance(conn)

        # Snapshot after trade
        positions = await db.get_positions(conn)
        total = new_cash + sum(
            p["quantity"] * (price_cache.get_price(p["ticker"]) or p["avg_cost"])
            for p in positions
        )
        await db.create_portfolio_snapshot(conn, total)
    finally:
        await conn.close()

    return {"trade": trade, "cash_balance": round(new_cash, 2), "position": position}


@app.get("/api/portfolio/history")
async def portfolio_history():
    conn = await db.get_db()
    try:
        snapshots = await db.get_portfolio_snapshots(conn)
    finally:
        await conn.close()
    return snapshots


# --- Watchlist ---

@app.get("/api/watchlist")
async def get_watchlist():
    conn = await db.get_db()
    try:
        watchlist = await db.get_watchlist(conn)
    finally:
        await conn.close()

    result = []
    for w in watchlist:
        price_update = price_cache.get(w["ticker"])
        entry = {"ticker": w["ticker"], "added_at": w["added_at"]}
        if price_update:
            entry.update(price_update.to_dict())
        result.append(entry)
    return result


class WatchlistAddRequest(BaseModel):
    ticker: str


@app.post("/api/watchlist")
async def add_watchlist(req: WatchlistAddRequest):
    ticker = req.ticker.upper()
    conn = await db.get_db()
    try:
        entry = await db.add_to_watchlist(conn, ticker)
    finally:
        await conn.close()
    await market_source.add_ticker(ticker)
    return entry


@app.delete("/api/watchlist/{ticker}")
async def remove_watchlist(ticker: str):
    ticker = ticker.upper()
    conn = await db.get_db()
    try:
        await db.remove_from_watchlist(conn, ticker)
        position = await db.get_position(conn, ticker)
    finally:
        await conn.close()

    if not position:
        await market_source.remove_ticker(ticker)
    return {"status": "removed", "ticker": ticker}


# --- Chat ---

from app.llm import handle_chat_message


class ChatRequest(BaseModel):
    message: str


@app.post("/api/chat")
async def chat(req: ChatRequest):
    conn = await db.get_db()
    try:
        result = await handle_chat_message(req.message, price_cache, conn)
    finally:
        await conn.close()

    # Update market source for any watchlist changes
    for change in result.get("watchlist_changes_executed", []):
        if change.get("status") == "executed":
            if change["action"] == "add":
                await market_source.add_ticker(change["ticker"])
            elif change["action"] == "remove":
                # Only remove from market source if no position
                c2 = await db.get_db()
                try:
                    pos = await db.get_position(c2, change["ticker"])
                finally:
                    await c2.close()
                if not pos:
                    await market_source.remove_ticker(change["ticker"])

    return result


# Static files — must be last so API routes take priority
import os

_static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(_static_dir):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
=======
# Static files serving (frontend) — mount last so API routes take priority
_static_dir = Path(__file__).parent.parent / "static"
if _static_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(_static_dir), html=True), name="static")
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7
