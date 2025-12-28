import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vanityMintPool from './vanityMintPool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POOL_JSON_FILE = path.join(__dirname, '../../vanity-mints-pool.json');
const SUFFIX = 'bonk';

/**
 * Background Worker for Vanity Mint Generation
 * Runs continuously, slowly generating vanity mints and saving to JSON file
 */
class VanityMintBackgroundWorker {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.generationCount = 0;
    this.startTime = null;
  }

  /**
   * Start the background worker
   */
  start() {
    if (this.isRunning) {
      console.log('[VANITY WORKER] Already running');
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();
    this.generationCount = 0;

    // Configuration - can be overridden with environment variables
    this.generationInterval = parseInt(process.env.VANITY_WORKER_INTERVAL) || 60000; // Default: 60 seconds
    this.targetPoolSize = parseInt(process.env.VANITY_TARGET_POOL_SIZE) || 200; // Default: 200 mints

    console.log('[VANITY WORKER] 🚀 Starting background vanity mint generation...');
    console.log(`[VANITY WORKER] Target pool size: ${this.targetPoolSize}`);
    console.log(`[VANITY WORKER] Generation interval: ${this.generationInterval / 1000}s per mint`);
    console.log(`[VANITY WORKER] This will run continuously in the background\n`);

    // Start generating immediately, then continue at intervals
    this.generateAndSave();
    this.intervalId = setInterval(() => {
      this.generateAndSave();
    }, this.generationInterval);
  }

  /**
   * Stop the background worker
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const elapsed = ((Date.now() - this.startTime) / 1000 / 60).toFixed(1);
    console.log(`[VANITY WORKER] ⏹️  Stopped after generating ${this.generationCount} mints in ${elapsed} minutes`);
  }

  /**
   * Generate a single vanity mint and save to JSON file
   */
  async generateAndSave() {
    try {
      // Check current pool size
      const stats = vanityMintPool.getPoolStats();
      const targetSize = this.targetPoolSize || 200;
      
      // If pool is already at target size, skip this round
      if (stats.available >= targetSize) {
        console.log(`[VANITY WORKER] Pool is full (${stats.available}/${targetSize}), skipping generation`);
        return;
      }

      console.log(`[VANITY WORKER] Generating vanity mint... (Pool: ${stats.available}/${targetSize} available)`);
      
      // Generate vanity mint (this is CPU-intensive but we're doing it slowly)
      const startTime = Date.now();
      const generated = await vanityMintPool.generateVanityMint();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // Store in database pool
      const secretKeyBase64 = Buffer.from(generated.keypair.secretKey).toString('base64');
      vanityMintPool.storeVanityMint(generated.mintAddress, secretKeyBase64);

      // Also save to JSON file
      this.appendToJsonFile(generated.mintAddress, generated.keypair.secretKey);

      this.generationCount++;
      const totalElapsed = ((Date.now() - this.startTime) / 1000 / 60).toFixed(1);
      
      console.log(`[VANITY WORKER] ✅ Generated: ${generated.mintAddress} (${elapsed}s)`);
      console.log(`[VANITY WORKER] 📊 Total: ${this.generationCount} mints in ${totalElapsed} minutes`);
      console.log(`[VANITY WORKER] 💾 Pool: ${stats.available + 1}/${targetSize} available\n`);
    } catch (error) {
      console.error('[VANITY WORKER] ❌ Error generating vanity mint:', error.message);
      // Continue running even if one generation fails
    }
  }

  /**
   * Append a mint to the JSON file
   */
  appendToJsonFile(mintAddress, secretKey) {
    try {
      let data = {
        generatedAt: new Date().toISOString(),
        suffix: SUFFIX,
        count: 0,
        mints: [],
      };

      // Read existing file if it exists
      if (fs.existsSync(POOL_JSON_FILE)) {
        const fileContent = fs.readFileSync(POOL_JSON_FILE, 'utf8');
        try {
          data = JSON.parse(fileContent);
        } catch (parseError) {
          console.warn('[VANITY WORKER] Could not parse existing JSON file, creating new one');
        }
      }

      // Check if mint already exists
      const exists = data.mints.some(m => m.mintAddress === mintAddress);
      if (exists) {
        console.log(`[VANITY WORKER] Mint ${mintAddress} already in JSON file, skipping`);
        return;
      }

      // Add new mint
      data.mints.push({
        mintAddress: mintAddress,
        secretKey: Array.from(secretKey), // Convert Uint8Array to array for JSON
      });

      // Update metadata
      data.count = data.mints.length;
      data.lastUpdated = new Date().toISOString();

      // Write back to file
      fs.writeFileSync(POOL_JSON_FILE, JSON.stringify(data, null, 2));
      console.log(`[VANITY WORKER] 💾 Appended to JSON file: ${POOL_JSON_FILE}`);
    } catch (error) {
      console.error('[VANITY WORKER] Error appending to JSON file:', error.message);
    }
  }

  /**
   * Get worker statistics
   */
  getStats() {
    const stats = vanityMintPool.getPoolStats();
    const elapsed = this.startTime ? (Date.now() - this.startTime) / 1000 / 60 : 0;
    
    return {
      isRunning: this.isRunning,
      generationCount: this.generationCount,
      elapsedMinutes: elapsed.toFixed(1),
      poolStats: stats,
      targetPoolSize: this.targetPoolSize || 200,
      generationInterval: (this.generationInterval || 60000) / 1000,
    };
  }
}

export default new VanityMintBackgroundWorker();

