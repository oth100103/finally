# Market Data — Unified Python Interface

## Design

The market data subsystem uses the **Strategy Pattern**: one abstract interface, two interchangeable implementations, selected at runtime by environment variable.

```
                    ┌─────────────────────┐
                    │  MarketDataSource   │  (ABC)
                    │  interface.py       │
                    └────────┬────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
   ┌──────────────────┐         ┌──────────────────┐
   │ SimulatorDataSource│        │ MassiveDataSource │
   │ simulator.py      │        │ massive_client.py │
   └────────┬─────────┘         └────────┬─────────┘
            │                            │
            └────────────┬───────────────┘
                         │ writes to
                ┌────────▼────────┐
                │   PriceCache    │  (thread-safe)
                │   cache.py      │
                └────────┬────────┘
                         │ read by
          ┌──────────────┼──────────────┐
          │              │              │
    SSE Streaming   Portfolio     Trade Execution
```

## Module Layout

All files live in `backend/app/market/`:

| File | Purpose |
|------|---------|
| `models.py` | `PriceUpdate` — immutable price snapshot dataclass |
| `interface.py` | `MarketDataSource` — abstract base class |
| `cache.py` | `PriceCache` — thread-safe in-memory store with version counter |
| `simulator.py` | `GBMSimulator` + `SimulatorDataSource` |
| `massive_client.py` | `MassiveDataSource` — Polygon REST API poller |
| `seed_prices.py` | Default tickers, seed prices, GBM parameters, correlation groups |
| `factory.py` | `create_market_data_source()` — environment-based selection |
| `stream.py` | `create_stream_router()` — FastAPI SSE endpoint |
| `__init__.py` | Public exports |

## Abstract Interface

```python
class MarketDataSource(ABC):
    async def start(self, tickers: list[str]) -> None: ...
    async def stop(self) -> None: ...
    async def add_ticker(self, ticker: str) -> None: ...
    async def remove_ticker(self, ticker: str) -> None: ...
    def get_tickers(self) -> list[str]: ...
```

**Contract:**
- `start()` begins a background task that periodically writes prices to the shared `PriceCache`
- `stop()` cancels the background task; safe to call multiple times
- `add_ticker()` / `remove_ticker()` dynamically modify the tracked set
- Downstream code **never** calls the data source for prices — it reads from `PriceCache`

## PriceUpdate Model

```python
@dataclass(frozen=True, slots=True)
class PriceUpdate:
    ticker: str
    price: float
    previous_price: float
    timestamp: float  # Unix seconds

    # Computed properties
    change -> float           # price - previous_price
    change_percent -> float   # percentage change
    direction -> str          # "up", "down", or "flat"
    to_dict() -> dict         # JSON-serializable dict
```

## PriceCache

```python
class PriceCache:
    def update(self, ticker: str, price: float, timestamp: float | None = None) -> PriceUpdate
    def get(self, ticker: str) -> PriceUpdate | None
    def get_price(self, ticker: str) -> float | None
    def get_all(self) -> dict[str, PriceUpdate]
    def remove(self, ticker: str) -> None
    @property
    def version(self) -> int  # Monotonic counter for SSE change detection
```

Thread-safe via `threading.Lock`. The `version` property increments on every `update()` call, enabling efficient SSE polling — the stream endpoint only sends data when the version has changed.

## Factory

```python
def create_market_data_source(price_cache: PriceCache) -> MarketDataSource:
    api_key = os.environ.get("MASSIVE_API_KEY", "").strip()
    if api_key:
        return MassiveDataSource(api_key=api_key, price_cache=price_cache)
    else:
        return SimulatorDataSource(price_cache=price_cache)
```

## Integration Example

```python
from app.market import PriceCache, create_market_data_source, create_stream_router

# App startup
cache = PriceCache()
source = create_market_data_source(cache)
await source.start(["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA",
                     "NVDA", "META", "JPM", "V", "NFLX"])

# Dynamic watchlist management
await source.add_ticker("PYPL")
await source.remove_ticker("NFLX")

# Reading prices (for portfolio, trades, etc.)
update = cache.get("AAPL")       # PriceUpdate or None
price = cache.get_price("AAPL")  # float or None
all_prices = cache.get_all()     # dict[str, PriceUpdate]

# SSE endpoint
router = create_stream_router(cache)  # FastAPI APIRouter → GET /api/stream/prices

# App shutdown
await source.stop()
```

## Why This Design

| Decision | Rationale |
|----------|-----------|
| Strategy pattern with ABC | Swap implementations without changing any downstream code |
| PriceCache as single source of truth | Decouples producers (sim/API) from consumers (SSE/portfolio/trades) |
| Version counter on cache | SSE only pushes when data changed — no wasted bandwidth |
| `asyncio.Task` background loop | Non-blocking; fits naturally into FastAPI's async lifecycle |
| Thread-safe cache with Lock | Safe for concurrent reads from multiple SSE connections |
| Factory from env var | Zero config for simulator; drop in an API key for real data |
