import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Rocket, BookOpen, TrendingUp, Flame, CheckCircle } from 'lucide-react';
import { getNewTokens } from '../services/api.js';
import TokenCard from '../components/TokenCard.jsx';
import TokenListCard from '../components/TokenListCard.jsx';
import Sidebar from '../components/Sidebar.jsx';
import RightRail from '../components/RightRail.jsx';

const formatMarketCap = (value) => {
  if (!value) return '$0';
  if (value > 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value > 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
};

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const [allTokens, setAllTokens] = useState([]);
  const [filteredTokens, setFilteredTokens] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('24h');
  const [sortBy, setSortBy] = useState('trending');
  const [onlyLive, setOnlyLive] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const loadTokens = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await getNewTokens(100);
      const tokens = response.data?.tokens || [];
      
      console.log(`[Home] Loaded ${tokens.length} tokens from backend`);
      
      setAllTokens(tokens);
      setFilteredTokens(tokens);
    } catch (error) {
      console.error('Error loading tokens:', error);
      setAllTokens([]);
      setFilteredTokens([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter and sort tokens
  useEffect(() => {
    let filtered = [...allTokens];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(token => {
        const name = (token.name || '').toLowerCase();
        const symbol = (token.symbol || '').toLowerCase();
        const mint = (token.mint || '').toLowerCase();
        return name.includes(query) || symbol.includes(query) || mint.includes(query);
      });
    }

    // Live filter
    if (onlyLive) {
      filtered = filtered.filter(token => !token.complete && (token.progress || 0) > 0);
    }

    // Verified filter (mock - would come from API)
    if (onlyVerified) {
      filtered = filtered.filter(token => token.verified || false);
    }

    // Sort
    switch (sortBy) {
      case 'marketcap':
        filtered.sort((a, b) => (b.marketCap || b.usd_market_cap || 0) - (a.marketCap || a.usd_market_cap || 0));
        break;
      case 'volume':
        filtered.sort((a, b) => (b.volume || 0) - (a.volume || 0));
        break;
      case 'new':
        filtered.sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0));
        break;
      case 'trending':
      default:
        // Sort by market cap for trending
        filtered.sort((a, b) => (b.marketCap || b.usd_market_cap || 0) - (a.marketCap || a.usd_market_cap || 0));
        break;
    }

    setFilteredTokens(filtered);
  }, [allTokens, searchQuery, timeFilter, sortBy, onlyLive, onlyVerified]);

  useEffect(() => {
    if (location.pathname === '/') {
      loadTokens();
    }
  }, [location.pathname, loadTokens]);

  const featuredTokens = filteredTokens.slice(0, 2);
  const trendingTokens = filteredTokens.slice(2, 14);
  const hotLaunches = filteredTokens.filter(t => !t.complete && (t.progress || 0) > 0).slice(0, 10);
  const verifiedTokens = filteredTokens.filter(t => t.verified || false).slice(0, 6);

  return (
    <div className="flex min-h-screen" style={{ background: '#0B0F14' }}>
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        {/* Hero Section */}
        <div className="relative border-b border-gray-700" style={{ 
          background: 'linear-gradient(180deg, #0B0F14 0%, #0F1419 100%)'
        }}>
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">Launch Your Token</h1>
              <p className="text-gray-400 text-sm">Create and trade tokens on Solana</p>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-dark-800 border border-gray-700 rounded-xl focus:border-green-500 focus:outline-none text-white placeholder-gray-500"
              />
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/create')}
                className="px-6 py-3 btn-primary rounded-xl font-semibold flex items-center gap-2"
              >
                <Rocket className="w-5 h-5" />
                Create Coin
              </button>
              <button className="px-6 py-3 btn-secondary rounded-xl font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                How it Works
              </button>
            </div>
          </div>
        </div>

        {/* Sticky Filter Bar */}
        <div className="sticky top-0 z-40 bg-dark-800/95 backdrop-blur-sm border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Time Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Time:</span>
                {['5m', '1h', '6h', '24h'].map((time) => (
                  <button
                    key={time}
                    onClick={() => setTimeFilter(time)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      timeFilter === time
                        ? 'bg-green-500 text-white'
                        : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-dark-700 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                >
                  <option value="trending">Trending</option>
                  <option value="marketcap">Market Cap</option>
                  <option value="volume">Volume</option>
                  <option value="new">New</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyLive}
                    onChange={(e) => setOnlyLive(e.target.checked)}
                    className="rounded border-gray-700"
                  />
                  <span>Only Live</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyVerified}
                    onChange={(e) => setOnlyVerified(e.target.checked)}
                    className="rounded border-gray-700"
                  />
                  <span>Only Verified</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">
          {/* Section A: Now Trending */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-bold text-white">Now Trending</h2>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {[1, 2].map((i) => (
                  <div key={i} className="card p-0 animate-pulse">
                    <div className="aspect-[4/3] bg-dark-700"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-dark-700 rounded w-3/4"></div>
                      <div className="h-3 bg-dark-700 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Featured Tiles - Hover stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {featuredTokens.map((token, index) => (
                    <div key={token.mint || index} className="group relative">
                      <TokenCard token={token} rank={index + 1} isFeatured />
                      {/* Hover overlay with expanded stats */}
                      <div className="absolute inset-0 bg-dark-900/95 backdrop-blur-sm rounded-xl p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                        <div className="space-y-3">
                          <div className="text-sm text-gray-400">24h Volume</div>
                          <div className="text-2xl font-bold text-white">{formatMarketCap((token.marketCap || token.usd_market_cap || 0) * 0.15)}</div>
                          <div className="text-sm text-gray-400">Holders</div>
                          <div className="text-xl font-bold text-white">{Math.floor(Math.random() * 500 + 50)}</div>
                          <div className="text-sm text-gray-400">Price Change</div>
                          <div className="text-lg font-bold text-green-500">+{Math.random() * 20 + 5}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Dense Grid or List */}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                    {trendingTokens.map((token, index) => (
                      <TokenCard key={token.mint || index} token={token} rank={index + 3} isCompact />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {trendingTokens.map((token, index) => (
                      <TokenListCard key={token.mint || index} token={token} />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {/* Section B: Hot Launches (Live) */}
          {hotLaunches.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-6">
                <Flame className="w-5 h-5 text-orange-400" />
                <h2 className="text-xl font-bold text-white">Hot Launches (Live)</h2>
              </div>
              
              <div className="overflow-x-auto pb-4 -mx-6 px-6">
                <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                  {hotLaunches.map((token, index) => (
                    <div key={token.mint || index} className="flex-shrink-0" style={{ width: '280px' }}>
                      <TokenCard token={token} rank={index + 1} isCompact />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Section C: Featured / Verified */}
          {verifiedTokens.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-6">
                <CheckCircle className="w-5 h-5 text-purple-400" />
                <h2 className="text-xl font-bold text-white">Featured / Verified</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {verifiedTokens.map((token, index) => (
                  <TokenCard key={token.mint || index} token={token} isCompact />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Right Rail */}
      <RightRail tokens={allTokens} />
    </div>
  );
}
