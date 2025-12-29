# 💰 Automatic Fee Collection System

This system automatically collects creator fees from tokens and distributes them according to the configured fee distribution settings.

## 🔄 How It Works

1. **Runs Every Hour**: The system automatically collects fees every 1 hour
2. **Collects Creator Fees**: Uses PumpPortal API to collect creator fees for each token
3. **Distributes Fees**: Splits collected fees according to token's fee distribution settings:
   - **Holders** (e.g., 30%): Distributed equally among top 10 token holders
   - **Dev** (e.g., 30%): Sent to creator's wallet
   - **Flywheel** (e.g., 10%): Used to buy back the token (buyback)
   - **Support PONK** (e.g., 10%): Used to buy PONK token

## 📊 Fee Distribution Example

If **10 SOL** is collected and distribution is:
- **Holders: 30%** → 3 SOL split equally among top 10 holders (0.3 SOL each)
- **Dev: 30%** → 3 SOL sent to creator wallet
- **Flywheel: 10%** → 1 SOL used for token buyback
- **Support PONK: 10%** → 1 SOL used to buy PONK

## 🚀 Setup

### 1. Fee Collection Status

Fee collection is **enabled by default** and runs automatically every hour.

To disable fee collection, set:
```bash
DISABLE_FEE_COLLECTION=true npm start
```

### 2. Manual Trigger

You can manually trigger fee collection via API:

```bash
POST /api/tokens/collect-fees
Authorization: Bearer <your-jwt-token>
```

## 🔧 Configuration

Fee distribution is set per token in the `fee_distribution` column of the `tokens` table:

```json
{
  "holders": 30,
  "dev": 30,
  "flywheel": 10,
  "supportPonk": 10
}
```

Percentages should add up to 100% (or less if you want some fees to remain unclaimed).

## 📝 Implementation Details

### Files

- `backend/services/feeCollection.js` - Main fee collection service
- `backend/server.js` - Starts automatic collection on server startup
- `backend/routes/tokens.js` - Manual trigger endpoint

### Process Flow

1. **collectAllFees()**: Gets all tokens from database
2. For each token:
   - **collectCreatorFees()**: Collects fees using PumpPortal API
   - **getTopHolders()**: Gets top 10 token holders
   - **sendSOL()**: Sends SOL to holders and dev wallet
   - **buyToken()**: Buys token for flywheel buyback
   - **buyPONK()**: Buys PONK token for support

### Top Holders

The system uses Solana RPC to get token holders. It:
- Queries all token accounts for the mint
- Sorts by balance (highest first)
- Takes top 10 holders
- Splits holder fees equally among them

**Note**: For production, consider using a dedicated token holder API for better performance.

## ⚠️ Important Notes

1. **Private Keys Required**: The system needs the creator's private key stored in the database to sign transactions
2. **Balance Calculation**: The system checks balance before/after collection to determine collected amount
3. **Error Handling**: If collection fails for one token, it continues with others
4. **Rate Limiting**: PumpPortal API may have rate limits - adjust collection interval if needed
5. **SOL Balance**: Creator wallet must have enough SOL for transaction fees

## 🐛 Troubleshooting

### Fees Not Collecting

- Check if creator private key is stored: `GET /api/auth/private-key`
- Verify wallet has SOL for transaction fees
- Check backend logs for errors
- Ensure `ENABLE_FEE_COLLECTION=true` or running in production mode

### Top Holders Not Found

- Token may not have holders yet
- RPC connection issues - check `SOLANA_RPC_URL` in `.env`
- Token mint address may be invalid

### Distribution Fails

- Check wallet SOL balance for distributions
- Verify fee distribution percentages are valid (0-100)
- Check transaction signatures in Solscan logs

## 📊 Monitoring

The service logs all operations:
- ✅ Successful collections and distributions
- ❌ Errors and failures
- 📊 Summary after each run (successful/failed tokens)

Check backend console logs for detailed information.

