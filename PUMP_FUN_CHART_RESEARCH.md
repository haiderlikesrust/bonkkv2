# Pump.fun Trading Chart Data Research

## Overview
Research on how to fetch trading chart data from Pump.fun for displaying price history and trading activity.

## Pump.fun Official API

**Base URL:** `https://frontend-api-v3.pump.fun`

**Currently Used Endpoint:**
- `GET /coins/{mint}` - Get coin information
  - Returns: `market_cap`, `usd_market_cap`, `last_trade_timestamp`, etc.

**Potential Chart Endpoints (Need Testing):**
- `/coins/{mint}/trades` - Trading history
- `/coins/{mint}/chart` - Chart/candle data
- `/coins/{mint}/history` - Price history
- `/coins/{mint}/candles` - Candlestick data
- `/trades?mint={mint}` - Trades endpoint

## Research Findings

### Option 1: Pump.fun Official API (Recommended First Step)

**Approach:**
1. Inspect Pump.fun website network requests when viewing a token chart
2. Test potential endpoints directly
3. Reverse engineer the API structure

**How to Test:**
```bash
# Test potential endpoints
curl https://frontend-api-v3.pump.fun/coins/{mint}/trades
curl https://frontend-api-v3.pump.fun/coins/{mint}/chart
curl https://frontend-api-v3.pump.fun/coins/{mint}/history
```

### Option 2: Third-Party APIs

#### Moralis API
- **Features:** TradingView-style candlestick charts, OHLCV data
- **Documentation:** https://docs.moralis.com/web3-data-api/solana/tutorials/embed-tradingview-chart
- **Pros:** Ready-made charts, well-documented
- **Cons:** Requires API key (may have costs), external dependency
- **Link:** https://docs.moralis.com/web3-data-api/solana/tutorials/get-pump-fun-token-prices

#### Yodao Pump.fun API
- **Features:** Real-time trading data, token metrics, trades
- **Documentation:** https://dev.yodao.io/
- **Pros:** Real-time data, structured format
- **Cons:** May require subscription

#### PumpSwapApi
- **Features:** REST interface for Pump.fun operations
- **Documentation:** https://pumpswapapi.fun/
- **Pros:** Comprehensive API
- **Cons:** May not have chart-specific endpoints

### Option 3: Build from On-Chain Data

**Approach:**
- Query Solana blockchain for token transactions
- Parse buy/sell transactions
- Build chart data from transaction history
- Use Solana programs: `pump`, `raydium`, etc.

**Pros:**
- No external API dependencies
- Complete data control
- Can customize exactly what you need

**Cons:**
- More complex implementation
- Requires parsing blockchain transactions
- Higher computational cost
- May need indexing service (like Helius)

## Recommended Implementation Steps

### Step 1: Investigate Pump.fun API Directly

1. **Inspect Pump.fun Website:**
   - Open browser DevTools → Network tab
   - Navigate to a token's chart page on Pump.fun
   - Look for API calls that fetch chart data
   - Document the endpoint structure and parameters

2. **Test Potential Endpoints:**
   - Use the test script (see below)
   - Check response formats
   - Document working endpoints

### Step 2: Implement Chart Endpoint

Once we find the correct endpoint, add to `pumpportal.js`:

```javascript
async getCoinChartData(mintAddress, timeframe = '1h', limit = 100) {
  try {
    const response = await axios.get(
      `${PUMP_FUN_API_BASE}/coins/${mintAddress}/chart`,
      {
        params: { timeframe, limit },
        timeout: 10000,
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching chart data:', error);
    throw error;
  }
}
```

### Step 3: Add Backend Route

```javascript
router.get('/:mint/chart', async (req, res) => {
  try {
    const { mint } = req.params;
    const { timeframe = '1h', limit = 100 } = req.query;
    
    const chartData = await pumpPortalService.getCoinChartData(
      mint, 
      timeframe, 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      chart: chartData,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Step 4: Frontend Integration

Use a charting library:
- **TradingView Lightweight Charts** (recommended)
- **Chart.js** (simpler, good for basic charts)
- **Recharts** (React-specific, already in use)
- **ApexCharts** (feature-rich)

## Next Steps

1. ✅ Test Pump.fun API endpoints (see test script)
2. ⏳ Inspect Pump.fun website network requests
3. ⏳ Document actual API structure
4. ⏳ Implement chart data fetching
5. ⏳ Add chart component to frontend

## References

- Pump.fun API: https://frontend-api-v3.pump.fun
- Moralis Chart Docs: https://docs.moralis.com/web3-data-api/solana/tutorials/embed-tradingview-chart
- Yodao API: https://dev.yodao.io/
- PumpSwapApi: https://pumpswapapi.fun/
