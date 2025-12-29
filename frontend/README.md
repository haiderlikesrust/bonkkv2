# PONK Frontend

Frontend for PONK.fun - A modern token launch platform inspired by BONKfun.

## Features

- 🎨 Modern dark UI similar to BONKfun
- 🔐 Email/Password authentication (not wallet-based)
- 🔥 Hot Projects section
- ⭐ Featured Coins section
- 🔍 Search and filter tokens
- 📱 Responsive design

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- React Router
- Axios
- Lucide React (icons)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
VITE_API_URL=http://localhost:3001
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── Header.jsx        # Navigation header
│   └── TokenCard.jsx     # Token display card
├── pages/
│   ├── Home.jsx          # Main page
│   ├── Login.jsx         # Login page
│   └── Register.jsx      # Registration page
├── contexts/
│   └── AuthContext.jsx   # Authentication context
├── services/
│   └── api.js            # API client
├── App.jsx               # Main app component
└── main.jsx              # Entry point
```

