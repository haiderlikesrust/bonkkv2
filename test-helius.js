import dotenv from 'dotenv';
import { Connection, PublicKey } from '@solana/web3.js';

dotenv.config();

/**
 * Test Helius API Key
 * Verifies that your Helius RPC connection is working
 */

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '1b8db865-a5a1-4535-9aec-01061440523b';
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

async function testHeliusConnection() {
  console.log('🔍 Testing Helius API Key...\n');
  console.log(`API Key: ${HELIUS_API_KEY.substring(0, 8)}...${HELIUS_API_KEY.substring(HELIUS_API_KEY.length - 4)}\n`);

  try {
    // Create connection
    const connection = new Connection(HELIUS_RPC_URL, {
      commitment: 'confirmed',
    });

    console.log('📡 Connecting to Helius RPC...');
    console.log(`URL: ${HELIUS_RPC_URL.replace(HELIUS_API_KEY, '***')}\n`);

    // Test 1: Get latest block height
    console.log('Test 1: Getting latest block height...');
    const blockHeight = await connection.getBlockHeight();
    console.log(`✅ Block height: ${blockHeight.toLocaleString()}\n`);

    // Test 2: Get slot
    console.log('Test 2: Getting current slot...');
    const slot = await connection.getSlot();
    console.log(`✅ Current slot: ${slot.toLocaleString()}\n`);

    // Test 3: Get version
    console.log('Test 3: Getting Solana version...');
    const version = await connection.getVersion();
    console.log(`✅ Solana version: ${version['solana-core']}\n`);

    // Test 4: Get balance of a known address (System Program)
    console.log('Test 4: Getting balance of System Program...');
    const systemProgram = new PublicKey('11111111111111111111111111111111');
    const balance = await connection.getBalance(systemProgram);
    console.log(`✅ System Program balance: ${balance / 1e9} SOL\n`);

    // Test 5: Get recent blockhash
    console.log('Test 5: Getting recent blockhash...');
    const { blockhash } = await connection.getLatestBlockhash();
    console.log(`✅ Recent blockhash: ${blockhash.substring(0, 16)}...\n`);

    // Test 6: Get health status
    console.log('Test 6: Checking health status...');
    const health = await connection.getHealth();
    console.log(`✅ Health status: ${health}\n`);

    console.log('🎉 All tests passed! Your Helius API key is working correctly.\n');
    console.log('📊 Summary:');
    console.log(`   - RPC Endpoint: ✅ Connected`);
    console.log(`   - Block Height: ✅ ${blockHeight.toLocaleString()}`);
    console.log(`   - Current Slot: ✅ ${slot.toLocaleString()}`);
    console.log(`   - Health: ✅ ${health}`);
    console.log(`   - API Key: ✅ Valid\n`);

    return true;
  } catch (error) {
    console.error('❌ Error testing Helius connection:\n');
    console.error(`   Error: ${error.message}`);
    
    if (error.message.includes('401') || error.message.includes('403')) {
      console.error('\n   ⚠️  This looks like an authentication error.');
      console.error('   Please check if your API key is correct.');
    } else if (error.message.includes('timeout')) {
      console.error('\n   ⚠️  Connection timeout.');
      console.error('   Please check your internet connection.');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('\n   ⚠️  Could not reach Helius RPC endpoint.');
      console.error('   Please check the RPC URL.');
    }
    
    console.error('\n');
    return false;
  }
}

// Run test
testHeliusConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

