import { Keypair } from '@solana/web3.js';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SUFFIX = 'bonk';
// Use maximum CPU cores for RTX 4070 system
// RTX 4070 systems typically have 8-16 CPU cores, use 2x for hyperthreading
const CPU_CORES = os.cpus().length;
const NUM_WORKERS = Math.max(32, CPU_CORES * 2); // Use 2x CPU cores or minimum 32 for maximum performance
const MINTS_TO_GENERATE = 100; // Generate 100 vanity mints for larger pool
const OUTPUT_FILE = path.join(__dirname, 'vanity-mints-pool.json');

/**
 * Worker thread function - generates vanity mints in parallel
 */
function workerFunction() {
  const { workerId, suffix } = workerData;
  let attempts = 0;
  const startTime = Date.now();

  console.log(`[Worker ${workerId}] Started generating vanity mints...`);

  while (true) {
    // Generate a new keypair
    const keypair = Keypair.generate();
    const address = keypair.publicKey.toBase58();

    attempts++;

    // Check if address ends with suffix (case insensitive)
    if (address.toLowerCase().endsWith(suffix.toLowerCase())) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      const rate = (attempts / elapsed).toFixed(0);

      // Send result to main thread
      parentPort.postMessage({
        success: true,
        workerId,
        mintAddress: address,
        secretKey: Array.from(keypair.secretKey),
        attempts,
        elapsed: parseFloat(elapsed),
        rate: parseInt(rate),
      });
      
      // Reset for next mint
      attempts = 0;
      const newStartTime = Date.now();
    }

    // Progress update every 100k attempts
    if (attempts % 100000 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      const rate = (attempts / elapsed).toFixed(0);
      parentPort.postMessage({
        progress: true,
        workerId,
        attempts,
        rate: parseInt(rate),
      });
    }
  }
}

/**
 * Main thread - manages workers and collects results
 */
async function generateVanityMintsPool() {
  console.log('🚀 Starting GPU-accelerated vanity mint generation...');
  console.log(`📝 Generating ${MINTS_TO_GENERATE} vanity mints ending with "${SUFFIX}"`);
  console.log(`💻 CPU Cores detected: ${CPU_CORES}`);
  console.log(`⚡ Using ${NUM_WORKERS} parallel workers (maximum performance mode)\n`);

  const mints = [];
  const workers = [];
  let totalAttempts = 0;
  const startTime = Date.now();

  // Create worker threads
  for (let i = 0; i < NUM_WORKERS; i++) {
    const worker = new Worker(__filename, {
      workerData: { workerId: i, suffix: SUFFIX },
    });

    worker.on('message', (message) => {
      if (message.success) {
        // Found a vanity mint!
        mints.push({
          mintAddress: message.mintAddress,
          secretKey: message.secretKey,
          generatedBy: `Worker ${message.workerId}`,
          attempts: message.attempts,
          time: message.elapsed,
          rate: message.rate,
        });

        totalAttempts += message.attempts;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        const avgRate = (totalAttempts / elapsed).toFixed(0);

        console.log(`✅ [${mints.length}/${MINTS_TO_GENERATE}] Found: ${message.mintAddress}`);
        console.log(`   Worker ${message.workerId}: ${message.attempts.toLocaleString()} attempts in ${message.elapsed}s (~${message.rate}/sec)`);
        console.log(`   Total: ${totalAttempts.toLocaleString()} attempts in ${elapsed}s (~${avgRate}/sec avg)\n`);

        // Check if we have enough mints
        if (mints.length >= MINTS_TO_GENERATE) {
          console.log(`\n🎉 Generated ${mints.length} vanity mints! Saving to file...\n`);
          
          // Terminate all workers
          workers.forEach(w => w.terminate());
          
          // Save to JSON file
          const output = {
            generatedAt: new Date().toISOString(),
            suffix: SUFFIX,
            count: mints.length,
            totalAttempts,
            totalTime: parseFloat(((Date.now() - startTime) / 1000).toFixed(2)),
            averageAttempts: Math.round(totalAttempts / mints.length),
            mints: mints.map(m => ({
              mintAddress: m.mintAddress,
              secretKey: m.secretKey, // Array format for easy Keypair.fromSecretKey()
            })),
          };

          fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
          
          console.log(`💾 Saved ${mints.length} vanity mints to: ${OUTPUT_FILE}`);
          console.log(`⏱️  Total time: ${output.totalTime} seconds`);
          console.log(`⚡ Average speed: ~${(totalAttempts / output.totalTime).toFixed(0)} keys/sec`);
          console.log(`📊 Average attempts per mint: ${output.averageAttempts.toLocaleString()}\n`);
          
          process.exit(0);
        }
      } else if (message.progress) {
        // Progress update (optional, can be noisy)
        // console.log(`[Worker ${message.workerId}] Progress: ${message.attempts.toLocaleString()} attempts (~${message.rate}/sec)`);
      }
    });

    worker.on('error', (error) => {
      console.error(`[Worker ${i}] Error:`, error);
    });

    workers.push(worker);
  }

  console.log(`🔄 ${NUM_WORKERS} workers started. Generating mints in parallel...\n`);
}

// Run worker function if in worker thread, otherwise run main
if (isMainThread) {
  generateVanityMintsPool().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
} else {
  workerFunction();
}

