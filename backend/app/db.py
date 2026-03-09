"""SQLite database layer with lazy initialization using aiosqlite."""

import os
import uuid
from datetime import datetime, timezone

import aiosqlite

# Database path: configurable via env var, default to db/finally.db relative to project root
DB_PATH = os.environ.get("FINALLY_DB_PATH", os.path.join(os.path.dirname(__file__), "..", "..", "db", "finally.db"))

DEFAULT_TICKERS = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "META", "JPM", "V", "NFLX"]

_initialized = False


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _uuid() -> str:
    return str(uuid.uuid4())


async def get_db() -> aiosqlite.Connection:
    """Get a database connection, initializing if needed."""
    global _initialized
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    if not _initialized:
        await _init_schema(db)
        _initialized = True
    return db


async def _init_schema(db: aiosqlite.Connection) -> None:
    """Create tables and seed data if they don't exist."""
    await db.executescript("""
        CREATE TABLE IF NOT EXISTS users_profile (
            id TEXT PRIMARY KEY,
            cash_balance REAL NOT NULL DEFAULT 10000.0,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS watchlist (
            ticker TEXT PRIMARY KEY,
            added_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS positions (
            ticker TEXT PRIMARY KEY,
            quantity REAL NOT NULL,
            avg_cost REAL NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS trades (
            id TEXT PRIMARY KEY,
            ticker TEXT NOT NULL,
            side TEXT NOT NULL,
            quantity REAL NOT NULL,
            price REAL NOT NULL,
            executed_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS portfolio_snapshots (
            id TEXT PRIMARY KEY,
            total_value REAL NOT NULL,
            recorded_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            actions TEXT,
            created_at TEXT NOT NULL
        );
    """)

    # Seed default user if not exists
    cursor = await db.execute("SELECT id FROM users_profile WHERE id = 'default'")
    if await cursor.fetchone() is None:
        await db.execute(
            "INSERT INTO users_profile (id, cash_balance, created_at) VALUES (?, ?, ?)",
            ("default", 10000.0, _now()),
        )

    # Seed default watchlist
    for ticker in DEFAULT_TICKERS:
        await db.execute(
            "INSERT OR IGNORE INTO watchlist (ticker, added_at) VALUES (?, ?)",
            (ticker, _now()),
        )

    await db.commit()


async def init_db() -> None:
    """Explicitly initialize the database (lazy init on first get_db call)."""
    db = await get_db()
    await db.close()


# --- Users Profile ---

async def get_cash_balance(db: aiosqlite.Connection) -> float:
    cursor = await db.execute("SELECT cash_balance FROM users_profile WHERE id = 'default'")
    row = await cursor.fetchone()
    return row["cash_balance"] if row else 10000.0


async def update_cash_balance(db: aiosqlite.Connection, new_balance: float) -> None:
    await db.execute(
        "UPDATE users_profile SET cash_balance = ? WHERE id = 'default'",
        (new_balance,),
    )
    await db.commit()


# --- Watchlist ---

async def get_watchlist(db: aiosqlite.Connection) -> list[dict]:
    cursor = await db.execute("SELECT ticker, added_at FROM watchlist ORDER BY added_at")
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


async def add_to_watchlist(db: aiosqlite.Connection, ticker: str) -> dict:
    now = _now()
    await db.execute(
        "INSERT OR IGNORE INTO watchlist (ticker, added_at) VALUES (?, ?)",
        (ticker.upper(), now),
    )
    await db.commit()
    return {"ticker": ticker.upper(), "added_at": now}


async def remove_from_watchlist(db: aiosqlite.Connection, ticker: str) -> None:
    await db.execute("DELETE FROM watchlist WHERE ticker = ?", (ticker.upper(),))
    await db.commit()


# --- Positions ---

async def get_positions(db: aiosqlite.Connection) -> list[dict]:
    cursor = await db.execute("SELECT ticker, quantity, avg_cost, updated_at FROM positions")
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


async def get_position(db: aiosqlite.Connection, ticker: str) -> dict | None:
    cursor = await db.execute(
        "SELECT ticker, quantity, avg_cost, updated_at FROM positions WHERE ticker = ?",
        (ticker.upper(),),
    )
    row = await cursor.fetchone()
    return dict(row) if row else None


async def upsert_position(
    db: aiosqlite.Connection, ticker: str, quantity: float, avg_cost: float
) -> dict:
    now = _now()
    await db.execute(
        """INSERT INTO positions (ticker, quantity, avg_cost, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(ticker) DO UPDATE SET
               quantity = excluded.quantity,
               avg_cost = excluded.avg_cost,
               updated_at = excluded.updated_at""",
        (ticker.upper(), quantity, avg_cost, now),
    )
    await db.commit()
    return {"ticker": ticker.upper(), "quantity": quantity, "avg_cost": avg_cost, "updated_at": now}


async def delete_position(db: aiosqlite.Connection, ticker: str) -> None:
    await db.execute("DELETE FROM positions WHERE ticker = ?", (ticker.upper(),))
    await db.commit()


# --- Trades ---

async def create_trade(
    db: aiosqlite.Connection, ticker: str, side: str, quantity: float, price: float
) -> dict:
    trade_id = _uuid()
    now = _now()
    await db.execute(
        "INSERT INTO trades (id, ticker, side, quantity, price, executed_at) VALUES (?, ?, ?, ?, ?, ?)",
        (trade_id, ticker.upper(), side, quantity, price, now),
    )
    await db.commit()
    return {
        "id": trade_id, "ticker": ticker.upper(), "side": side,
        "quantity": quantity, "price": price, "executed_at": now,
    }


async def get_trades(db: aiosqlite.Connection) -> list[dict]:
    cursor = await db.execute("SELECT * FROM trades ORDER BY executed_at DESC")
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


# --- Portfolio Snapshots ---

async def create_portfolio_snapshot(db: aiosqlite.Connection, total_value: float) -> dict:
    snap_id = _uuid()
    now = _now()
    await db.execute(
        "INSERT INTO portfolio_snapshots (id, total_value, recorded_at) VALUES (?, ?, ?)",
        (snap_id, total_value, now),
    )
    await db.commit()
    return {"id": snap_id, "total_value": total_value, "recorded_at": now}


async def get_portfolio_snapshots(db: aiosqlite.Connection) -> list[dict]:
    cursor = await db.execute("SELECT * FROM portfolio_snapshots ORDER BY recorded_at")
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]


# --- Chat Messages ---

async def create_chat_message(
    db: aiosqlite.Connection, role: str, content: str, actions: str | None = None
) -> dict:
    msg_id = _uuid()
    now = _now()
    await db.execute(
        "INSERT INTO chat_messages (id, role, content, actions, created_at) VALUES (?, ?, ?, ?, ?)",
        (msg_id, role, content, actions, now),
    )
    await db.commit()
    return {
        "id": msg_id, "role": role, "content": content,
        "actions": actions, "created_at": now,
    }


async def get_recent_chat_messages(db: aiosqlite.Connection, limit: int = 20) -> list[dict]:
    cursor = await db.execute(
        "SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT ?", (limit,)
    )
    rows = await cursor.fetchall()
    return [dict(row) for row in reversed(rows)]
