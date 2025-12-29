import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Star, Flame, DollarSign } from 'lucide-react';

export default function RightRail({ tokens = [] }) {
  const [watchlist, setWatchlist] = useState(() => {
    const saved = localStorage.getItem('watchlist');
    return saved ? JSON.parse(saved) : [];
  });

  // Get top movers
  const topMovers = tokens
    .filter(t => (t.marketCap || t.usd_market_cap || 0) > 0)
    .sort((a, b) => (b.marketCap || b.usd_market_cap || 0) - (a.marketCap || a.usd_market_cap || 0))
    .slice(0, 5);

  // Hot in last 5m (mock - would filter by time)
  const hotLast5m = tokens
    .filter(t => {
      const created = t.createdAt || t.created_at;
      if (!created) return false;
      // Mock: show tokens with high market cap as "hot"
      return (t.marketCap || t.usd_market_cap || 0) > 5000;
    })
    .slice(0, 5);

  // Highest volume (mock)
  const highestVolume = tokens
    .map(t => ({ ...t, volume: (t.marketCap || t.usd_market_cap || 0) * (0.1 + Math.random() * 0.3) }))
    .sort((a, b) => (b.volume || 0) - (a.volume || 0))
    .slice(0, 5);

  // Watchlist preview
  const watchlistTokens = tokens.filter(t => watchlist.includes(t.mint)).slice(0, 5);

  const toggleWatchlist = (mint) => {
    const saved = localStorage.getItem('watchlist');
    const current = saved ? JSON.parse(saved) : [];
    const updated = current.includes(mint) 
      ? current.filter(m => m !== mint)
      : [...current, mint];
    setWatchlist(updated);
    localStorage.setItem('watchlist', JSON.stringify(updated));
  };

  const formatMarketCap = (value) => {
    if (!value) return '$0';
    if (value > 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value > 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  return (
    <aside className="w-80 bg-dark-800 border-l border-gray-700 h-screen sticky top-0 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Filters</h3>
          <div className="space-y-3">
            {/* Time Filter */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Time</label>
              <div className="flex gap-2 flex-wrap">
                {['5m', '1h', '6h', '24h'].map((time) => (
                  <button
                    key={time}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600 transition-colors"
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Sort By</label>
              <select className="w-full px-3 py-2 text-sm bg-dark-700 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500">
                <option>Trending</option>
                <option>Market Cap</option>
                <option>Volume</option>
                <option>New</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-700" />
                <span>Only Live</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-700" />
                <span>Only Verified</span>
              </label>
            </div>
          </div>
        </div>

        {/* Hot in last 5m */}
        {hotLast5m.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">🔥 Hot (5m)</h3>
            </div>
            <div className="space-y-2">
              {hotLast5m.map((token, index) => (
                <div
                  key={token.mint || index}
                  className="flex items-center justify-between p-2.5 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="text-[10px] text-gray-600 font-mono w-4">#{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{token.name || token.symbol}</div>
                      <div className="text-[10px] text-gray-500">{formatMarketCap(token.marketCap || token.usd_market_cap)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleWatchlist(token.mint)}
                    className="p-1 hover:bg-dark-500 rounded transition-colors flex-shrink-0"
                  >
                    <Star className={`w-3.5 h-3.5 ${watchlist.includes(token.mint) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Highest Volume */}
        {highestVolume.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-green-500" />
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">💰 Volume</h3>
            </div>
            <div className="space-y-2">
              {highestVolume.map((token, index) => (
                <div
                  key={token.mint || index}
                  className="flex items-center justify-between p-2.5 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="text-[10px] text-gray-600 font-mono w-4">#{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{token.name || token.symbol}</div>
                      <div className="text-[10px] text-gray-500">{formatMarketCap(token.volume)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleWatchlist(token.mint)}
                    className="p-1 hover:bg-dark-500 rounded transition-colors flex-shrink-0"
                  >
                    <Star className={`w-3.5 h-3.5 ${watchlist.includes(token.mint) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Movers */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Top Movers</h3>
          </div>
          <div className="space-y-2">
            {topMovers.map((token, index) => (
              <div
                key={token.mint || index}
                className="flex items-center justify-between p-2.5 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="text-[10px] text-gray-600 font-mono w-4">#{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{token.name || token.symbol}</div>
                    <div className="text-[10px] text-gray-500">{formatMarketCap(token.marketCap || token.usd_market_cap)}</div>
                  </div>
                </div>
                <button
                  onClick={() => toggleWatchlist(token.mint)}
                  className="p-1 hover:bg-dark-500 rounded transition-colors flex-shrink-0"
                >
                  <Star className={`w-3.5 h-3.5 ${watchlist.includes(token.mint) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Watchlist Preview */}
        {watchlistTokens.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Watchlist</h3>
            </div>
            <div className="space-y-2">
              {watchlistTokens.map((token, index) => (
                <div
                  key={token.mint || index}
                  className="flex items-center justify-between p-2.5 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{token.name || token.symbol}</div>
                      <div className="text-[10px] text-gray-500">{formatMarketCap(token.marketCap || token.usd_market_cap)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleWatchlist(token.mint)}
                    className="p-1 hover:bg-dark-500 rounded transition-colors flex-shrink-0"
                  >
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
