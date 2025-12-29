import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, TrendingUp, Clock } from 'lucide-react';
import { getNewTokens } from '../services/api.js';
import TokenCard from '../components/TokenCard.jsx';
import Sidebar from '../components/Sidebar.jsx';
import RightRail from '../components/RightRail.jsx';

export default function Watchlist() {
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState([]);
  const [allTokens, setAllTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('watchlist');
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading watchlist:', e);
      }
    }
  }, []);

  // Load all tokens to match with watchlist
  useEffect(() => {
    const loadTokens = async () => {
      try {
        setLoading(true);
        const response = await getNewTokens(100);
        const tokens = response.data?.tokens || [];
        setAllTokens(tokens);
      } catch (error) {
        console.error('Error loading tokens:', error);
        setAllTokens([]);
      } finally {
        setLoading(false);
      }
    };
    loadTokens();
  }, []);

  // Get watchlist tokens
  const watchlistTokens = allTokens.filter(token => 
    watchlist.includes(token.mint)
  );

  const removeFromWatchlist = (mint) => {
    const updated = watchlist.filter(m => m !== mint);
    setWatchlist(updated);
    localStorage.setItem('watchlist', JSON.stringify(updated));
  };

  return (
    <div className="flex min-h-screen" style={{ background: '#0B0F14' }}>
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        {/* Header */}
        <div className="border-b border-gray-700" style={{ 
          background: 'linear-gradient(180deg, #0B0F14 0%, #0F1419 100%)'
        }}>
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              <h1 className="text-4xl font-bold text-white">Watchlist</h1>
            </div>
            <p className="text-gray-400 text-sm">
              {watchlistTokens.length} {watchlistTokens.length === 1 ? 'token' : 'tokens'} in your watchlist
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="h-32 bg-dark-700 rounded-lg mb-3"></div>
                  <div className="h-4 bg-dark-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-dark-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : watchlistTokens.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-dark-800 flex items-center justify-center border border-gray-700">
                <Star className="w-10 h-10 text-gray-600" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Your watchlist is empty</h2>
              <p className="text-gray-400 mb-6">Start adding tokens to track their performance</p>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 btn-primary rounded-xl font-semibold"
              >
                Explore Tokens
              </button>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="card p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-gray-400">Total Value</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    ${watchlistTokens.reduce((sum, t) => sum + (t.marketCap || t.usd_market_cap || 0), 0).toLocaleString()}
                  </div>
                </div>
                <div className="card p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span className="text-sm text-gray-400">New Today</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {watchlistTokens.filter(t => {
                      const created = t.createdAt || t.created_at;
                      if (!created) return false;
                      const createdDate = new Date(created);
                      const today = new Date();
                      return createdDate.toDateString() === today.toDateString();
                    }).length}
                  </div>
                </div>
                <div className="card p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <span className="text-sm text-gray-400">Watching</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {watchlistTokens.length}
                  </div>
                </div>
              </div>

              {/* Watchlist Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {watchlistTokens.map((token, index) => (
                  <div key={token.mint || index} className="relative">
                    <TokenCard token={token} isCompact />
                    <button
                      onClick={() => removeFromWatchlist(token.mint)}
                      className="absolute top-3 right-3 z-10 p-2 bg-dark-900/80 backdrop-blur-sm rounded-full border border-gray-700 hover:bg-red-500/20 hover:border-red-500/50 transition-colors"
                      title="Remove from watchlist"
                    >
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Right Rail */}
      <RightRail tokens={allTokens} />
    </div>
  );
}

