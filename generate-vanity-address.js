import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PREFIX = 'btcv2';
const MAX_ATTEMPTS = 10000000; // Maximum attempts before giving up
const UPDATE_INTERVAL = 10000; // Update progress every N attempts

function isValidVanityAddress(publicKey) {
  const address = publicKey.toBase58();
  return address.startsWith(PREFIX);
}

function generateVanityAddress() {
  console.log('🔍 Starting vanity address generation...');
  console.log(`📝 Looking for address that starts with "${PREFIX}"`);
  console.log(`⏱️  This may take a while...\n`);

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

      console.log('\n✅ VANITY ADDRESS FOUND!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📍 Address: ${address}`);
      console.log(`🔑 Attempts: ${attempts.toLocaleString()}`);
      console.log(`⏱️  Time: ${elapsed} seconds`);
      console.log(`⚡ Speed: ~${rate} keys/sec`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Save the keypair
      const keypairData = {
        publicKey: publicKey.toBase58(),
        secretKey: Array.from(keypair.secretKey),
        // Also save in various formats for convenience
        secretKeyHex: Buffer.from(keypair.secretKey).toString('hex'),
        secretKeyBase64: Buffer.from(keypair.secretKey).toString('base64'),
      };

      // Save to file
      const outputPath = path.join(__dirname, 'vanity-keypair.json');
      fs.writeFileSync(outputPath, JSON.stringify(keypairData, null, 2));

      console.log(`💾 Keypair saved to: ${outputPath}`);
      console.log('\n⚠️  WARNING: Keep this file SECRET! Anyone with access can control the wallet!');
      console.log('🔒 Make sure to back it up securely and never share it.\n');

      // Also create a .env format file for easy use
      const envContent = `WALLET_PRIVATE_KEY=${keypair.secretKey.join(',')}\nWALLET_ADDRESS=${address}\n`;
      const envPath = path.join(__dirname, 'vanity-wallet.env');
      fs.writeFileSync(envPath, envContent);
      console.log(`📄 Also saved to .env format: ${envPath}\n`);

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
      const currentAddress = publicKey.toBase58();
      process.stdout.write(
        `\r⏳ Attempts: ${attempts.toLocaleString()} | Speed: ~${rate}/sec | Last: ${currentAddress.slice(0, 8)}...${currentAddress.slice(-8)}`
      );
    }
  }

  console.log(`\n❌ Stopped after ${MAX_ATTEMPTS.toLocaleString()} attempts.`);
  console.log('💡 Try running again or adjust the prefix/suffix requirements.\n');
  return null;
}

// Run the generator
try {
  generateVanityAddress();
} catch (error) {
  console.error('❌ Error generating vanity address:', error.message);
  process.exit(1);
}

