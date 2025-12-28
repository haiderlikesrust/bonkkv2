import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Wallet Service
 * Handles wallet creation and management
 */
class WalletService {
  /**
   * Generate a new wallet keypair
   */
  generateWallet() {
    const keypair = Keypair.generate();
    return {
      publicKey: keypair.publicKey.toBase58(),
      secretKey: bs58.encode(keypair.secretKey), // Base58 format (most common)
      secretKeyArray: Array.from(keypair.secretKey), // Array format
      secretKeyHex: Buffer.from(keypair.secretKey).toString('hex'),
      secretKeyBase64: Buffer.from(keypair.secretKey).toString('base64'),
    };
  }

  /**
   * Create wallet from secret key (multiple formats)
   * Supports: Base58 (preferred), JSON array string, comma-separated array, hex, base64
   */
  createFromSecretKey(secretKey) {
    let keypair;
    let secretKeyBytes;

    if (typeof secretKey !== 'string' && !Array.isArray(secretKey)) {
      throw new Error('Secret key must be a string or array');
    }

    try {
      // Try Base58 first (most common format for Solana)
      if (typeof secretKey === 'string') {
        try {
          secretKeyBytes = bs58.decode(secretKey);
          keypair = Keypair.fromSecretKey(secretKeyBytes);
          return {
            publicKey: keypair.publicKey.toBase58(),
            secretKey: bs58.encode(keypair.secretKey),
          };
        } catch (base58Error) {
          // Not base58, try other formats
        }
      }

      // Handle array format
      if (Array.isArray(secretKey)) {
        secretKeyBytes = new Uint8Array(secretKey);
        keypair = Keypair.fromSecretKey(secretKeyBytes);
      }
      // Handle JSON array string like "[1,2,3,...]"
      else if (typeof secretKey === 'string' && secretKey.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(secretKey);
          if (Array.isArray(parsed)) {
            secretKeyBytes = new Uint8Array(parsed);
            keypair = Keypair.fromSecretKey(secretKeyBytes);
          } else {
            throw new Error('Invalid JSON array format');
          }
        } catch (parseError) {
          throw new Error('Invalid JSON array format');
        }
      }
      // Handle comma-separated string like "1,2,3,..."
      else if (typeof secretKey === 'string' && secretKey.includes(',')) {
        const arr = secretKey.split(',').map(n => parseInt(n.trim(), 10));
        if (arr.length === 64 && arr.every(n => !isNaN(n))) {
          secretKeyBytes = new Uint8Array(arr);
          keypair = Keypair.fromSecretKey(secretKeyBytes);
        } else {
          throw new Error('Invalid comma-separated array format');
        }
      }
      // Handle hex string (128 chars = 64 bytes)
      else if (typeof secretKey === 'string' && secretKey.length === 128 && /^[0-9a-fA-F]+$/.test(secretKey)) {
        secretKeyBytes = Buffer.from(secretKey, 'hex');
        keypair = Keypair.fromSecretKey(secretKeyBytes);
      }
      // Handle base64 string
      else if (typeof secretKey === 'string') {
        try {
          secretKeyBytes = Buffer.from(secretKey, 'base64');
          keypair = Keypair.fromSecretKey(secretKeyBytes);
        } catch (base64Error) {
          throw new Error('Invalid secret key format. Please use Base58, JSON array, or comma-separated format.');
        }
      } else {
        throw new Error('Invalid secret key format');
      }

      if (!keypair) {
        throw new Error('Failed to create keypair from secret key');
      }

      return {
        publicKey: keypair.publicKey.toBase58(),
        secretKey: bs58.encode(keypair.secretKey), // Return in Base58 format
      };
    } catch (error) {
      throw new Error(`Invalid secret key: ${error.message}`);
    }
  }

  /**
   * Create a dev/test wallet (for testing)
   */
  createDevWallet() {
    const wallet = this.generateWallet();
    return {
      ...wallet,
      type: 'dev',
      createdAt: new Date().toISOString(),
    };
  }
}

export default new WalletService();

