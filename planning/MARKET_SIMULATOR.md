# Market Simulator Design

## Overview

The simulator generates realistic stock price movements using **Geometric Brownian Motion (GBM)** with correlated returns via **Cholesky decomposition**. It runs as an in-process background task with no external dependencies — the default mode when no Massive API key is configured.

## Architecture

```
SimulatorDataSource (MarketDataSource implementation)
    │
    │  owns
    ▼
GBMSimulator
    │  step() every 500ms
    │  → correlated price moves for all tickers
    │  → occasional random shock events
    │
    │  writes to
    ▼
PriceCache
```

Two classes with distinct responsibilities:

- **`GBMSimulator`** — Pure math engine. Holds prices, generates correlated moves, applies shocks. No async, no I/O, fully testable in isolation.
- **`SimulatorDataSource`** — Async wrapper implementing `MarketDataSource`. Runs the `asyncio.Task` loop that calls `step()` and writes results to `PriceCache`.

## GBM Math

Each tick advances every price by:

```
S(t+dt) = S(t) × exp((μ - σ²/2) × dt + σ × √dt × Z)
```

| Symbol | Meaning | Source |
|--------|---------|--------|
| `S(t)` | Current price | Internal state |
| `μ` | Annualized drift (expected return) | `seed_prices.py` per ticker |
| `σ` | Annualized volatility | `seed_prices.py` per ticker |
| `dt` | Time step as fraction of trading year | `0.5 / (252 × 6.5 × 3600)` ≈ 8.48×10⁻⁸ |
| `Z` | Correlated standard normal draw | Cholesky decomposition |

The tiny `dt` (~85 nanoseconds of trading time per 500ms real tick) produces sub-cent moves per tick that accumulate naturally into realistic daily ranges.

## Correlated Returns (Cholesky Decomposition)

Independent random draws would make tech stocks move randomly relative to each other. In reality, AAPL and MSFT tend to move together. The simulator uses Cholesky decomposition of a correlation matrix to produce correlated draws:

1. Generate `n` independent standard normal draws: `Z_independent`
2. Multiply by the lower-triangular Cholesky factor: `Z_correlated = L × Z_independent`
3. Use `Z_correlated[i]` for ticker `i` in the GBM formula

### Correlation Structure

| Pair Type | Correlation | Example |
|-----------|-------------|---------|
| Intra-tech | 0.6 | AAPL ↔ MSFT |
| Intra-finance | 0.5 | JPM ↔ V |
| Cross-sector | 0.3 | AAPL ↔ JPM |
| TSLA with anything | 0.3 | TSLA ↔ * (it does its own thing) |
| Unknown tickers | 0.3 | Dynamically added tickers |

**Groups** (from `seed_prices.py`):
- **Tech:** AAPL, GOOGL, MSFT, AMZN, META, NVDA, NFLX
- **Finance:** JPM, V
- **Independent:** TSLA (classified as tech but forced to 0.3 correlation)

The Cholesky matrix is rebuilt whenever tickers are added or removed. This is O(n²) but n < 50, so it's instantaneous.

## Random Shock Events

For drama, each tick has a ~0.1% chance per ticker of triggering a sudden 2–5% price shock:

```python
if random.random() < 0.001:  # ~0.1% per tick per ticker
    shock = random.uniform(0.02, 0.05) * random.choice([-1, 1])
    price *= (1 + shock)
```

With 10 tickers at 2 ticks/second, expect roughly one shock event every 50 seconds. This creates the sudden jumps that make a trading terminal feel alive.

## Seed Prices and Parameters

All defaults live in `seed_prices.py`:

| Ticker | Seed Price | Volatility (σ) | Drift (μ) | Notes |
|--------|-----------|-----------------|-----------|-------|
| AAPL | $190 | 0.22 | 0.05 | |
| GOOGL | $175 | 0.25 | 0.05 | |
| MSFT | $420 | 0.20 | 0.05 | |
| AMZN | $185 | 0.28 | 0.05 | |
| TSLA | $250 | 0.50 | 0.03 | High vol, low drift |
| NVDA | $800 | 0.40 | 0.08 | High vol, strong drift |
| META | $500 | 0.30 | 0.05 | |
| JPM | $195 | 0.18 | 0.04 | Low vol (bank) |
| V | $280 | 0.17 | 0.04 | Low vol (payments) |
| NFLX | $600 | 0.35 | 0.05 | |

**Dynamically added tickers** (not in the table) get `σ=0.25, μ=0.05` and a random seed price between $50–$300.

## SimulatorDataSource Lifecycle

```python
class SimulatorDataSource(MarketDataSource):
    def __init__(self, price_cache, update_interval=0.5, event_probability=0.001):
        ...

    async def start(self, tickers):
        # 1. Create GBMSimulator with initial tickers
        # 2. Seed the cache with initial prices (so SSE has data immediately)
        # 3. Launch asyncio.Task running _run_loop()

    async def stop(self):
        # Cancel the task, await cancellation

    async def add_ticker(self, ticker):
        # Add to simulator (rebuilds Cholesky)
        # Seed cache immediately with the new ticker's price

    async def remove_ticker(self, ticker):
        # Remove from simulator (rebuilds Cholesky)
        # Remove from cache

    async def _run_loop(self):
        # while True:
        #     prices = simulator.step()
        #     for ticker, price in prices.items():
        #         cache.update(ticker, price)
        #     await asyncio.sleep(0.5)
```

Key details:
- `start()` seeds the cache before launching the loop so the SSE stream has data from the first connection
- `_run_loop()` catches exceptions to prevent the task from dying — a single bad step doesn't kill the simulator
- `add_ticker()` immediately seeds the cache so the new ticker shows a price without waiting for the next loop iteration

## Testing

Tests live in `backend/tests/market/`:

- **`test_simulator.py`** (17 tests) — GBM math, Cholesky correlations, shock events, add/remove tickers, edge cases
- **`test_simulator_source.py`** (10 tests) — Integration tests for `SimulatorDataSource` lifecycle, cache updates, async behavior

Key test patterns:
- Verify prices stay positive after many steps
- Verify correlated tickers have higher return correlation than cross-sector pairs (statistical test over many steps)
- Verify shock events produce moves in the 2–5% range
- Verify add/remove ticker rebuilds Cholesky correctly
- Verify cache is seeded immediately on `start()` and `add_ticker()`
