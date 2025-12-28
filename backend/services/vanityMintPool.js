import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to pre-generated JSON file
const PRE_GENERATED_FILE = path.join(__dirname, '../../vanity-mints-pool.json');

/**
 * Vanity Mint Pool Service
 * Pre-generates and stores vanity mints ending with "bonk" for instant token creation
 * Similar to how pump.fun likely handles vanity addresses ending with "pump"
 */
class VanityMintPoolService {
  constructor() {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'vanity-mints.db');
    this.db = new Database(dbPath);
    this.initDatabase();
    
    // Load pre-generated mints from JSON file if it exists
    this.loadPreGeneratedMints();
    
    // Start background generation if pool is low
    this.ensurePoolSize();
  }

  /**
   * Load pre-generated vanity mints from JSON file
   */
  loadPreGeneratedMints() {
    if (!fs.existsSync(PRE_GENERATED_FILE)) {
      console.log('ℹ️  No pre-generated vanity mints file found. Run: npm run vanity-mints-gpu');
      return;
    }

    try {
      const fileContent = fs.readFileSync(PRE_GENERATED_FILE, 'utf8');
      const data = JSON.parse(fileContent);

      if (!data.mints || !Array.isArray(data.mints)) {
        console.warn('⚠️  Invalid format in pre-generated mints file');
        return;
      }

      console.log(`📂 Loading ${data.mints.length} pre-generated vanity mints from JSON file...`);
      console.log(`   File: ${PRE_GENERATED_FILE}`);
      console.log(`   Generated: ${data.generatedAt || 'unknown'}`);
      console.log(`   Suffix: ${data.suffix || 'bonk'}`);

      let loaded = 0;
      let skipped = 0;

      for (const mint of data.mints) {
        try {
          // Convert secret key array to base64 for storage
          const secretKeyBytes = new Uint8Array(mint.secretKey);
          const secretKeyBase64 = Buffer.from(secretKeyBytes).toString('base64');

          // Check if already exists
          const existing = this.db.prepare('SELECT id FROM vanity_mints WHERE mint_address = ?').get(mint.mintAddress);
          if (existing) {
            skipped++;
            continue;
          }

          // Store in database
          this.storeVanityMint(mint.mintAddress, secretKeyBase64);
          loaded++;
        } catch (error) {
          console.error(`Error loading mint ${mint.mintAddress}:`, error.message);
        }
      }

      console.log(`✅ Loaded ${loaded} new vanity mints (${skipped} already existed)`);
      
      const stats = this.getPoolStats();
      console.log(`📊 Pool stats: ${stats.available} available, ${stats.used} used, ${stats.total} total\n`);
    } catch (error) {
      console.error('❌ Error loading pre-generated mints:', error);
    }
  }

  initDatabase() {
    // Create vanity mints table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vanity_mints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mint_address TEXT UNIQUE NOT NULL,
        secret_key_encrypted TEXT NOT NULL,
        created_at TEXT NOT NULL,
        used_at TEXT,
        is_used INTEGER DEFAULT 0
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_is_used ON vanity_mints(is_used);
      CREATE INDEX IF NOT EXISTS idx_created_at ON vanity_mints(created_at);
    `);
  }

  /**
   * Generate a vanity mint ending with "bonk"
   * This is CPU-intensive and should run in background
   */
  async generateVanityMint() {
    const SUFFIX = 'bonk';
    const MAX_ATTEMPTS = 20000000; // 20M attempts max
    let attempts = 0;
    const startTime = Date.now();

    while (attempts < MAX_ATTEMPTS) {
      const keypair = Keypair.generate();
      const address = keypair.publicKey.toBase58();

      attempts++;

      if (address.toLowerCase().endsWith(SUFFIX.toLowerCase())) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        const rate = (attempts / elapsed).toFixed(0);

        console.log(`✅ Vanity mint found after ${attempts.toLocaleString()} attempts (${elapsed}s, ~${rate}/sec)`);
        
        // Encrypt secret key before storing (simple base64 for now, use proper encryption in production)
        const secretKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');
        
        return {
          mintAddress: address,
          secretKey: secretKeyBase64, // Store encrypted
          keypair, // Return keypair for immediate use
        };
      }

      // Progress update every 100k attempts
      if (attempts % 100000 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        const rate = (attempts / elapsed).toFixed(0);
        console.log(`⏳ Generated ${attempts.toLocaleString()} addresses (~${rate}/sec)...`);
      }
    }

    throw new Error(`Could not generate vanity mint after ${MAX_ATTEMPTS.toLocaleString()} attempts`);
  }

  /**
   * Store a vanity mint in the pool
   */
  storeVanityMint(mintAddress, secretKeyEncrypted) {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO vanity_mints (mint_address, secret_key_encrypted, created_at, is_used)
      VALUES (?, ?, ?, 0)
    `);

    try {
      stmt.run(mintAddress, secretKeyEncrypted, now);
      console.log(`💾 Stored vanity mint: ${mintAddress}`);
      return true;
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        console.log(`ℹ️  Vanity mint already exists: ${mintAddress}`);
        return false;
      }
      throw error;
    }
  }

  /**
   * Get an unused vanity mint from the pool
   */
  getVanityMint() {
    const stmt = this.db.prepare(`
      SELECT * FROM vanity_mints 
      WHERE is_used = 0 
      ORDER BY created_at ASC 
      LIMIT 1
    `);

    const row = stmt.get();
    if (!row) {
      return null;
    }

    // Mark as used
    const updateStmt = this.db.prepare(`
      UPDATE vanity_mints 
      SET is_used = 1, used_at = ? 
      WHERE id = ?
    `);
    updateStmt.run(new Date().toISOString(), row.id);

    // Decrypt secret key
    const secretKeyBytes = Buffer.from(row.secret_key_encrypted, 'base64');
    
    // Validate secret key size (must be 64 bytes for Solana keypair)
    if (secretKeyBytes.length !== 64) {
      console.error(`ERROR: Invalid secret key size in database: ${secretKeyBytes.length} bytes (expected 64)`);
      throw new Error(`Invalid secret key size: ${secretKeyBytes.length} bytes (expected 64)`);
    }
    
    const keypair = Keypair.fromSecretKey(secretKeyBytes);
    
    // Validate the keypair matches the stored mint address
    if (keypair.publicKey.toBase58() !== row.mint_address) {
      console.error('ERROR: Secret key does not match mint address in database');
      throw new Error('Secret key does not match mint address');
    }

    // Encode to base58 string
    const secretKeyBase58 = bs58.encode(secretKeyBytes);
    
    // Validate it's a string
    if (typeof secretKeyBase58 !== 'string') {
      console.error('ERROR: bs58.encode did not return a string! Type:', typeof secretKeyBase58);
      throw new Error('Failed to encode secret key to base58');
    }

    console.log(`✅ Retrieved vanity mint from pool: ${row.mint_address}`);
    console.log(`   Secret key base58 length: ${secretKeyBase58.length}`);
    return {
      mintAddress: row.mint_address,
      keypair,
      secretKeyBase58: secretKeyBase58,
      fromPool: true, // Mark that this came from the pool
    };
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as total FROM vanity_mints');
    const usedStmt = this.db.prepare('SELECT COUNT(*) as used FROM vanity_mints WHERE is_used = 1');
    const availableStmt = this.db.prepare('SELECT COUNT(*) as available FROM vanity_mints WHERE is_used = 0');

    return {
      total: totalStmt.get().total,
      used: usedStmt.get().used,
      available: availableStmt.get().available,
    };
  }

  /**
   * Ensure pool has minimum number of available mints
   * Runs in background to maintain pool
   */
  async ensurePoolSize(minSize = 10) {
    const stats = this.getPoolStats();
    
    if (stats.available >= minSize) {
      return; // Pool is sufficient
    }

    console.log(`🔄 Pool has ${stats.available} available mints, generating more to reach ${minSize}...`);

    // Generate mints in background (don't await, let it run)
    this.generateAndStoreMints(minSize - stats.available).catch(err => {
      console.error('Error generating vanity mints:', err);
    });
  }

  /**
   * Generate and store multiple vanity mints
   */
  async generateAndStoreMints(count = 1) {
    for (let i = 0; i < count; i++) {
      try {
        const { mintAddress, secretKey } = await this.generateVanityMint();
        this.storeVanityMint(mintAddress, secretKey);
      } catch (error) {
        console.error(`Error generating vanity mint ${i + 1}/${count}:`, error);
      }
    }
    console.log(`✅ Generated and stored ${count} vanity mint(s)`);
  }
}

export default new VanityMintPoolService();

