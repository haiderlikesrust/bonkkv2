# Fee Collection System Updates

## ✅ Changes Made

### 1. Top 10 Holders Distribution
- **Fixed**: `getTopHolders()` now correctly uses `mintPubkey.toBuffer()` instead of base58 string for memcmp filter
- **Improved**: Added better error handling and logging for holder distribution
- **Status**: ✅ Working - distributes fees equally among top 10 holders

### 2. Flywheel (Buyback)
- **Status**: ✅ Working - uses token fees to buy back the token itself
- **How it works**: Takes the flywheel percentage of collected fees and buys the token using PumpPortal API

### 3. BONKv2 Support
- **Updated**: Now buys a configurable token (from `.env`) instead of hardcoded BONK
- **Configuration**: Requires `BONKV2_TOKEN_CA` and `BONKV2_DEV_WALLET` in `.env`
- **Status**: ⚠️ Token purchase works, but automatic transfer to dev wallet needs implementation

## 🔧 Environment Variables Required

Add these to `backend/.env`:

```env
# BONKv2 Support Configuration
BONKV2_TOKEN_CA=YourTokenContractAddressHere
BONKV2_DEV_WALLET=YourDevWalletAddressHere
```

## 📝 Implementation Notes

### Top 10 Holders
- Uses Solana RPC `getParsedProgramAccounts` to find all token accounts
- Filters by mint address at offset 0
- Sorts by balance (highest first)
- Takes top 10 and distributes fees equally

### Flywheel
- Uses collected token fees to buy back the same token
- Creates buy pressure and supports token price
- Uses PumpPortal API for token purchase

### BONKv2 Support
- Buys the token specified in `BONKV2_TOKEN_CA`
- Currently purchases tokens into the creator's wallet
- **TODO**: Implement automatic transfer to `BONKV2_DEV_WALLET` after purchase
  - Need to:
    1. Get token account for purchased tokens
    2. Get or create token account for dev wallet
    3. Transfer tokens using SPL Token Program

## 🚀 Usage

The fee collection runs automatically every hour. It will:
1. Collect creator fees
2. Distribute to top 10 holders (if configured)
3. Send to dev wallet (if configured)
4. Buy back token for flywheel (if configured)
5. Buy BONKv2 support token (if configured)

## ⚠️ Important

- Make sure `BONKV2_TOKEN_CA` and `BONKV2_DEV_WALLET` are set in `.env` for BONKv2 support to work
- The creator wallet needs enough SOL for transaction fees
- Top holders distribution requires the token to have holders

