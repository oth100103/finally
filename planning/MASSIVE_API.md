# Massive (Polygon.io) REST API Reference

## Overview

Massive (formerly Polygon.io, rebranded October 2025) provides real-time and historical US stock market data via REST APIs. Both `api.polygon.io` and `api.massive.com` domains are active. Existing API keys work on both.

## Authentication

Two methods:

```bash
# Query parameter
curl "https://api.polygon.io/v2/...?apiKey=YOUR_KEY"

# Authorization header
curl -H "Authorization: Bearer YOUR_KEY" "https://api.polygon.io/v2/..."
```

## Rate Limits

| Tier | Limit | Recommended Poll Interval |
|------|-------|---------------------------|
| Free | 5 requests/minute | 15 seconds |
| Developer+ | Unlimited (stay under 100 req/sec) | 2–5 seconds |

## Key Endpoints

### 1. Grouped Ticker Snapshot (Primary — used by FinAlly)

**`GET /v2/snapshot/locale/us/markets/stocks/tickers`**

Returns latest price data for multiple tickers in a single call. This is the endpoint FinAlly uses because it fetches all watched tickers in one API call — critical for the free tier's 5 req/min limit.

**Parameters:**
| Param | Required | Description |
|-------|----------|-------------|
| `tickers` | No | Comma-separated ticker list (e.g., `AAPL,GOOGL,MSFT`). Omit for all US stocks. |
| `include_otc` | No | Include OTC securities (default: false) |

**Example:**

```bash
curl "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=AAPL,GOOGL,MSFT&apiKey=YOUR_KEY"
```

**Response:**

```json
{
  "count": 3,
  "status": "OK",
  "tickers": [
    {
      "ticker": "AAPL",
      "todaysChange": 1.23,
      "todaysChangePerc": 0.65,
      "updated": 1617901342000000000,
      "day": {
        "o": 190.0, "h": 192.5, "l": 189.3, "c": 191.2,
        "v": 54000000, "vw": 190.8
      },
      "min": {
        "o": 191.0, "h": 191.5, "l": 190.8, "c": 191.2,
        "v": 120000, "vw": 191.1, "av": 54000000,
        "t": 1617901320000000000, "n": 350
      },
      "prevDay": {
        "o": 188.5, "h": 190.2, "l": 188.0, "c": 189.97,
        "v": 48000000, "vw": 189.5
      },
      "lastQuote": {
        "p": 191.15, "P": 191.20, "s": 100, "S": 200,
        "t": 1617901342000000000
      },
      "lastTrade": {
        "p": 191.18, "s": 25, "x": 11,
        "t": 1617901342000000000,
        "c": [14, 41], "i": "trade_id"
      },
      "fmv": 191.18
    }
  ]
}
```

**Key fields for FinAlly:**
- `lastTrade.p` — most recent trade price (used as current price)
- `lastTrade.t` — timestamp in nanoseconds (divide by 1e9 for Unix seconds)
- `prevDay.c` — previous day close (for daily change calculation)
- `todaysChange` / `todaysChangePerc` — pre-calculated daily change

**Nested object reference:**

| Object | Fields | Description |
|--------|--------|-------------|
| `day` | `o, h, l, c, v, vw` | Today's OHLCV bar |
| `prevDay` | `o, h, l, c, v, vw` | Previous day's OHLCV bar |
| `min` | `o, h, l, c, v, vw, av, t, n` | Most recent 1-minute bar |
| `lastQuote` | `p` (bid), `P` (ask), `s` (bid size), `S` (ask size), `t` | Latest NBBO quote |
| `lastTrade` | `p` (price), `s` (size), `x` (exchange), `t`, `c` (conditions) | Latest trade |
| `fmv` | float | Fair market value (Business plans only) |

### 2. Single Ticker Snapshot

**`GET /v2/snapshot/locale/us/markets/stocks/tickers/{ticker}`**

Same as grouped but for a single ticker. Returns a `ticker` object (not array).

```bash
curl "https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/AAPL?apiKey=YOUR_KEY"
```

### 3. Previous Close (End of Day)

**`GET /v2/aggs/ticker/{ticker}/prev`**

Returns the previous trading day's OHLCV bar.

```bash
curl "https://api.polygon.io/v2/aggs/ticker/AAPL/prev?adjusted=true&apiKey=YOUR_KEY"
```

**Response:**

```json
{
  "ticker": "AAPL",
  "adjusted": true,
  "status": "OK",
  "resultsCount": 1,
  "results": [
    {
      "T": "AAPL",
      "o": 115.55, "h": 116.75, "l": 115.17, "c": 115.97,
      "v": 131704427, "vw": 115.95,
      "t": 1617249600000, "n": 1234567
    }
  ]
}
```

Fields: `T` ticker, `o`pen, `h`igh, `l`ow, `c`lose, `v`olume, `vw` VWAP, `t` timestamp (Unix ms), `n` transaction count.

### 4. Last Trade

**`GET /v2/last/trade/{ticker}`**

Returns the most recent trade for a single ticker.

```bash
curl "https://api.polygon.io/v2/last/trade/AAPL?apiKey=YOUR_KEY"
```

**Response:**

```json
{
  "status": "OK",
  "results": {
    "T": "AAPL",
    "p": 129.8473,
    "s": 25,
    "x": 11,
    "t": 1617901342969834000,
    "c": [14, 41],
    "z": 3
  }
}
```

Fields: `p` price, `s` size, `x` exchange ID, `t` SIP timestamp (nanoseconds), `c` condition codes, `z` tape.

## Python SDK

The official Python client is `massive` (formerly `polygon-api-client`):

```bash
pip install massive
```

```python
from massive import RESTClient
from massive.rest.models import SnapshotMarketType

client = RESTClient(api_key="YOUR_KEY")

# Grouped snapshot — all tickers or filtered list
snapshots = client.get_snapshot_all(
    market_type=SnapshotMarketType.STOCKS,
    tickers=["AAPL", "GOOGL", "MSFT"],
)

for snap in snapshots:
    print(f"{snap.ticker}: ${snap.last_trade.price}")
    print(f"  Previous close: ${snap.prev_day.close}")
    print(f"  Today's change: {snap.todays_change_perc:.2f}%")
```

```python
# Previous close
aggs = client.get_previous_close_agg("AAPL")
for agg in aggs:
    print(f"AAPL prev close: ${agg.close}")
```

```python
# Last trade
trade = client.get_last_trade("AAPL")
print(f"AAPL last trade: ${trade.price} ({trade.size} shares)")
```

## Error Handling

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | — |
| 401 | Invalid API key | Check MASSIVE_API_KEY |
| 403 | Insufficient permissions / plan | Upgrade plan or use different endpoint |
| 429 | Rate limit exceeded | Back off, increase poll interval |
| 5xx | Server error | Retry with exponential backoff |

## Why Grouped Snapshot for FinAlly

The grouped snapshot endpoint is the only endpoint that makes sense for our use case:

1. **One call = all tickers** — With 10 tickers on the free tier (5 req/min), we can't afford one call per ticker
2. **Contains everything we need** — `lastTrade.p` for current price, `prevDay.c` for daily change
3. **Filterable** — Pass specific tickers to avoid downloading all 10,000+ US stocks
4. **SDK support** — `client.get_snapshot_all()` handles pagination and parsing
