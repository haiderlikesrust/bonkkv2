# 🎨 PONK Frontend Setup

Frontend for ponk.fun - Similar to BONKfun but with email/password authentication.

## ✅ What's Created

### Pages
- **Home** - Main landing page with Hot Projects and Featured Coins
- **Login** - Email/password login page
- **Register** - Account registration page

### Components
- **Header** - Navigation with login/logout (replaces "Connect Wallet")
- **TokenCard** - Token display card component

### Features
- 🔐 Email/password authentication (not wallet-based)
- 🔥 Hot Projects section (similar to BONKfun)
- ⭐ Featured Coins section
- 🔍 Search and filter bar
- 🎨 Dark theme with orange/yellow accents
- 📱 Responsive design

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
```

### 3. Start Development Server

```bash
npm run dev
```

Frontend will run on `http://localhost:5173` (default Vite port)

## 📁 Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Header.jsx        # Navigation header
│   │   └── TokenCard.jsx     # Token card component
│   ├── pages/
│   │   ├── Home.jsx          # Main page
│   │   ├── Login.jsx         # Login page
│   │   └── Register.jsx      # Register page
│   ├── contexts/
│   │   └── AuthContext.jsx   # Auth state management
│   ├── services/
│   │   └── api.js            # API client
│   ├── App.jsx               # Main app
│   ├── main.jsx              # Entry point
│   └── index.css             # Global styles
└── package.json
```

## 🎨 Design

- **Colors**: Dark theme with orange (#FF6B35) and yellow (#F7931E) accents
- **Typography**: Bold headings, clean sans-serif
- **Layout**: Similar to BONKfun with Hot Projects banner and Featured Coins grid

## 🔌 API Integration

The frontend connects to the backend API at `http://localhost:3001`:

- **Auth**: `/api/auth/register`, `/api/auth/login`
- **Tokens**: `/api/tokens/new`, `/api/tokens/:mint`
- **Wallets**: `/api/wallets/create` (for wallet generation if needed)

## 📝 Next Steps

1. **Connect Wallet Feature**: Add ability to connect wallet after login
2. **Token Details Page**: Create detail page for individual tokens
3. **Create Token**: Add token creation page
4. **User Profile**: Add user profile/dashboard page
5. **Real Data**: Connect to actual token data from Pump.fun API

## 🔧 Customization

- **Brand Colors**: Edit `tailwind.config.js` colors
- **API URL**: Update `.env` file
- **Styling**: Modify `src/index.css` for global styles

---

**Ready to launch! 🚀**

