import { Connection } from '@solana/web3.js';

/**
 * Get Helius RPC connection
 * Uses Helius API key for better performance
 */
export function getSolanaConnection() {
  const heliusApiKey = import.meta.env.VITE_HELIUS_API_KEY || '025fc4b2-ce28-442e-a994-72e54ef560a0';
  const rpcUrl = import.meta.env.VITE_SOLANA_RPC || `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
  
  return new Connection(rpcUrl, 'confirmed');
}

/**
 * Get Helius RPC URL
 */
export function getSolanaRpcUrl() {
  const heliusApiKey = import.meta.env.VITE_HELIUS_API_KEY || '025fc4b2-ce28-442e-a994-72e54ef560a0';
  return import.meta.env.VITE_SOLANA_RPC || `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`;
}

