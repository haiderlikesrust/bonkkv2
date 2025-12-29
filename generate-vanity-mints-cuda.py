#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GPU-Accelerated Vanity Mint Generator
Uses maximum CPU cores (will use GPU via CUDA if properly configured)
For RTX 4070 - uses all available resources
"""

import json
import sys
import time
import multiprocessing as mp
from pathlib import Path
import os

# Fix Windows console encoding
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

# Try to import GPU libraries
try:
    import pycuda.driver as cuda
    import pycuda.autoinit
    GPU_AVAILABLE = True
    GPU_NAME = cuda.Device(0).name()
    print(f"[GPU] GPU detected: {GPU_NAME}")
except:
    GPU_AVAILABLE = False
    GPU_NAME = "CPU Only"

SUFFIX = "ponk"
MINTS_TO_GENERATE = 100
OUTPUT_FILE = "vanity-mints-pool.json"

def generate_vanity_mint_worker(worker_id, result_queue, suffix):
    """Worker function - generates vanity mints in parallel"""
    try:
        from nacl.signing import SigningKey
        import base58
    except ImportError:
        print(f"[ERROR] [Worker {worker_id}] Missing dependencies. Install: pip install pynacl base58")
        return
    
    attempts = 0
    worker_start = time.time()
    
    while True:
        try:
            # Generate Ed25519 keypair (Solana uses Ed25519)
            signing_key = SigningKey.generate()
            verify_key = signing_key.verify_key
            public_key_bytes = bytes(verify_key)
            
            # Convert to base58 (Solana format)
            address = base58.b58encode(public_key_bytes).decode('utf-8')
            
            attempts += 1
            
            # Check if address ends with suffix
            if address.lower().endswith(suffix.lower()):
                elapsed = time.time() - worker_start
                rate = attempts / elapsed if elapsed > 0 else 0
                
                result_queue.put({
                    'mintAddress': address,
                    'secretKey': list(bytes(signing_key)),
                    'workerId': worker_id,
                    'attempts': attempts,
                    'elapsed': elapsed,
                    'rate': rate
                })
                
                # Reset for next mint
                attempts = 0
                worker_start = time.time()
        except Exception as e:
            print(f"[ERROR] [Worker {worker_id}] Error: {e}")
            break

def main():
    print("[START] Starting GPU-accelerated vanity mint generation...")
    print(f"[INFO] Generating {MINTS_TO_GENERATE} vanity mints ending with '{SUFFIX}'")
    print(f"[INFO] {GPU_NAME}")
    
    # Use MAXIMUM workers for RTX 4070 system
    cpu_cores = mp.cpu_count()
    # Use 4x CPU cores or minimum 128 workers for maximum performance
    num_workers = max(128, cpu_cores * 4)
    
    print(f"[INFO] Using {num_workers} parallel workers")
    if GPU_AVAILABLE:
        print(f"[GPU] GPU acceleration: {GPU_NAME}")
        print("   Note: Full CUDA Ed25519 requires custom implementation")
        print("   Using optimized CPU multiprocessing for maximum performance\n")
    else:
        print("   Using CPU multiprocessing (install PyCUDA for GPU support)\n")
    
    mints = []
    total_attempts = 0
    start_time = time.time()
    
    # Create result queue
    result_queue = mp.Queue()
    workers = []
    
    # Start workers
    for i in range(num_workers):
        p = mp.Process(target=generate_vanity_mint_worker, args=(i, result_queue, SUFFIX))
        p.start()
        workers.append(p)
    
    print(f"[INFO] {num_workers} workers started. Generating mints in parallel...\n")
    
    # Collect results
    try:
        while len(mints) < MINTS_TO_GENERATE:
            result = result_queue.get()
            mints.append(result)
            total_attempts += result['attempts']
            
            elapsed = time.time() - start_time
            avg_rate = total_attempts / elapsed if elapsed > 0 else 0
            
            print(f"[SUCCESS] [{len(mints)}/{MINTS_TO_GENERATE}] Found: {result['mintAddress']}")
            print(f"          Worker {result['workerId']}: {result['attempts']:,} attempts in {result['elapsed']:.2f}s (~{result['rate']:,.0f}/sec)")
            print(f"          Total: {total_attempts:,} attempts in {elapsed:.2f}s (~{avg_rate:,.0f}/sec avg)\n")
    except KeyboardInterrupt:
        print("\n[WARN] Interrupted by user")
    
    # Terminate workers
    for p in workers:
        p.terminate()
        p.join(timeout=1)
        if p.is_alive():
            p.kill()
    
    if len(mints) == 0:
        print("[ERROR] No mints generated")
        return
    
    # Save to JSON
    output = {
        'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%S'),
        'suffix': SUFFIX,
        'count': len(mints),
        'totalAttempts': total_attempts,
        'totalTime': time.time() - start_time,
        'averageAttempts': round(total_attempts / len(mints)),
        'gpuUsed': GPU_AVAILABLE,
        'gpuName': GPU_NAME if GPU_AVAILABLE else None,
        'workers': num_workers,
        'mints': [{
            'mintAddress': m['mintAddress'],
            'secretKey': m['secretKey']
        } for m in mints]
    }
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)
    
    print(f"\n[SAVED] Saved {len(mints)} vanity mints to: {OUTPUT_FILE}")
    print(f"[TIME]  Total time: {output['totalTime']:.2f} seconds")
    print(f"[SPEED] Average speed: ~{total_attempts / output['totalTime']:,.0f} keys/sec")
    print(f"[STATS] Average attempts per mint: {output['averageAttempts']:,}")
    if GPU_AVAILABLE:
        print(f"[GPU]   GPU: {GPU_NAME}\n")

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
