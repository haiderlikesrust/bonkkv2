import axios from 'axios';

const PUMP_FUN_API_BASE = 'https://frontend-api-v3.pump.fun';
const TEST_MINT = '9V7jznWgdN6tjMaJ6Bq11ZVQMkza6Zh45atgXbVmpump'; // Example token from research

/**
 * Test script to discover Pump.fun chart/trading data endpoints
 */
async function testEndpoints() {
  console.log('🔍 Testing Pump.fun API endpoints for chart data...\n');
  console.log(`Test Token: ${TEST_MINT}\n`);

  const endpointsToTest = [
    `/coins/${TEST_MINT}/trades`,
    `/coins/${TEST_MINT}/chart`,
    `/coins/${TEST_MINT}/history`,
    `/coins/${TEST_MINT}/candles`,
    `/coins/${TEST_MINT}/price-history`,
    `/trades?mint=${TEST_MINT}`,
    `/chart/${TEST_MINT}`,
    `/history/${TEST_MINT}`,
  ];

  for (const endpoint of endpointsToTest) {
    try {
      console.log(`Testing: ${endpoint}`);
      const response = await axios.get(`${PUMP_FUN_API_BASE}${endpoint}`, {
        timeout: 5000,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });

      if (response.status === 200) {
        console.log(`✅ SUCCESS (${response.status})`);
        console.log('Response structure:', Object.keys(response.data));
        if (Array.isArray(response.data)) {
          console.log(`Array length: ${response.data.length}`);
          if (response.data.length > 0) {
            console.log('First item keys:', Object.keys(response.data[0]));
            console.log('First item sample:', JSON.stringify(response.data[0], null, 2).slice(0, 200));
          }
        } else {
          console.log('Response sample:', JSON.stringify(response.data, null, 2).slice(0, 500));
        }
      } else {
        console.log(`❌ Status ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (error.response) {
        console.log(`❌ Error ${error.response.status}: ${error.response.statusText}`);
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    console.log('---\n');
  }

  console.log('\n📝 Next steps:');
  console.log('1. Check Pump.fun website network requests');
  console.log('2. If no endpoints found, consider third-party APIs (Moralis, Yodao)');
  console.log('3. Or build from on-chain transaction data');
}

testEndpoints().catch(console.error);

