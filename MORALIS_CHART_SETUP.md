# Moralis API Setup for Chart Data

## Overview
Using Moralis API as a third-party service to fetch candlestick chart data for Pump.fun tokens.

## Setup

### 1. Get Moralis API Key

1. Sign up at [Moralis](https://moralis.io/)
2. Go to your dashboard
3. Copy your API key

### 2. Add to Environment Variables

Add to your `.env` file:

```env
MORALIS_API_KEY=your_moralis_api_key_here
```

### 3. API Endpoints

The implementation tries multiple Moralis endpoint formats:
- `https://solana-gateway.moralis.io/token/{mint}/price/history`
- `https://deep-index.moralis.io/api/v2.2/token/{mint}/price/history`

## Usage

### Backend Endpoint

```
GET /api/tokens/:mint/chart?timeframe=1h&limit=100
```

**Query Parameters:**
- `timeframe` - `1m`, `5m`, `15m`, `1h`, `4h`, `1d` (default: `1h`)
- `limit` - Number of candles (default: 100)

**Response:**
```json
{
  "success": true,
  "chart": {
    "mint": "...",
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

## Fallback Strategy

The implementation uses a fallback strategy:

1. **First**: Try Moralis API (if API key is configured)
2. **Second**: Try Pump.fun trades endpoint (if available)
3. **Last**: Return empty array

## Moralis API Documentation

- Main Docs: https://docs.moralis.com/web3-data-api/solana
- Pump.fun Tutorial: https://docs.moralis.com/web3-data-api/solana/tutorials/get-pump-fun-token-prices
- Chart Widget: https://docs.moralis.com/web3-data-api/solana/tutorials/embed-tradingview-chart

## Alternative: TradingView Widget

Moralis also provides a ready-made TradingView widget that can be embedded directly:

```html
<iframe src="https://widgets.moralis.io/token/{mint}/chart?theme=dark&timeframe=1h"></iframe>
```

This can be used as an alternative to building custom charts.

## Cost Considerations

- Moralis has a free tier with rate limits
- Check pricing at: https://moralis.io/pricing
- Consider caching chart data to reduce API calls

