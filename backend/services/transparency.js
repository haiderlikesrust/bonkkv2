import { Connection, PublicKey } from '@solana/web3.js';
import { config } from '../config/config.js';
import axios from 'axios';

/**
 * Transparency Service
 * Provides on-chain data for transparency features
 */
class TransparencyService {
  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
  }

  /**
   * Get transaction history for a token (mint address)
   * Fetches transfers and swaps related to the token
   */
  async getTokenTransactionHistory(mintAddress, limit = 50) {
    try {
      const mintPubkey = new PublicKey(mintAddress);
      
      // Fetch signatures for the token account
      const signatures = await this.connection.getSignaturesForAddress(
        mintPubkey,
        { limit }
      );

      const transactions = await Promise.all(
        signatures.slice(0, limit).map(async (sigInfo) => {
          try {
            const tx = await this.connection.getTransaction(sigInfo.signature, {
              maxSupportedTransactionVersion: 0,
            });

            if (!tx) return null;

            return {
              signature: sigInfo.signature,
              blockTime: sigInfo.blockTime,
              slot: sigInfo.slot,
              err: sigInfo.err,
              fee: tx.meta?.fee || 0,
              status: sigInfo.err ? 'failed' : 'success',
              // Parse transaction details
              preBalances: tx.meta?.preBalances || [],
              postBalances: tx.meta?.postBalances || [],
              logMessages: tx.meta?.logMessages || [],
            };
          } catch (error) {
            console.error(`Error fetching transaction ${sigInfo.signature}:`, error.message);
            return null;
          }
        })
      );

      return transactions.filter(tx => tx !== null);
    } catch (error) {
      console.error('Error fetching token transaction history:', error);
      throw error;
    }
  }

  /**
   * Get token transfers (simplified from transaction history)
   * Uses Solana RPC to get token transfers
   */
  async getTokenTransfers(mintAddress, limit = 50) {
    try {
      const mintPubkey = new PublicKey(mintAddress);
      
      // Get token accounts for this mint
      const tokenAccounts = await this.connection.getParsedProgramAccounts(
        new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        {
          filters: [
            {
              dataSize: 165,
            },
            {
              memcmp: {
                offset: 0,
                bytes: mintPubkey.toBase58(),
              },
            },
          ],
        }
      );

      // Fetch signatures for transfers
      const signatures = await this.connection.getSignaturesForAddress(
        mintPubkey,
        { limit }
      );

      const transfers = [];
      for (const sigInfo of signatures.slice(0, limit)) {
        try {
          const tx = await this.connection.getParsedTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx || sigInfo.err) continue;

          // Parse transfer instructions
          const instructions = tx.transaction.message.instructions;
          for (const instruction of instructions) {
            if (instruction.programId.toString() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
              if (instruction.parsed?.type === 'transfer') {
                transfers.push({
                  signature: sigInfo.signature,
                  blockTime: sigInfo.blockTime,
                  from: instruction.parsed.info.authority || instruction.parsed.info.source,
                  to: instruction.parsed.info.destination,
                  amount: instruction.parsed.info.tokenAmount?.uiAmount || 0,
                  decimals: instruction.parsed.info.tokenAmount?.decimals || 0,
                  type: 'transfer',
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error parsing transaction ${sigInfo.signature}:`, error.message);
        }
      }

      return transfers;
    } catch (error) {
      console.error('Error fetching token transfers:', error);
      throw error;
    }
  }

  /**
   * Get wallet transaction history
   * Fetches all transactions for a wallet address
   */
  async getWalletTransactionHistory(walletAddress, limit = 50) {
    try {
      const walletPubkey = new PublicKey(walletAddress);
      
      const signatures = await this.connection.getSignaturesForAddress(
        walletPubkey,
        { limit }
      );

      const transactions = await Promise.all(
        signatures.slice(0, limit).map(async (sigInfo) => {
          try {
            const tx = await this.connection.getTransaction(sigInfo.signature, {
              maxSupportedTransactionVersion: 0,
            });

            if (!tx) return null;

            const preBalance = tx.meta?.preBalances?.[0] || 0;
            const postBalance = tx.meta?.postBalances?.[0] || 0;
            const balanceChange = (postBalance - preBalance) / 1e9; // Convert to SOL

            return {
              signature: sigInfo.signature,
              blockTime: sigInfo.blockTime,
              slot: sigInfo.slot,
              err: sigInfo.err,
              fee: tx.meta?.fee || 0,
              status: sigInfo.err ? 'failed' : 'success',
              balanceChange: balanceChange,
              solscanUrl: `https://solscan.io/tx/${sigInfo.signature}`,
            };
          } catch (error) {
            console.error(`Error fetching transaction ${sigInfo.signature}:`, error.message);
            return null;
          }
        })
      );

      return transactions.filter(tx => tx !== null);
    } catch (error) {
      console.error('Error fetching wallet transaction history:', error);
      throw error;
    }
  }

  /**
   * Get wallet balance and stats
   */
  async getWalletStats(walletAddress) {
    try {
      const walletPubkey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(walletPubkey);
      const balanceSOL = balance / 1e9;

      // Get transaction count
      const signatures = await this.connection.getSignaturesForAddress(
        walletPubkey,
        { limit: 1000 }
      );

      return {
        address: walletAddress,
        balance: balanceSOL,
        balanceLamports: balance,
        transactionCount: signatures.length,
        solscanUrl: `https://solscan.io/account/${walletAddress}`,
      };
    } catch (error) {
      console.error('Error fetching wallet stats:', error);
      throw error;
    }
  }

  /**
   * Get fee collection history for a token
   * This tracks when fees were collected and distributed
   */
  async getFeeCollectionHistory(mintAddress, creatorWallet) {
    try {
      // Get wallet transaction history for creator
      const walletTxs = await this.getWalletTransactionHistory(creatorWallet, 100);
      
      // Filter for fee collection transactions
      // Look for transactions that mention the token mint
      const feeTransactions = walletTxs.filter(tx => {
        // You can add more sophisticated filtering here
        // For now, return all transactions (you can enhance this)
        return tx.status === 'success';
      });

      return feeTransactions.slice(0, 20); // Return last 20
    } catch (error) {
      console.error('Error fetching fee collection history:', error);
      return [];
    }
  }
}

export default new TransparencyService();

