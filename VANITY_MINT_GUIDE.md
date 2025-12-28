# 🎯 Vanity Mint Address Generation Guide

## Overview

This guide explains how to generate Solana token mint addresses that end with "bonk" (or any other suffix).

## ✅ Is It Possible?

**Yes!** Platforms like Bonk.fun generate all their token mint addresses ending with "bonk". This is done through **vanity address generation**.

## 📊 Difficulty & Time Estimates

For a **4-character suffix like "bonk"**:

- **Probability**: ~1 in 58^4 = **~11.3 million attempts** on average
- **CPU Speed**: ~10,000-50,000 keys/sec → **4-19 minutes** average
- **GPU Speed**: ~500,000-2,000,000 keys/sec → **6-23 seconds** average

## 🚀 Methods

### Method 1: Local CPU Generation (Script Included)

Use the `generate-vanity-mint.js` script:

```bash
node generate-vanity-mint.js
```

This will:
- Generate a mint keypair ending with "bonk"
- Save it to `vanity-mint-bonk.json`
- Take approximately 4-19 minutes on CPU

### Method 2: API Service (Recommended for Production)

Use a service like **addresses.fun** API for faster generation:

```javascript
// Example API call
const response = await fetch('https://api.addresses.fun/vanity?ending=bonk');
const { publicKey, secretKey } = await response.json();
```

This is much faster but may have costs/rate limits.

### Method 3: GPU-Accelerated Generation

For production use, consider:
- **Solana Vanity Address Generator** (GPU version)
- **Custom GPU implementation** using CUDA/OpenCL
- **Cloud GPU services** (AWS, Google Cloud)

## 🔧 Integration into Token Creation

### Option A: Pre-generate Pool of Vanity Mints

1. Generate multiple vanity mints in advance
2. Store them securely (encrypted database)
3. Use one when creating a token
4. Replenish the pool as needed

**Pros**: Fast token creation, no user waiting
**Cons**: Requires storage and pool management

### Option B: Generate On-Demand (Current Implementation)

1. User clicks "Create Token"
2. Show loading state: "Generating vanity mint address..."
3. Generate vanity mint (takes 4-19 minutes)
4. Continue with token creation

**Pros**: No pre-generation needed
**Cons**: User must wait 4-19 minutes

### Option C: Hybrid Approach (Recommended)

1. Pre-generate a small pool (10-50 vanity mints)
2. Use from pool if available
3. If pool is empty, generate on-demand
4. Background process replenishes pool

## 📝 Implementation Steps

### 1. Generate Vanity Mint Script

The script `generate-vanity-mint.js` is already created. Run it:

```bash
node generate-vanity-mint.js
```

### 2. Modify Token Creation Flow

**Frontend** (`CreateToken.jsx`):
- Add option to "Generate vanity mint ending with 'bonk'"
- Show progress indicator during generation
- Store the generated mint keypair

**Backend** (`routes/tokens.js`):
- Accept custom mint keypair (instead of generating randomly)
- Use the provided mint keypair in `pumpPortalService.getCreateTokenTransaction()`

### 3. Update PumpPortal Service

Ensure `getCreateTokenTransaction()` accepts and uses a custom mint keypair.

## 🔒 Security Considerations

1. **Mint Authority**: The mint keypair is sensitive - it controls the mint authority
2. **Storage**: Store vanity mints encrypted in database
3. **Access Control**: Only authorized services should access mint keypairs
4. **Backup**: Always backup generated mints securely

## 📈 Performance Optimization

For production use:

1. **Use GPU acceleration** (10-100x faster)
2. **Pre-generate pools** of vanity mints
3. **Use API services** for on-demand generation
4. **Background generation** to maintain pool levels

## 🎨 User Experience

### With Pre-generated Pool:
- Token creation is instant (no waiting)
- Better UX

### With On-demand Generation:
- Show progress: "Generating mint address... (this may take 5-15 minutes)"
- Allow user to cancel and use random mint
- Show estimated time remaining

## 📚 Resources

- [Solana Vanity Address Generation](https://solana.stackexchange.com/questions/22664/how-do-launchpads-generate-vanity-addresses)
- [addresses.fun API Documentation](https://docs.addresses.fun/)
- [Bonk.fun](https://bonk.fun) - Example platform using vanity mints

## 🚀 Quick Start

1. Generate a vanity mint:
   ```bash
   node generate-vanity-mint.js
   ```

2. The mint keypair will be saved to `vanity-mint-bonk.json`

3. Use the secret key when creating tokens:
   ```javascript
   const keypair = Keypair.fromSecretKey(secretKey);
   const mintAddress = keypair.publicKey.toBase58(); // Ends with "bonk"
   ```

