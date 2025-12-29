import { Keypair } from '@solana/web3.js';

/**
 * Generate a vanity mint address ending with "ponk"
 * This is used for token creation to get a recognizable mint address
 * 
 * @param {Object} options - Generation options
 * @param {number} options.maxAttempts - Maximum attempts before giving up (default: 5000000)
 * @param {number} options.updateInterval - Progress update interval (default: 10000)
 * @param {Function} options.onProgress - Callback for progress updates
 * @returns {Promise<Keypair>} The generated vanity mint keypair
 */
export async function generateVanityMintEndingWithBonk(options = {}) {
  const {
    maxAttempts = 5000000, // ~5M attempts should find one in reasonable time
    updateInterval = 10000,
    onProgress = null,
  } = options;

  const SUFFIX = 'ponk';
  let attempts = 0;
  const startTime = Date.now();
  const batchSize = 5000; // Increased batch size for better performance

  console.log('🔍 Generating vanity mint ending with "ponk"...');
  console.log('⏱️  This may take a few seconds to a few minutes...\n');

  // Use async generator pattern to avoid blocking the UI
  async function generateBatch() {
    for (let i = 0; i < batchSize && attempts < maxAttempts; i++) {
      // Generate a new keypair
      const keypair = Keypair.generate();
      const publicKey = keypair.publicKey;
      const address = publicKey.toBase58();

      attempts++;

      // Check if address ends with "bonk" (case insensitive)
      if (address.toLowerCase().endsWith(SUFFIX.toLowerCase())) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        const rate = (attempts / elapsed).toFixed(0);

        console.log('\n✅ VANITY MINT FOUND!');
        console.log(`📍 Mint Address: ${address}`);
        console.log(`🔑 Attempts: ${attempts.toLocaleString()}`);
        console.log(`⏱️  Time: ${elapsed} seconds`);
        console.log(`⚡ Speed: ~${rate} keys/sec\n`);

        return keypair;
      }

      // Progress update
      if (attempts % updateInterval === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        const rate = (attempts / elapsed).toFixed(0);
        
        if (onProgress) {
          onProgress({ 
            attempts: parseInt(attempts), 
            elapsed: parseFloat(elapsed), 
            rate: parseInt(rate), 
            lastAddress: address 
          });
        }
      }
    }

    // Yield to event loop after each batch
    if (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 0));
      return generateBatch();
    }

    throw new Error(`Could not generate vanity mint ending with "${SUFFIX}" after ${maxAttempts.toLocaleString()} attempts. Try again or increase maxAttempts.`);
  }

  return generateBatch();
}

/**
 * Generate vanity mint with timeout
 * @param {number} timeoutMs - Maximum time to wait in milliseconds (default: 60000 = 1 minute)
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Keypair>}
 */
export async function generateVanityMintWithTimeout(timeoutMs = 60000, onProgress = null) {
  return Promise.race([
    generateVanityMintEndingWithBonk({ onProgress }),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Vanity mint generation timed out after ${timeoutMs / 1000} seconds. Please try again.`));
      }, timeoutMs);
    }),
  ]);
}

