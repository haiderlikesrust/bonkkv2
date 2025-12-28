import axios from 'axios';
import FormData from 'form-data';
import { config } from '../config/config.js';

/**
 * Pump.fun API endpoints
 */
const PUMP_FUN_API_BASE = 'https://frontend-api-v3.pump.fun';

/**
 * PumpPortal API Service
 * Documentation: https://pumpportal.fun/
 * Using LOCAL Transaction API (not Lightning)
 */
class PumpPortalService {
  constructor() {
    this.baseURL = config.pumpPortal.baseUrl;
    this.apiKey = config.pumpPortal.apiKey;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
      timeout: 30000,
    });
  }

  /**
   * Get trade transaction (Local API)
   * Returns serialized transaction for signing
   * Docs: https://pumpportal.fun/local-trading-api/trading-api
   */
  async getTradeTransaction(params) {
    try {
      const response = await this.client.post('/api/trade-local', {
        publicKey: params.publicKey,
        action: params.action, // "buy" or "sell"
        mint: params.mint,
        amount: params.amount,
        denominatedInSol: params.denominatedInSol, // "true" or "false"
        slippage: params.slippage,
        priorityFee: params.priorityFee,
        pool: params.pool || 'auto', // 'pump', 'raydium', 'pump-amm', 'launchlab', 'raydium-cpmm', 'bonk', 'auto'
      }, {
        responseType: 'arraybuffer', // Important: Get binary data for transaction
      });

      return response.data; // Returns serialized transaction as ArrayBuffer
    } catch (error) {
      console.error('Error getting trade transaction:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get buy transaction (Local API)
   */
  async getBuyTransaction(params) {
    return this.getTradeTransaction({
      ...params,
      action: 'buy',
    });
  }

  /**
   * Get sell transaction (Local API)
   */
  async getSellTransaction(params) {
    return this.getTradeTransaction({
      ...params,
      action: 'sell',
    });
  }

  /**
   * Upload image to Pump.fun IPFS
   * Required before token creation
   */
  async uploadImageToIPFS(imageBuffer, fileName, metadata) {
    try {
      const formData = new FormData();

      // Add image file
      formData.append('file', imageBuffer, {
        filename: fileName || 'token.png',
        contentType: 'image/png',
      });

      // Add metadata fields
      if (metadata.name) formData.append('name', metadata.name);
      if (metadata.symbol) formData.append('symbol', metadata.symbol);
      if (metadata.description) formData.append('description', metadata.description);
      if (metadata.twitter) formData.append('twitter', metadata.twitter);
      if (metadata.telegram) formData.append('telegram', metadata.telegram);
      if (metadata.website) formData.append('website', metadata.website);
      if (metadata.showName !== undefined) formData.append('showName', metadata.showName ? 'true' : 'false');

      console.log('Uploading to Pump.fun IPFS...');
      const response = await axios.post('https://pump.fun/api/ipfs', formData, {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log('IPFS upload successful:', response.data);
      return response.data; // { metadataUri, metadata: {...} }
    } catch (error) {
      console.error('Error uploading to IPFS:', error.message);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      throw error;
    }
  }

  /**
   * Get token creation transaction (Local API)
   * Docs: https://pumpportal.fun/creation
   * 
   * Note: You must upload image to IPFS first using uploadImageToIPFS()
   */
  async getCreateTokenTransaction(params) {
    try {
      const response = await this.client.post('/api/trade-local', {
        action: 'create',
        publicKey: params.publicKey,
        tokenMetadata: {
          name: params.tokenMetadata.name,
          symbol: params.tokenMetadata.symbol,
          uri: params.tokenMetadata.uri, // From IPFS upload
        },
        mint: params.mint, // Mint public key (address) - pumpportal uses this to create the token
        denominatedInSol: params.denominatedInSol || 'true',
        amount: params.amount, // Dev buy amount
        slippage: params.slippage || 10,
        priorityFee: params.priorityFee || 0.0005,
        pool: params.pool || 'pump',
        isMayhemMode: params.isMayhemMode || 'false',
        ...(params.quoteMint && { quoteMint: params.quoteMint }), // For Bonk tokens
      }, {
        responseType: 'arraybuffer', // Get binary transaction data
      });

      return response.data; // Returns serialized transaction as ArrayBuffer
    } catch (error) {
      console.error('Error getting create token transaction:', error.message);
      
      // Try to decode error response if it's a buffer
      let errorMessage = error.message;
      if (error.response?.data) {
        try {
          if (error.response.data instanceof ArrayBuffer) {
            const decoder = new TextDecoder();
            errorMessage = decoder.decode(error.response.data);
          } else if (Buffer.isBuffer(error.response.data)) {
            errorMessage = error.response.data.toString();
          } else if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          } else {
            errorMessage = JSON.stringify(error.response.data);
          }
          console.error('Pumpportal error response:', errorMessage);
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
        }
      }
      
      // Create a more descriptive error
      const enhancedError = new Error(`Pumpportal API error: ${errorMessage}`);
      enhancedError.response = error.response;
      enhancedError.status = error.response?.status;
      throw enhancedError;
    }
  }

  /**
   * Fetch coin info from Pump.fun API
   * @param {string} mintAddress - The coin's mint address
   * @returns {object} Coin information from Pump.fun
   */
  async getCoinInfo(mintAddress) {
    try {
      // Use proxy API for better reliability and image URI access
      const proxyUrl = `https://pump-proxy-server.zoclouds.net/api/pump/coins/${mintAddress}`;
      const response = await axios.get(proxyUrl, {
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching coin info from Pump.fun:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Fetch trades for a token from Pump.fun API
   * @param {string} mintAddress - The coin's mint address
   * @param {object} params - Query parameters
   * @param {number} params.limit - Number of trades to fetch
   * @param {number} params.offset - Offset for pagination
   * @param {number} params.minimumSize - Minimum trade size to include
   * @returns {array} Array of trade objects
   */
  async getTrades(mintAddress, params = {}) {
    try {
      const { limit = 100, offset = 0, minimumSize = 0 } = params;
      
      const response = await axios.get(`${PUMP_FUN_API_BASE}/trades/all/${mintAddress}`, {
        params: {
          limit,
          offset,
          minimumSize,
        },
        timeout: 15000,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });
      
      if (response.status === 200) {
        // Handle both array and object responses
        if (Array.isArray(response.data)) {
          return response.data;
        } else if (response.data && Array.isArray(response.data.trades)) {
          return response.data.trades;
        } else if (response.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
        return [];
      } else {
        throw new Error(`API returned status ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching trades from Pump.fun:', error.response?.data || error.message);
      // Return empty array instead of throwing to allow chart to still work
      if (error.response?.status === 404) {
        console.warn(`No trades endpoint found for ${mintAddress}, returning empty array`);
        return [];
      }
      throw error;
    }
  }

  /**
   * Fetch OHLCV (candlestick) data from third-party APIs
   * Tries multiple providers in order: Moralis, etc.
   * @param {string} mintAddress - The coin's mint address
   * @param {string} timeframe - Timeframe: '1m', '5m', '15m', '1h', '4h', '1d'
   * @param {number} limit - Number of candles to fetch
   * @returns {array} Array of candlestick objects
   */
  async getCandlestickDataFromThirdParty(mintAddress, timeframe = '1h', limit = 100) {
    // Try Moralis API first
    try {
      return await this.getCandlestickDataFromMoralis(mintAddress, timeframe, limit);
    } catch (moralisError) {
      console.warn('Moralis API failed:', moralisError.message);
    }

    // Add more third-party APIs here as needed
    throw new Error('All third-party APIs failed');
  }

  /**
   * Fetch OHLCV (candlestick) data from Moralis API
   * Documentation: https://docs.moralis.com/web3-data-api/solana
   * @param {string} mintAddress - The coin's mint address
   * @param {string} timeframe - Timeframe: '1m', '5m', '15m', '1h', '4h', '1d'
   * @param {number} limit - Number of candles to fetch
   * @returns {array} Array of candlestick objects
   */
  async getCandlestickDataFromMoralis(mintAddress, timeframe = '1h', limit = 100) {
    try {
      const moralisApiKey = config.moralis?.apiKey || process.env.MORALIS_API_KEY;
      
      if (!moralisApiKey) {
        throw new Error('Moralis API key not configured. Set MORALIS_API_KEY in .env');
      }

      // Moralis Solana API endpoints (try multiple formats)
      // Documentation: https://docs.moralis.com/web3-data-api/solana
      const endpoints = [
        `https://deep-index.moralis.io/api/v2.2/pairs/${mintAddress}/ohlcv`,
        `https://solana-gateway.moralis.io/token/${mintAddress}/price/history`,
      ];

      // Map timeframe to Moralis format
      const moralisTimeframe = {
        '1m': '1m',
        '5m': '5m',
        '15m': '15m',
        '1h': '1h',
        '4h': '4h',
        '1d': '1d',
      }[timeframe] || '1h';

      // Calculate date range (last 30 days by default)
      const toDate = new Date();
      const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const fromDateStr = fromDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const toDateStr = toDate.toISOString().split('T')[0];

      // Try endpoints in order
      for (const endpoint of endpoints) {
        try {
          let params = {};
          let response;

          if (endpoint.includes('/ohlcv')) {
            // OHLCV endpoint format
            params = {
              chain: 'solana',
              timeframe: moralisTimeframe,
              fromDate: fromDateStr,
              toDate: toDateStr,
            };
          } else {
            // Price history endpoint format
            params = {
              chain: 'mainnet',
              exchange: 'pump.fun',
              from_date: fromDate.toISOString(),
              to_date: toDate.toISOString(),
              timeframe: moralisTimeframe,
              limit,
            };
          }

          response = await axios.get(endpoint, {
            params,
            headers: {
              'X-API-Key': moralisApiKey,
              'Accept': 'application/json',
            },
            timeout: 15000,
            validateStatus: (status) => status < 500, // Don't throw on 4xx
          });

          if (response.status === 200 && response.data) {
            // Handle different response formats
            let candles = [];
            
            if (Array.isArray(response.data)) {
              candles = response.data;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              candles = response.data.data;
            } else if (response.data.result && Array.isArray(response.data.result)) {
              candles = response.data.result;
            } else if (response.data.prices && Array.isArray(response.data.prices)) {
              candles = response.data.prices;
            } else if (response.data.ohlcv && Array.isArray(response.data.ohlcv)) {
              candles = response.data.ohlcv;
            }

            if (candles.length > 0) {
              return candles.map(candle => ({
                time: candle.timestamp ? new Date(candle.timestamp).getTime() : 
                      (candle.time ? (typeof candle.time === 'string' ? new Date(candle.time).getTime() : candle.time) : Date.now()),
                open: parseFloat(candle.open || candle.o || 0),
                high: parseFloat(candle.high || candle.h || 0),
                low: parseFloat(candle.low || candle.l || 0),
                close: parseFloat(candle.close || candle.c || 0),
                volume: parseFloat(candle.volume || candle.v || 0),
              })).sort((a, b) => a.time - b.time);
            }
          }
        } catch (endpointError) {
          // Try next endpoint
          console.warn(`Moralis endpoint ${endpoint} failed:`, endpointError.message);
          continue;
        }
      }

      throw new Error('All Moralis endpoints failed');

    } catch (error) {
      console.error('Error fetching candlestick data from Moralis:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Convert trades data to candlestick (OHLCV) data
   * @param {array} trades - Array of trade objects from Pump.fun API
   * @param {string} timeframe - Timeframe for candles: '1m', '5m', '15m', '1h', '4h', '1d'
   * @returns {array} Array of candlestick objects with {time, open, high, low, close, volume}
   */
  convertTradesToCandles(trades, timeframe = '1h') {
    if (!trades || !Array.isArray(trades) || trades.length === 0) {
      return [];
    }

    // Parse timeframe to milliseconds
    const timeframeMs = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    }[timeframe] || 60 * 60 * 1000; // Default to 1h

    // Sort trades by timestamp (oldest first)
    const sortedTrades = [...trades].sort((a, b) => {
      const timeA = this.extractTimestamp(a);
      const timeB = this.extractTimestamp(b);
      return timeA - timeB;
    });

    // Group trades into candles by timeframe
    const candles = new Map();

    for (const trade of sortedTrades) {
      const tradeTimestamp = this.extractTimestamp(trade);
      const price = this.extractPrice(trade);
      const volume = this.extractVolume(trade);

      // Skip if we can't extract valid data
      if (!tradeTimestamp || !price || price <= 0) {
        continue;
      }
      
      // Calculate candle start time (round down to timeframe)
      const candleTime = Math.floor(tradeTimestamp / timeframeMs) * timeframeMs;

      if (!candles.has(candleTime)) {
        // Initialize new candle
        candles.set(candleTime, {
          time: candleTime,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: volume || 0,
        });
      } else {
        // Update existing candle
        const candle = candles.get(candleTime);
        candle.high = Math.max(candle.high, price);
        candle.low = Math.min(candle.low, price);
        candle.close = price; // Last price in the timeframe becomes close
        candle.volume += (volume || 0);
      }
    }

    // Convert map to sorted array
    const candleArray = Array.from(candles.values())
      .sort((a, b) => a.time - b.time)
      .map(candle => ({
        time: candle.time,
        open: parseFloat(candle.open.toFixed(8)),
        high: parseFloat(candle.high.toFixed(8)),
        low: parseFloat(candle.low.toFixed(8)),
        close: parseFloat(candle.close.toFixed(8)),
        volume: parseFloat(candle.volume.toFixed(8)),
      }));

    return candleArray;
  }

  /**
   * Extract timestamp from trade object (handles various field names)
   */
  extractTimestamp(trade) {
    if (!trade) return null;
    
    const timeFields = ['timestamp', 'time', 'created_at', 'createdAt', 'date', 'block_time'];
    
    for (const field of timeFields) {
      if (trade[field] !== undefined) {
        const time = trade[field];
        if (typeof time === 'number') {
          // Handle seconds vs milliseconds
          return time < 1e12 ? time * 1000 : time;
        }
        if (typeof time === 'string') {
          const parsed = new Date(time).getTime();
          if (!isNaN(parsed)) return parsed;
        }
      }
    }
    
    return null;
  }

  /**
   * Extract price from trade object (handles various field names)
   */
  extractPrice(trade) {
    if (!trade) return null;
    
    const priceFields = [
      'price',
      'price_per_token',
      'pricePerToken',
      'sol_amount',
      'solAmount',
      'amount_sol',
      'amountSol',
      'usd_price',
      'usdPrice',
    ];
    
    for (const field of priceFields) {
      if (trade[field] !== undefined && trade[field] !== null) {
        const price = parseFloat(trade[field]);
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }
    }
    
    // Try to calculate from amount and volume
    if (trade.amount && trade.volume) {
      const price = parseFloat(trade.volume) / parseFloat(trade.amount);
      if (!isNaN(price) && price > 0) {
        return price;
      }
    }
    
    return null;
  }

  /**
   * Extract volume from trade object (handles various field names)
   */
  extractVolume(trade) {
    if (!trade) return 0;
    
    const volumeFields = [
      'volume',
      'sol_amount',
      'solAmount',
      'amount_sol',
      'amountSol',
      'size',
      'trade_size',
      'tradeSize',
    ];
    
    for (const field of volumeFields) {
      if (trade[field] !== undefined && trade[field] !== null) {
        const volume = parseFloat(trade[field]);
        if (!isNaN(volume) && volume > 0) {
          return volume;
        }
      }
    }
    
    return 0;
  }

  /**
   * Fetch and convert trades to candlestick data
   * Tries Moralis API first, falls back to Pump.fun trades if available
   * @param {string} mintAddress - The coin's mint address
   * @param {string} timeframe - Timeframe for candles
   * @param {number} limit - Number of candles to fetch
   * @returns {array} Array of candlestick objects
   */
  async getCandlestickData(mintAddress, timeframe = '1h', limit = 100) {
    try {
      // Try third-party APIs first (Moralis, etc.)
      try {
        const thirdPartyCandles = await this.getCandlestickDataFromThirdParty(mintAddress, timeframe, limit);
        if (thirdPartyCandles && thirdPartyCandles.length > 0) {
          console.log(`✅ Got ${thirdPartyCandles.length} candles from third-party API`);
          return thirdPartyCandles;
        }
      } catch (thirdPartyError) {
        console.warn('Third-party APIs failed, trying Pump.fun trades:', thirdPartyError.message);
      }

      // Fallback: Try Pump.fun trades endpoint (may not work for all tokens)
      try {
        const trades = await this.getTrades(mintAddress, {
          limit: limit * 10, // Fetch more trades to get enough candles
          offset: 0,
          minimumSize: 0,
        });

        if (trades && trades.length > 0) {
          const candles = this.convertTradesToCandles(trades, timeframe);
          console.log(`✅ Got ${candles.length} candles from Pump.fun trades`);
          return candles;
        }
      } catch (tradesError) {
        console.warn('Pump.fun trades failed:', tradesError.message);
      }

      // If all fail, return empty array
      console.warn(`⚠️  Could not fetch chart data for ${mintAddress} from any source`);
      return [];
    } catch (error) {
      console.error('Error getting candlestick data:', error);
      return [];
    }
  }

  /**
   * Note: Token listing is now handled by tokenService
   * This service only handles transaction creation and Pump.fun API calls
   */
}

export default new PumpPortalService();
