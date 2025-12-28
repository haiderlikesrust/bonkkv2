import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

/**
 * Vanity Mint Pool Utility
 * Reads vanity mints from local JSON file in public folder
 */
class VanityMintPool {
  constructor() {
    this.mints = [];
    this.loaded = false;
    this.loading = false;
  }

  /**
   * Load vanity mints from JSON file
   */
  async loadMints() {
    if (this.loaded || this.loading) {
      return;
    }

    this.loading = true;
    try {
      const response = await fetch('/vanity-mints-pool.json');
      if (!response.ok) {
        console.warn('Vanity mints pool file not found');
        this.loaded = true;
        return;
      }

      const data = await response.json();
      if (data.mints && Array.isArray(data.mints)) {
        this.mints = data.mints;
        console.log(`✅ Loaded ${this.mints.length} vanity mints from pool`);
        this.loaded = true;
      }
    } catch (error) {
      console.error('Error loading vanity mints pool:', error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Get a vanity mint from the pool
   * Returns null if pool is empty
   */
  async getVanityMint() {
    // Load mints if not already loaded
    await this.loadMints();

    if (this.mints.length === 0) {
      return null;
    }

    // Get and remove first mint from pool
    const mint = this.mints.shift();
    
    try {
      // Handle both 32-byte (seed) and 64-byte (full keypair) formats
      let secretKeyBytes;
      
      if (Array.isArray(mint.secretKey)) {
        secretKeyBytes = new Uint8Array(mint.secretKey);
      } else {
        throw new Error('Invalid secret key format');
      }

      let fullSecretKey;
      
      if (secretKeyBytes.length === 32) {
        // Only seed provided - derive full 64-byte keypair
        const keyPair = nacl.sign.keyPair.fromSeed(secretKeyBytes);
        
        // Solana format: [32-byte seed + 32-byte public key]
        fullSecretKey = new Uint8Array(64);
        fullSecretKey.set(secretKeyBytes, 0);
        fullSecretKey.set(keyPair.publicKey, 32);
      } else if (secretKeyBytes.length === 64) {
        // Full keypair secret key
        fullSecretKey = secretKeyBytes;
      } else {
        throw new Error(`Invalid secret key size: ${secretKeyBytes.length} bytes (expected 32 or 64)`);
      }

      // Validate keypair
      const keypair = Keypair.fromSecretKey(fullSecretKey);
      const derivedAddress = keypair.publicKey.toBase58();
      
      if (derivedAddress !== mint.mintAddress) {
        console.error(`Secret key does not match mint address. Derived: ${derivedAddress}, Expected: ${mint.mintAddress}`);
        // Try next mint
        return this.getVanityMint();
      }

      // Encode to base58 for storage/transmission
      const secretKeyBase58 = bs58.encode(fullSecretKey);

      return {
        mintAddress: mint.mintAddress,
        secretKey: secretKeyBase58,
        keypair,
        fromPool: true,
      };
    } catch (error) {
      console.error('Error processing vanity mint:', error);
      // Try next mint
      if (this.mints.length > 0) {
        return this.getVanityMint();
      }
      return null;
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      available: this.mints.length,
      loaded: this.loaded,
    };
  }
}

export default new VanityMintPool();

