import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * GPU-Accelerated Vanity Mint Generator
 * Uses Python with PyCUDA for RTX 4070 GPU acceleration
 * Falls back to maximum CPU workers if GPU unavailable
 */
const PYTHON_SCRIPT = path.join(__dirname, 'generate-vanity-mints-cuda.py');

console.log('🚀 Starting GPU-accelerated vanity mint generation...');
console.log('🎮 Attempting to use RTX 4070 GPU via CUDA...\n');

// Check if Python script exists
if (!fs.existsSync(PYTHON_SCRIPT)) {
  console.error('❌ Python CUDA script not found. Please ensure generate-vanity-mints-cuda.py exists.');
  process.exit(1);
}

// Use 'py' launcher on Windows, 'python3' on Linux/Mac
const pythonCmd = process.platform === 'win32' ? 'py' : 'python3';

// Run Python script
const python = spawn(pythonCmd, [PYTHON_SCRIPT], {
  stdio: 'inherit',
  shell: true,
});

python.on('error', (error) => {
  console.error('❌ Error running Python script:', error);
  console.error('\n💡 Make sure Python 3 is installed and PyCUDA is available:');
  console.error('   pip install pycuda numpy pynacl base58');
  process.exit(1);
});

python.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ GPU generation completed successfully!');
    console.log('📂 Check vanity-mints-pool.json for results');
  } else {
    console.error(`\n❌ Python script exited with code ${code}`);
    process.exit(code);
  }
});

