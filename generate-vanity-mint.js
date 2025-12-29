import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SUFFIX = 'ponk'; // Address should end with this
const MAX_ATTEMPTS = 100000000; // Maximum attempts before giving up (100M)
const UPDATE_INTERVAL = 50000; // Update progress every N attempts
const USE_GPU = false; // Set to true if using GPU-accelerated generation

/**
 * Check if address ends with desired suffix
 */
function isValidVanityAddress(publicKey) {
  const address = publicKey.toBase58();
  return address.toLowerCase().endsWith(SUFFIX.toLowerCase());
}

/**
 * Generate vanity mint address ending with specified suffix
 * 
 * Difficulty: For a 4-character suffix like "ponk":
 * - Probability: ~1 in 58^4 = ~11.3 million attempts on average
 * - CPU speed: ~10,000-50,000 keys/sec = 4-19 minutes average
 * - GPU speed: ~500,000-2,000,000 keys/sec = 6-23 seconds average
 */
function generateVanityMint() {
  console.log('🔍 Starting vanity mint address generation...');
  console.log(`📝 Looking for mint address ending with "${SUFFIX}"`);
  console.log(`⚠️  This will take approximately 4-19 minutes on CPU`);
  console.log(`💡 For faster generation, consider using GPU or an API service\n`);

  let attempts = 0;
  const startTime = Date.now();

  while (attempts < MAX_ATTEMPTS) {
    // Generate a new keypair
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey;
    const address = publicKey.toBase58();

    attempts++;

    // Check if this is our vanity address
    if (isValidVanityAddress(publicKey)) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      const rate = (attempts / elapsed).toFixed(0);

      console.log('\n✅ VANITY MINT ADDRESS FOUND!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📍 Mint Address: ${address}`);
      console.log(`🔑 Attempts: ${attempts.toLocaleString()}`);
      console.log(`⏱️  Time: ${elapsed} seconds (${(elapsed / 60).toFixed(2)} minutes)`);
      console.log(`⚡ Speed: ~${rate} keys/sec`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Save the keypair
      const keypairData = {
        publicKey: publicKey.toBase58(),
        secretKey: Array.from(keypair.secretKey),
        secretKeyBase58: Buffer.from(keypair.secretKey).toString('base64'),
        // Format for Solana Web3.js
        secretKeyHex: Buffer.from(keypair.secretKey).toString('hex'),
      };

      // Save to file
      const outputPath = path.join(__dirname, 'vanity-mint-ponk.json');
      fs.writeFileSync(outputPath, JSON.stringify(keypairData, null, 2));

      console.log(`💾 Mint keypair saved to: ${outputPath}`);
      console.log('\n⚠️  WARNING: Keep this file SECRET! This is the mint authority!');
      console.log('🔒 Make sure to back it up securely and never share it.\n');

      // Also create a format that can be imported directly
      const importFormat = {
        publicKey: publicKey.toBase58(),
        secretKey: keypair.secretKey, // For direct Keypair.fromSecretKey() usage
      };
      const importPath = path.join(__dirname, 'vanity-mint-import.json');
      fs.writeFileSync(importPath, JSON.stringify(importFormat, null, 2));
      console.log(`📄 Import format saved to: ${importPath}\n`);

      return {
        keypair,
        address,
        attempts,
        time: elapsed,
      };
    }

    // Progress update
    if (attempts % UPDATE_INTERVAL === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      const rate = (attempts / elapsed).toFixed(0);
      const estimatedRemaining = ((58 ** SUFFIX.length - attempts) / rate).toFixed(0);
      const currentAddress = publicKey.toBase58();
      process.stdout.write(
        `\r⏳ Attempts: ${attempts.toLocaleString()} | Speed: ~${rate}/sec | Est. remaining: ${estimatedRemaining}s | Last: ...${currentAddress.slice(-12)}`
      );
    }
  }

  console.log(`\n❌ Stopped after ${MAX_ATTEMPTS.toLocaleString()} attempts.`);
  console.log('💡 Try running again or consider using a GPU-accelerated generator.\n');
  return null;
}

// Run the generator
try {
  generateVanityMint();
} catch (error) {
  console.error('❌ Error generating vanity mint:', error.message);
  process.exit(1);
}

