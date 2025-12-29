# 🪙 Token Storage System

## Overview

PONK.fun is a **Pump.fun wrapper** - we only list and display tokens that are created through our platform. All tokens created via our API are stored in our SQLite database.

## How It Works

### Token Creation Flow

1. **User creates token** via `POST /api/tokens/create`
2. **Token stored in database** (`tokens.db`) BEFORE transaction is created
3. **Transaction returned** to user for signing
4. **User signs and sends** transaction to Solana
5. **Token appears** in our listings (`GET /api/tokens/new`)

### Database Schema

**tokens table:**
- `id` - Primary key
- `mint` - Token mint address (UNIQUE)
- `name` - Token name
- `symbol` - Token symbol
- `description` - Token description
- `image_url` - Token image URL
- `metadata_uri` - IPFS metadata URI
- `creator_user_id` - User who created the token
- `creator_wallet` - Wallet address of creator
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp
- `market_cap` - Market cap (can be updated)
- `progress` - Progress percentage (can be updated)
- `twitter` - Twitter link
- `telegram` - Telegram link
- `website` - Website link

## API Endpoints

### Create Token
```
POST /api/tokens/create
```
- Stores token in database
- Returns transaction for signing
- Token will appear in listings once stored

### Get New Tokens
```
GET /api/tokens/new
```
- Returns tokens from our database ONLY
- Only tokens created on our platform
- Sorted by newest first

### Get Token Data
```
GET /api/tokens/:mint
```
- Returns token data from our database
- Returns 404 if token not found (not created on our platform)

### Get My Tokens
```
GET /api/tokens/my
```
- Returns tokens created by current user
- Requires authentication

## Important Notes

1. **We don't list all Pump.fun tokens** - only tokens created through our platform
2. **Token is stored immediately** when creation API is called (before transaction)
3. **Database is the source of truth** for what tokens we display
4. **Mint address must be unique** - prevents duplicates

## Future Enhancements

- Update market cap/progress from Solana on-chain data
- Sync token status (active/completed/closed)
- Track token metrics (volume, holders, etc.)
- Add token categories/tags

