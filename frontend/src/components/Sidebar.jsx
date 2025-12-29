import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Star, Rocket, Settings, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    { path: '/', icon: Home, label: 'Explore' },
    { path: '/watchlist', icon: Star, label: 'Watchlist' },
    ...(user ? [{ path: '/portfolio', icon: Rocket, label: 'My Launches' }] : []),
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-64 bg-dark-800 border-r border-gray-700 h-screen sticky top-0 overflow-y-auto">
      <div className="p-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="PONK Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-xl font-bold text-white">PONK</span>
        </Link>

        {/* Navigation */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

