import pumpPortalService from './pumpportal.js';
import tokenService from './token.js';

/**
 * Market Cap Updater Service
 * Updates market cap for tokens by fetching from Pump.fun API
 */
class MarketCapUpdaterService {
  /**
   * Update market cap for a single token
   */
  async updateTokenMarketCap(mint) {
    try {
      const coinInfo = await pumpPortalService.getCoinInfo(mint);
      const usdMarketCap = coinInfo.usd_market_cap || 0;
      
      await tokenService.updateToken(mint, {
        marketCap: usdMarketCap,
      });
      
      return { success: true, marketCap: usdMarketCap };
    } catch (error) {
      console.error(`Error updating market cap for ${mint}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update market cap for all tokens
   */
  async updateAllMarketCaps() {
    try {
      const tokens = await tokenService.getAllTokens(1000, 0); // Get up to 1000 tokens
      console.log(`🔄 Updating market cap for ${tokens.length} tokens...`);
      
      const results = [];
      for (const token of tokens) {
        try {
          const result = await this.updateTokenMarketCap(token.mint);
          results.push({
            mint: token.mint,
            name: token.name,
            success: result.success,
            marketCap: result.marketCap,
            error: result.error,
          });
        } catch (error) {
          console.error(`Error processing token ${token.mint}:`, error);
          results.push({
            mint: token.mint,
            name: token.name,
            success: false,
            error: error.message,
          });
        }
      }
      
      const successful = results.filter(r => r.success).length;
      console.log(`✅ Updated market cap for ${successful}/${tokens.length} tokens`);
      
      return results;
    } catch (error) {
      console.error('Error updating all market caps:', error);
      throw error;
    }
  }
}

export default new MarketCapUpdaterService();

