"""Tests for the LLM chat integration."""

import json

import pytest

import app.db as db
import app.llm as llm
from app.market import PriceCache


@pytest.fixture(autouse=True)
def tmp_db(tmp_path, monkeypatch):
    """Use a temporary database and mock mode for each test."""
    db_path = str(tmp_path / "test.db")
    monkeypatch.setattr(db, "DB_PATH", db_path)
    monkeypatch.setattr(db, "_initialized", False)
    monkeypatch.setattr(llm, "LLM_MOCK", True)


@pytest.fixture
def price_cache():
    cache = PriceCache()
    for ticker, price in [
        ("AAPL", 190.0), ("GOOGL", 175.0), ("MSFT", 420.0),
        ("AMZN", 185.0), ("TSLA", 250.0), ("NVDA", 880.0),
        ("META", 500.0), ("JPM", 195.0), ("V", 280.0), ("NFLX", 610.0),
        ("PYPL", 70.0),
    ]:
        cache.update(ticker, price)
    return cache


@pytest.fixture
async def conn():
    connection = await db.get_db()
    yield connection
    await connection.close()


async def test_basic_chat(price_cache, conn):
    result = await llm.handle_chat_message("How is my portfolio?", price_cache, conn)
    assert "message" in result
    assert isinstance(result["trades_executed"], list)
    assert isinstance(result["watchlist_changes_executed"], list)


async def test_mock_buy(price_cache, conn):
    result = await llm.handle_chat_message("Buy some AAPL", price_cache, conn)
    assert len(result["trades_executed"]) == 1
    trade = result["trades_executed"][0]
    assert trade["ticker"] == "AAPL"
    assert trade["side"] == "buy"
    assert trade["status"] == "executed"

    # Verify cash decreased
    cash = await db.get_cash_balance(conn)
    assert cash < 10000.0

    # Verify position created
    pos = await db.get_position(conn, "AAPL")
    assert pos is not None
    assert pos["quantity"] == 10


async def test_mock_sell_without_position(price_cache, conn):
    result = await llm.handle_chat_message("Sell AAPL", price_cache, conn)
    trade = result["trades_executed"][0]
    assert trade["status"] == "error"
    assert "Insufficient shares" in trade["error"]


async def test_mock_sell_with_position(price_cache, conn):
    # First buy
    await llm.handle_chat_message("Buy AAPL", price_cache, conn)
    # Then sell
    result = await llm.handle_chat_message("Sell AAPL", price_cache, conn)
    trade = result["trades_executed"][0]
    assert trade["status"] == "executed"

    # Position should have 5 remaining (bought 10, sold 5)
    pos = await db.get_position(conn, "AAPL")
    assert pos is not None
    assert pos["quantity"] == 5


async def test_mock_watchlist_add(price_cache, conn):
    result = await llm.handle_chat_message("Add PYPL to watchlist", price_cache, conn)
    assert len(result["watchlist_changes_executed"]) == 1
    change = result["watchlist_changes_executed"][0]
    assert change["ticker"] == "PYPL"
    assert change["status"] == "executed"


async def test_mock_watchlist_remove(price_cache, conn):
    result = await llm.handle_chat_message("Remove TSLA from watchlist", price_cache, conn)
    change = result["watchlist_changes_executed"][0]
    assert change["ticker"] == "TSLA"
    assert change["status"] == "executed"

    watchlist = await db.get_watchlist(conn)
    tickers = [w["ticker"] for w in watchlist]
    assert "TSLA" not in tickers


async def test_chat_messages_stored(price_cache, conn):
    await llm.handle_chat_message("Hello", price_cache, conn)
    messages = await db.get_recent_chat_messages(conn)
    assert len(messages) == 2  # user + assistant
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"


async def test_trade_insufficient_cash(price_cache, conn):
    # Set very low cash
    await db.update_cash_balance(conn, 1.0)
    result = await llm.handle_chat_message("Buy AAPL", price_cache, conn)
    trade = result["trades_executed"][0]
    assert trade["status"] == "error"
    assert "Insufficient cash" in trade["error"]


async def test_build_portfolio_context(price_cache, conn):
    context = llm._build_portfolio_context(
        10000.0,
        [{"ticker": "AAPL", "quantity": 10, "avg_cost": 180.0}],
        [{"ticker": "AAPL"}],
        price_cache,
    )
    assert "Cash Balance: $10,000.00" in context
    assert "AAPL" in context
    assert "P&L" in context


async def test_execute_trade_min_quantity(price_cache, conn):
    result = await llm._execute_trade(conn, "AAPL", "buy", 0.005, price_cache)
    assert result["status"] == "error"
    assert "Minimum" in result["error"]


async def test_execute_trade_no_price(price_cache, conn):
    result = await llm._execute_trade(conn, "UNKNOWN", "buy", 1.0, price_cache)
    assert result["status"] == "error"
    assert "No price" in result["error"]
