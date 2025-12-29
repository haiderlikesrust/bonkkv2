import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  // PumpPortal API
  pumpPortal: {
    baseUrl: process.env.PUMP_PORTAL_URL || 'https://pumpportal.fun',
    apiKey: process.env.PUMP_PORTAL_API_KEY || '',
  },

  // Solana (Helius RPC)
  solana: {
    heliusApiKey: process.env.HELIUS_API_KEY || '',
    rpcUrl: process.env.SOLANA_RPC_URL || (process.env.HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com'),
    network: process.env.SOLANA_NETWORK || 'mainnet-beta',
  },

  // Session/API Keys
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-this',
  
  // Moralis API (for chart data)
  moralis: {
    apiKey: process.env.MORALIS_API_KEY || '',
  },
  
  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },

  // Fee Collection
  feeCollection: {
    ponkTokenCA: process.env.PONK_TOKEN_CA || '', // Token CA to buy for PONK support
    ponkDevWallet: process.env.PONK_DEV_WALLET || '', // Wallet to send bought tokens to
  },

  // Dev Buy Configuration
  devBuy: {
    enabled: process.env.DEV_BUY_ENABLED !== 'false', // Enable dev buy by default
    amount: parseFloat(process.env.DEV_BUY_AMOUNT) || 0.01, // Default 0.01 SOL
  },
};

