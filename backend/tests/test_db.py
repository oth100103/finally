"""Tests for the SQLite database layer."""

import json
import os
import tempfile

import pytest

import app.db as db


@pytest.fixture(autouse=True)
def tmp_db(tmp_path, monkeypatch):
    """Use a temporary database for each test."""
    db_path = str(tmp_path / "test.db")
    monkeypatch.setattr(db, "DB_PATH", db_path)
    monkeypatch.setattr(db, "_initialized", False)
    return db_path


@pytest.fixture
async def conn():
    connection = await db.get_db()
    yield connection
    await connection.close()


async def test_init_creates_tables(conn):
    cursor = await conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = {row["name"] for row in await cursor.fetchall()}
    expected = {"users_profile", "watchlist", "positions", "trades", "portfolio_snapshots", "chat_messages"}
    assert expected.issubset(tables)


async def test_seed_data(conn):
    balance = await db.get_cash_balance(conn)
    assert balance == 10000.0

    watchlist = await db.get_watchlist(conn)
    tickers = [w["ticker"] for w in watchlist]
    assert len(tickers) == 10
    assert "AAPL" in tickers


async def test_cash_balance(conn):
    await db.update_cash_balance(conn, 5000.0)
    assert await db.get_cash_balance(conn) == 5000.0


async def test_watchlist_crud(conn):
    await db.add_to_watchlist(conn, "PYPL")
    wl = await db.get_watchlist(conn)
    tickers = [w["ticker"] for w in wl]
    assert "PYPL" in tickers

    await db.remove_from_watchlist(conn, "PYPL")
    wl = await db.get_watchlist(conn)
    tickers = [w["ticker"] for w in wl]
    assert "PYPL" not in tickers


async def test_watchlist_add_duplicate(conn):
    """Adding duplicate ticker should not raise."""
    await db.add_to_watchlist(conn, "AAPL")
    wl = await db.get_watchlist(conn)
    aapl_count = sum(1 for w in wl if w["ticker"] == "AAPL")
    assert aapl_count == 1


async def test_positions_crud(conn):
    # No positions initially
    assert await db.get_positions(conn) == []
    assert await db.get_position(conn, "AAPL") is None

    # Upsert
    pos = await db.upsert_position(conn, "AAPL", 10.0, 150.0)
    assert pos["ticker"] == "AAPL"
    assert pos["quantity"] == 10.0

    # Get
    pos = await db.get_position(conn, "AAPL")
    assert pos is not None
    assert pos["avg_cost"] == 150.0

    # Update
    await db.upsert_position(conn, "AAPL", 20.0, 155.0)
    pos = await db.get_position(conn, "AAPL")
    assert pos["quantity"] == 20.0

    # Delete
    await db.delete_position(conn, "AAPL")
    assert await db.get_position(conn, "AAPL") is None


async def test_trades(conn):
    trade = await db.create_trade(conn, "AAPL", "buy", 10.0, 150.0)
    assert trade["ticker"] == "AAPL"
    assert trade["side"] == "buy"
    assert "id" in trade

    trades = await db.get_trades(conn)
    assert len(trades) == 1
    assert trades[0]["id"] == trade["id"]


async def test_portfolio_snapshots(conn):
    snap = await db.create_portfolio_snapshot(conn, 10500.0)
    assert snap["total_value"] == 10500.0

    snaps = await db.get_portfolio_snapshots(conn)
    assert len(snaps) == 1


async def test_chat_messages(conn):
    msg = await db.create_chat_message(conn, "user", "Hello")
    assert msg["role"] == "user"
    assert msg["actions"] is None

    # With actions
    actions = json.dumps({"trades": [{"ticker": "AAPL", "side": "buy", "quantity": 5}]})
    await db.create_chat_message(conn, "assistant", "Done!", actions)

    messages = await db.get_recent_chat_messages(conn)
    assert len(messages) == 2
    assert messages[0]["role"] == "user"  # Chronological order
    assert messages[1]["actions"] is not None


async def test_chat_messages_limit(conn):
    for i in range(25):
        await db.create_chat_message(conn, "user", f"Message {i}")

    messages = await db.get_recent_chat_messages(conn, limit=20)
    assert len(messages) == 20
    # Should be the most recent 20
    assert messages[0]["content"] == "Message 5"


async def test_ticker_case_normalization(conn):
    await db.add_to_watchlist(conn, "pypl")
    pos = await db.get_position(conn, "aapl")
    assert pos is None  # No position yet, but no error

    await db.upsert_position(conn, "aapl", 5.0, 100.0)
    pos = await db.get_position(conn, "AAPL")
    assert pos is not None
    assert pos["ticker"] == "AAPL"
