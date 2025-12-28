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
                  <Header isDark={isDark} setIsDark={setIsDark} />
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/token/:mint" element={<TokenDetail />} />
                    <Route path="/wallets" element={<Wallets />} />
                    <Route path="/create" element={<CreateToken />} />
                    <Route path="/portfolio" element={<Portfolio />} />
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

