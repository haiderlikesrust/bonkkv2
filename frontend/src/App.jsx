import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import Header from './components/Header.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import TokenDetail from './pages/TokenDetail.jsx';
import Wallets from './pages/Wallets.jsx';
import CreateToken from './pages/CreateToken.jsx';
import Portfolio from './pages/Portfolio.jsx';
import Settings from './pages/Settings.jsx';
import Watchlist from './pages/Watchlist.jsx';

function App() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Always use dark theme
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-dark-900">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/*"
              element={
                <>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/token/:mint" element={<><Header isDark={isDark} setIsDark={setIsDark} /><TokenDetail /></>} />
                    <Route path="/wallets" element={<><Header isDark={isDark} setIsDark={setIsDark} /><Wallets /></>} />
                    <Route path="/create" element={<><Header isDark={isDark} setIsDark={setIsDark} /><CreateToken /></>} />
                    <Route path="/portfolio" element={<><Header isDark={isDark} setIsDark={setIsDark} /><Portfolio /></>} />
                    <Route path="/watchlist" element={<><Header isDark={isDark} setIsDark={setIsDark} /><Watchlist /></>} />
                    <Route path="/settings" element={<><Header isDark={isDark} setIsDark={setIsDark} /><Settings /></>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

