import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Flame, Sparkles } from 'lucide-react';
import { getNewTokens } from '../services/api.js';
import TokenCard from '../components/TokenCard.jsx';

export default function Home() {
  const location = useLocation();
  const [allTokens, setAllTokens] = useState([]);
  const [hotProjects, setHotProjects] = useState([]);
  const [featuredCoins, setFeaturedCoins] = useState([]);
  const [filteredCoins, setFilteredCoins] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadTokens = React.useCallback(async () => {
    try {
      setLoading(true);
      // Load a large number of tokens to show all available
      const response = await getNewTokens(100);
      const tokens = response.data?.tokens || [];
      
      console.log(`[Home] Loaded ${tokens.length} tokens from backend`);
      
      setAllTokens(tokens);
      // Hot projects (first 4)
      const hotProjectsList = tokens.slice(0, Math.min(4, tokens.length));
      setHotProjects(hotProjectsList);
      // Featured coins (all tokens)
      setFeaturedCoins(tokens);
      setFilteredCoins(tokens);
    } catch (error) {
      console.error('Error loading tokens:', error);
      // Use mock data on error
      setAllTokens([]);
      setHotProjects([]);
      setFeaturedCoins([]);
      setFilteredCoins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter featured coins based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCoins(featuredCoins);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = featuredCoins.filter(token => {
        const name = (token.name || '').toLowerCase();
        const symbol = (token.symbol || '').toLowerCase();
        const mint = (token.mint || '').toLowerCase();
        return name.includes(query) || symbol.includes(query) || mint.includes(query);
      });
      setFilteredCoins(filtered);
    }
  }, [searchQuery, featuredCoins]);

  useEffect(() => {
    // Only reload if we're actually on the home page
    if (location.pathname === '/') {
      loadTokens();
    }
  }, [location.pathname, loadTokens]); // Reload tokens when route changes to home

  useEffect(() => {
    // Refresh tokens when page becomes visible again (user navigates back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && location.pathname === '/') {
        loadTokens();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also refresh when the page gains focus (user switches back to tab)
    const handleFocus = () => {
      if (location.pathname === '/') {
        loadTokens();
      }
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [location.pathname, loadTokens]);

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent mb-4">
          BONKv2
        </h1>
        <p className="text-xl text-gray-400">
          Built for the community, by the community
        </p>
      </div>

      {/* Hot Projects Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="rounded-3xl bg-gradient-hot p-8">
          <div className="flex items-center gap-3 mb-4">
            <Flame className="w-6 h-6 text-white" />
            <h2 className="text-3xl font-bold text-white">Hot Projects</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/80">?</span>
              <span className="px-2 py-1 bg-red-500 rounded-full text-xs font-semibold text-white flex items-center gap-1">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                LIVE
              </span>
            </div>
          </div>
          <p className="text-white/90 mb-6 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Join the hottest launches happening right now!
          </p>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white/10 rounded-2xl p-4 animate-pulse h-48"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {hotProjects.map((token, index) => (
                <TokenCard key={token.mint || index} token={token} isHot />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex justify-center">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Search tokens"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-800 border border-white/10 focus:border-brand-500 focus:outline-none text-white placeholder-gray-500"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Featured Coins Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">Featured Coins</h2>
          <p className="text-gray-400 flex items-center gap-2">
            The hottest tokens everyone's watching right now
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card-gradient rounded-2xl p-6 animate-pulse h-64"></div>
            ))}
          </div>
        ) : filteredCoins.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCoins.map((token, index) => (
              <TokenCard key={token.mint || index} token={token} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              {searchQuery ? 'No tokens found matching your search.' : 'No featured coins available.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

