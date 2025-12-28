# Candlestick Chart Implementation

## Overview
Implementation for fetching trading data from Pump.fun API and converting it to candlestick (OHLCV) chart data.

## API Endpoint

**Endpoint:** `GET /trades/all/{mint}`

**Base URL:** `https://frontend-api-v3.pump.fun`

**Example:**
```
https://frontend-api-v3.pump.fun/trades/all/CA?limit=4&offset=4&minimumSize=44
```

**Query Parameters:**
- `limit` (required, number) - Number of trades to fetch
- `offset` (required, number) - Offset for pagination
- `minimumSize` (required, number) - Minimum trade size to include

## Implementation

### Backend Service (`backend/services/pumpportal.js`)

#### `getTrades(mintAddress, params)`
Fetches trades from Pump.fun API.

**Parameters:**
- `mintAddress` (string) - Token mint address
- `params` (object) - Query parameters
  - `limit` (number, default: 100)
  - `offset` (number, default: 0)
  - `minimumSize` (number, default: 0)

**Returns:** Array of trade objects

#### `convertTradesToCandles(trades, timeframe)`
Converts trades array to OHLCV candlestick data.

**Parameters:**
- `trades` (array) - Array of trade objects
- `timeframe` (string) - Timeframe: `'1m'`, `'5m'`, `'15m'`, `'1h'`, `'4h'`, `'1d'` (default: `'1h'`)

**Returns:** Array of candlestick objects:
```javascript
{
  time: 1234567890000,    // Timestamp in milliseconds
  open: 0.00123456,       // Opening price
  high: 0.00156789,       // Highest price
  low: 0.00101234,        // Lowest price
  close: 0.00145678,      // Closing price
  volume: 10.5            // Total volume
}
```

#### `getCandlestickData(mintAddress, timeframe, limit)`
Fetches trades and converts to candlestick data in one call.

**Parameters:**
- `mintAddress` (string) - Token mint address
- `timeframe` (string, default: `'1h'`) - Timeframe for candles
- `limit` (number, default: 1000) - Number of trades to fetch

**Returns:** Array of candlestick objects

### Backend Routes (`backend/routes/tokens.js`)

#### `GET /api/tokens/:mint/chart`
Get candlestick chart data for a token.

**Query Parameters:**
- `timeframe` (optional, string) - `1m`, `5m`, `15m`, `1h`, `4h`, `1d` (default: `1h`)
- `limit` (optional, number) - Number of trades to fetch (default: 1000, max: 10000)

**Example:**
```
GET /api/tokens/9V7jznWgdN6tjMaJ6Bq11ZVQMkza6Zh45atgXbVmpump/chart?timeframe=1h&limit=500
```

**Response:**
```json
{
  "success": true,
  "chart": {
    "mint": "9V7jznWgdN6tjMaJ6Bq11ZVQMkza6Zh45atgXbVmpump",
    "timeframe": "1h",
    "candles": [
      {
        "time": 1234567890000,
        "open": 0.00123456,
        "high": 0.00156789,
        "low": 0.00101234,
        "close": 0.00145678,
        "volume": 10.5
      }
    ],
    "count": 50
  }
}
```

#### `GET /api/tokens/:mint/trades`
Get raw trades data for a token.

**Query Parameters:**
- `limit` (optional, number, default: 100)
- `offset` (optional, number, default: 0)
- `minimumSize` (optional, number, default: 0)

**Example:**
```
GET /api/tokens/9V7jznWgdN6tjMaJ6Bq11ZVQMkza6Zh45atgXbVmpump/trades?limit=100&offset=0&minimumSize=0
```

**Response:**
```json
{
  "success": true,
  "trades": [...],
  "count": 100
}
```

## Data Extraction

The implementation includes flexible data extraction methods that handle various trade object structures:

### `extractTimestamp(trade)`
Extracts timestamp from trade object. Checks fields:
- `timestamp`
- `time`
- `created_at`
- `createdAt`
- `date`
- `block_time`

### `extractPrice(trade)`
Extracts price from trade object. Checks fields:
- `price`
- `price_per_token`
- `pricePerToken`
- `sol_amount`
- `solAmount`
- `amount_sol`
- `amountSol`
- `usd_price`
- `usdPrice`

### `extractVolume(trade)`
Extracts volume from trade object. Checks fields:
- `volume`
- `sol_amount`
- `solAmount`
- `amount_sol`
- `amountSol`
- `size`
- `trade_size`
- `tradeSize`

## Error Handling

- Returns empty array if endpoint returns 404 (token doesn't exist or has no trades)
- Handles various response formats (array, object with `trades` property, object with `data` property)
- Validates and parses numeric values
- Skips trades with invalid data

## Usage Example

```javascript
// Fetch candlestick data
const response = await fetch('/api/tokens/CA/chart?timeframe=1h&limit=500');
const data = await response.json();

// Use with charting library
const candles = data.chart.candles;
// candles is ready to use with TradingView, Chart.js, Recharts, etc.
```

## Next Steps

1. Test with real token mint addresses
2. Create frontend chart component
3. Add caching for frequently accessed charts
4. Add websocket support for real-time updates (if available)

