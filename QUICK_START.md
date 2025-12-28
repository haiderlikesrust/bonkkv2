# 🚀 bonkv2.fun Backend - Quick Start

## 📁 Project Structure

```
bonkv2-fun/
├── backend/                 # Backend API
│   ├── config/             # Configuration
│   ├── services/           # Business logic
│   │   ├── pumpportal.js  # PumpPortal API integration
│   │   ├── wallet.js      # Wallet operations
│   │   └── auth.js        # Authentication
│   ├── routes/            # API routes
│   │   ├── auth.js        # Auth endpoints
│   │   ├── wallets.js     # Wallet endpoints
│   │   └── tokens.js      # Token endpoints
│   ├── middleware/        # Express middleware
│   ├── utils/             # Utilities
│   └── server.js          # Main server
├── generate-vanity-address.js  # Wallet creator (kept)
└── package.json
```

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Create `.env` File

```env
PORT=3001
NODE_ENV=development
PUMP_PORTAL_URL=https://pumpportal.fun
PUMP_PORTAL_API_KEY=  # Optional - get from pumpportal.fun
JWT_SECRET=your-secret-key-change-this
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### 3. Start Server

```bash
npm run dev
```

Server will run on `http://localhost:3001`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login with wallet
- `GET /api/auth/me` - Get current user

### Wallets
- `POST /api/wallets/create` - Create new wallet
- `POST /api/wallets/dev` - Create dev/test wallet
- `POST /api/wallets/import` - Import wallet (requires auth)

### Tokens (via PumpPortal)
- `GET /api/tokens/new` - Get new tokens
- `GET /api/tokens/:mint` - Get token data
- `POST /api/tokens/create` - Create token (Lightning API)
- `POST /api/tokens/create-local` - Create token (Local API)
- `POST /api/tokens/:mint/buy` - Buy tokens
- `POST /api/tokens/:mint/sell` - Sell tokens

## 🔧 PumpPortal API Integration

The backend uses [PumpPortal.fun](https://pumpportal.fun/) for all Pump.fun operations:

- **Lightning Transactions** - Fast, server-handled transactions
- **Local Transactions** - Build transactions to sign locally
- **Token Data** - Fetch token information from Pump.fun

**Note:** You may need to check PumpPortal documentation for exact endpoint structure and update `backend/services/pumpportal.js` accordingly.

## 🎯 Next Steps

1. **Test the API** - Use Postman or curl to test endpoints
2. **Configure PumpPortal** - Get API key if needed
3. **Update API endpoints** - Match PumpPortal API structure
4. **Add frontend** - Build React/Next.js frontend
5. **Deploy** - Deploy to production

## 🔑 Generate Vanity Wallet

```bash
npm run vanity
```

This will generate a wallet starting with "btcv2".

## 📚 Documentation

- [PumpPortal.fun Docs](https://pumpportal.fun/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Express.js](https://expressjs.com/)

