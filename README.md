# 🚀 ponk.fun Backend

Backend API for ponk.fun using [PumpPortal.fun](https://pumpportal.fun/) Local Transaction API.

## 📋 Features

- ✅ **Token Creation** - Create tokens on Pump.fun using Local Transaction API
- ✅ **Token Trading** - Buy/sell tokens via PumpPortal Local API (returns transactions to sign)
- ✅ **Wallet Management** - Generate and manage Solana wallets
- ✅ **Email/Password Authentication** - Traditional email/password auth with JWT
- ✅ **Account Creation** - User account creation with email/password
- ✅ **Wallet Connection** - Connect wallet to user account

## 🏗️ Architecture

```
backend/
├── server.js          # Main Express server
├── config/
│   └── config.js      # Configuration
├── services/
│   ├── pumpportal.js  # PumpPortal Local API integration
│   ├── wallet.js      # Wallet operations
│   ├── auth.js        # Authentication (email/password + JWT)
│   └── user.js        # User management
├── routes/
│   ├── auth.js        # Authentication routes (register/login)
│   ├── wallets.js     # Wallet routes
│   └── tokens.js      # Token routes (Local API)
├── middleware/
│   └── auth.js        # Auth middleware
└── utils/
    └── logger.js      # Logging utility
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file:

```env
PORT=3001
NODE_ENV=development
PUMP_PORTAL_URL=https://pumpportal.fun
PUMP_PORTAL_API_KEY=  # Optional
HELIUS_API_KEY=1b8db865-a5a1-4535-9aec-01061440523b
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=1b8db865-a5a1-4535-9aec-01061440523b
JWT_SECRET=your-secret-key-change-this
```

### 3. Start Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

## 📡 API Endpoints

### Authentication (Email/Password)

- `POST /api/auth/register` - Register with email/password
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/connect-wallet` - Connect wallet to account (requires auth)
- `GET /api/auth/me` - Get current user (requires auth)

### Wallets

- `POST /api/wallets/create` - Create new wallet
- `POST /api/wallets/dev` - Create dev/test wallet
- `POST /api/wallets/import` - Import wallet (requires auth)

### Tokens (Local Transaction API)

- `GET /api/tokens/new` - Get new tokens created on our platform
- `GET /api/tokens/:mint` - Get token data from our platform
- `GET /api/tokens/my` - Get tokens created by current user (requires auth)
- `POST /api/tokens/upload-image` - Upload image to IPFS (required for token creation)
- `POST /api/tokens/create` - Create token (stores in DB + returns transaction to sign)
- `POST /api/tokens/:mint/buy` - Get buy transaction (Local API)
- `POST /api/tokens/:mint/sell` - Get sell transaction (Local API)

**Important**: Only tokens created through our platform are listed. We don't list all Pump.fun tokens.

## 🔧 PumpPortal Local Transaction API

This backend uses [PumpPortal.fun Local Transaction API](https://pumpportal.fun/local-trading-api/trading-api):

- **Local Transactions** - Returns serialized transactions to sign and send yourself
- **Token Creation** - [Token Creation API](https://pumpportal.fun/creation)
- **Buy/Sell** - Trading API returns transactions for signing

**Important:** All transactions are returned as serialized data that you must:
1. Deserialize
2. Sign with your wallet
3. Send to Solana RPC

## 📝 Usage Examples

### Register Account

```bash
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Login

```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Connect Wallet

```bash
POST /api/auth/connect-wallet
Headers: Authorization: Bearer <token>
{
  "secretKey": [1,2,3,...]
}
```

### Get Buy Transaction

```bash
POST /api/tokens/<mint>/buy
Headers: Authorization: Bearer <token>
{
  "publicKey": "your-wallet-address",
  "amount": 0.1,
  "denominatedInSol": "true",
  "slippage": 10,
  "priorityFee": 0.00001,
  "pool": "auto"
}
```

Returns serialized transaction that you need to sign and send.

## 🔒 Security

- ⚠️ **Passwords are hashed** using bcrypt
- ⚠️ **JWT tokens** for authentication
- ⚠️ **Never expose secret keys** in API responses after initial creation
- ⚠️ **Change JWT_SECRET** in production
- ⚠️ **Use HTTPS** in production
- ⚠️ **Replace in-memory user storage** with database in production

## 🗄️ Database

Uses **SQLite** for data storage:
- **users.db** - User accounts (email/password)
- **tokens.db** - Tokens created on our platform

**Important**: Only tokens created through our platform are stored and listed. We act as a Pump.fun wrapper - tokens created here are stored in our database and shown in listings.

## 🎯 Generate Vanity Wallet

```bash
npm run vanity
```

This will generate a wallet address starting with "btcv2".

## 📚 Documentation

- [PumpPortal.fun Local Trading API](https://pumpportal.fun/local-trading-api/trading-api)
- [PumpPortal.fun Token Creation](https://pumpportal.fun/creation)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Express.js](https://expressjs.com/)

## 📝 Notes

- All PumpPortal endpoints use **Local Transaction API** (not Lightning)
- Transactions are returned as serialized data for client-side signing
- Image uploads required before token creation (uses Pump.fun IPFS)
- User authentication is email/password based (not wallet-based)
