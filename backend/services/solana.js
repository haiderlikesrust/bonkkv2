import { Connection, clusterApiUrl } from '@solana/web3.js';
import { config } from '../config/config.js';

/**
 * Solana Connection Service
 * Uses Helius RPC for better performance
 */
class SolanaService {
  constructor() {
    this.connection = null;
    this.init();
  }

  init() {
    try {
      const rpcUrl = config.solana.rpcUrl;
      
      this.connection = new Connection(rpcUrl, {
        commitment: 'confirmed',
        httpHeaders: config.solana.heliusApiKey ? {
          'x-api-key': config.solana.heliusApiKey,
        } : undefined,
      });

      console.log('✅ Solana RPC connected:', rpcUrl.includes('helius') ? 'Helius' : 'Public');
    } catch (error) {
      console.error('❌ Failed to initialize Solana connection:', error.message);
    }
  }

  /**
   * Get Solana connection
   */
  getConnection() {
    if (!this.connection) {
      this.init();
    }
    return this.connection;
  }

  /**
   * Get balance for a wallet address
   */
  async getBalance(address) {
    try {
      const connection = this.getConnection();
      const publicKey = new (await import('@solana/web3.js')).PublicKey(address);
      const balance = await connection.getBalance(publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  async getTransaction(signature) {
    try {
      const connection = this.getConnection();
      const tx = await connection.getTransaction(signature, {
        commitment: 'confirmed',
      });
      return tx;
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw error;
    }
  }

  /**
   * Check if transaction is confirmed
   */
  async isTransactionConfirmed(signature) {
    try {
      const connection = this.getConnection();
      const status = await connection.getSignatureStatus(signature);
      return status?.value?.confirmationStatus === 'confirmed' || 
             status?.value?.confirmationStatus === 'finalized';
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return false;
    }
  }
}

export default new SolanaService();

