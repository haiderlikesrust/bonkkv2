import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { User, Bell, Shield, Palette, Globe, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B0F14' }}>
        <div className="text-center">
          <div className="text-white text-xl mb-4">Please login to access settings</div>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 btn-primary rounded-xl font-semibold"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    priceAlerts: true,
  });
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('en');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen" style={{ background: '#0B0F14' }}>
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400 text-sm">Manage your account and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-bold text-white">Profile</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 bg-dark-700 border border-gray-700 rounded-xl text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Wallet Address</label>
                <input
                  type="text"
                  value={user?.walletAddress ? `${user.walletAddress.slice(0, 8)}...${user.walletAddress.slice(-8)}` : 'Not connected'}
                  disabled
                  className="w-full px-4 py-3 bg-dark-700 border border-gray-700 rounded-xl text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-bold text-white">Notifications</h2>
            </div>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-sm font-medium text-white">Email Notifications</div>
                  <div className="text-xs text-gray-400">Receive updates via email</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                  className="rounded border-gray-700"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-sm font-medium text-white">Push Notifications</div>
                  <div className="text-xs text-gray-400">Browser push notifications</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.push}
                  onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
                  className="rounded border-gray-700"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-sm font-medium text-white">Price Alerts</div>
                  <div className="text-xs text-gray-400">Get notified when tokens hit target prices</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.priceAlerts}
                  onChange={(e) => setNotifications({ ...notifications, priceAlerts: e.target.checked })}
                  className="rounded border-gray-700"
                />
              </label>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <Palette className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-bold text-white">Appearance</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Theme</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-700 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>
          </div>

          {/* Language Section */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-bold text-white">Language</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-700 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-green-500"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-bold text-white">Security</h2>
            </div>
            <div className="space-y-4">
              <button className="w-full px-4 py-3 bg-dark-700 border border-gray-700 rounded-xl text-white text-sm hover:bg-dark-600 transition-colors text-left">
                Change Password
              </button>
              <button className="w-full px-4 py-3 bg-dark-700 border border-gray-700 rounded-xl text-white text-sm hover:bg-dark-600 transition-colors text-left">
                Two-Factor Authentication
              </button>
              <button className="w-full px-4 py-3 bg-dark-700 border border-gray-700 rounded-xl text-white text-sm hover:bg-dark-600 transition-colors text-left">
                Export Data
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card border-red-500/30">
            <div className="flex items-center gap-3 mb-6">
              <LogOut className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-bold text-white">Danger Zone</h2>
            </div>
            <div className="space-y-4">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm hover:bg-red-500/30 transition-colors"
              >
                Logout
              </button>
              <button className="w-full px-4 py-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm hover:bg-red-500/30 transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

