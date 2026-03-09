"""Tests for the FastAPI REST API routes."""

import os
import tempfile

import pytest
from httpx import ASGITransport, AsyncClient

# Point to a temp DB before importing app
os.environ["FINALLY_DB_PATH"] = ""  # Will be set per-test

from app.main import app, price_cache  # noqa: E402
from app import db  # noqa: E402


@pytest.fixture
async def client(tmp_path):
    """AsyncClient with a fresh DB per test."""
    db_path = str(tmp_path / "test.db")
    db.DB_PATH = db_path
    db._initialized = False

    await db.init_db()

    price_cache.update("AAPL", 190.0)
    price_cache.update("GOOGL", 175.0)
    price_cache.update("MSFT", 420.0)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_get_portfolio_initial(client):
    resp = await client.get("/api/portfolio")
    assert resp.status_code == 200
    data = resp.json()
    assert data["cash_balance"] == 10000.0
    assert data["positions"] == []
    assert data["total_value"] == 10000.0


@pytest.mark.asyncio
async def test_get_watchlist(client):
    resp = await client.get("/api/watchlist")
    assert resp.status_code == 200
    data = resp.json()
    tickers = [w["ticker"] for w in data]
    assert "AAPL" in tickers
    assert "GOOGL" in tickers


@pytest.mark.asyncio
async def test_buy_trade(client):
    resp = await client.post("/api/portfolio/trade", json={
        "ticker": "AAPL", "quantity": 10, "side": "buy"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["trade"]["ticker"] == "AAPL"
    assert data["trade"]["side"] == "buy"
    assert data["trade"]["quantity"] == 10
    assert data["trade"]["price"] == 190.0
    assert data["cash_balance"] == 10000.0 - 190.0 * 10
    assert data["position"]["ticker"] == "AAPL"
    assert data["position"]["quantity"] == 10


@pytest.mark.asyncio
async def test_sell_trade(client):
    # Buy first
    await client.post("/api/portfolio/trade", json={
        "ticker": "AAPL", "quantity": 10, "side": "buy"
    })
    # Sell half
    resp = await client.post("/api/portfolio/trade", json={
        "ticker": "AAPL", "quantity": 5, "side": "sell"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["trade"]["side"] == "sell"
    assert data["position"]["quantity"] == 5


@pytest.mark.asyncio
async def test_sell_all_deletes_position(client):
    await client.post("/api/portfolio/trade", json={
        "ticker": "MSFT", "quantity": 1, "side": "buy"
    })
    resp = await client.post("/api/portfolio/trade", json={
        "ticker": "MSFT", "quantity": 1, "side": "sell"
    })
    assert resp.status_code == 200
    assert resp.json()["position"] is None


@pytest.mark.asyncio
async def test_buy_insufficient_cash(client):
    resp = await client.post("/api/portfolio/trade", json={
        "ticker": "AAPL", "quantity": 1000000, "side": "buy"
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_sell_insufficient_shares(client):
    resp = await client.post("/api/portfolio/trade", json={
        "ticker": "AAPL", "quantity": 1, "side": "sell"
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_trade_invalid_side(client):
    resp = await client.post("/api/portfolio/trade", json={
        "ticker": "AAPL", "quantity": 1, "side": "short"
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_trade_quantity_too_small(client):
    resp = await client.post("/api/portfolio/trade", json={
        "ticker": "AAPL", "quantity": 0.001, "side": "buy"
    })
    assert resp.status_code == 422  # Pydantic validation


@pytest.mark.asyncio
async def test_trade_no_price(client):
    resp = await client.post("/api/portfolio/trade", json={
        "ticker": "UNKNOWN", "quantity": 1, "side": "buy"
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_add_remove_watchlist(client):
    resp = await client.post("/api/watchlist", json={"ticker": "PYPL"})
    assert resp.status_code == 200
    assert resp.json()["ticker"] == "PYPL"

    resp = await client.delete("/api/watchlist/PYPL")
    assert resp.status_code == 200
    assert resp.json()["ticker"] == "PYPL"


@pytest.mark.asyncio
async def test_portfolio_history(client):
    # Execute a trade to generate a snapshot
    await client.post("/api/portfolio/trade", json={
        "ticker": "AAPL", "quantity": 1, "side": "buy"
    })
    resp = await client.get("/api/portfolio/history")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert "total_value" in data[0]
