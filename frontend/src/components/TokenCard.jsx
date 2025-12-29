import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, TrendingUp, TrendingDown, ExternalLink, Star } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl.js';

export default function TokenCard({ token, rank = null, isFeatured = false, isCompact = false }) {
  const navigate = useNavigate();
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('watchlist');
    if (saved) {
      const watchlist = JSON.parse(saved);
      setIsInWatchlist(watchlist.includes(token?.mint));
    }
  }, [token?.mint]);

  const toggleWatchlist = (e) => {
    e.stopPropagation();
    const saved = localStorage.getItem('watchlist');
    const current = saved ? JSON.parse(saved) : [];
    const updated = current.includes(token.mint)
      ? current.filter(m => m !== token.mint)
      : [...current, token.mint];
    localStorage.setItem('watchlist', JSON.stringify(updated));
    setIsInWatchlist(!isInWatchlist);
  };
  
  const {
    name = 'Token',
    symbol = 'TKN',
    mint = '',
    marketCap = 0,
    market_cap = 0,
    usd_market_cap = 0,
    progress = 0,
    createdAt = null,
    created_at = null,
    imageUrl: tokenImageUrl = null,
    image_uri = null,
    imageUri = null,
    image_url = null,
    complete = false,
  } = token || {};

  const marketCapValue = marketCap || usd_market_cap || market_cap || 0;
  const rawImageUrl = tokenImageUrl || image_uri || imageUri || image_url || null;
  const imageUrl = getImageUrl(rawImageUrl);
  const createdAtFormatted = createdAt || created_at || 'Recently';
  const safeMarketCap = typeof marketCapValue === 'number' ? marketCapValue : 0;
  const safeProgress = typeof progress === 'number' ? progress : 0;

  const displayName = name || symbol;
  const marketCapFormatted = safeMarketCap > 1000 
    ? `$${(safeMarketCap / 1000).toFixed(1)}K`
    : safeMarketCap > 1000000
    ? `$${(safeMarketCap / 1000000).toFixed(2)}M`
    : `$${safeMarketCap.toFixed(2)}`;

  // Mock data for status chips
  const isLive = !complete && safeProgress > 0;
  
  // Only show NEW if < 15 minutes old
  const isNew = (() => {
    if (!createdAtFormatted) return false;
    // Check if it's in minutes and less than 15
    if (createdAtFormatted.includes('m')) {
      const minutes = parseInt(createdAtFormatted.match(/(\d+)m/)?.[1] || '0');
      return minutes < 15;
    }
    // If it's in hours or days, it's not new
    return false;
  })();
  
  const isVerified = false; // Would come from API
  const isTrending = safeMarketCap > 10000;

  // Mock % change
  const percentChange = Math.random() > 0.5 ? (Math.random() * 20 + 5) : -(Math.random() * 10 + 2);
  const isPositive = percentChange > 0;

  const handleClick = () => {
    if (mint) {
      navigate(`/token/${mint}`);
    }
  };

  if (isFeatured) {
    // Large featured card
    return (
      <div 
        className="card group cursor-pointer overflow-hidden relative"
        onClick={handleClick}
      >
        {rank && (
          <div className="absolute top-3 left-3 z-10 w-8 h-8 bg-dark-900/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-gray-700">
            <span className="text-xs font-bold text-white">#{rank}</span>
          </div>
        )}
        <div className="aspect-[4/3] bg-dark-700 overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={displayName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl text-gray-600">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-bold text-white truncate">{displayName}</h3>
                <span className="text-xs text-gray-400 font-mono">{symbol}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{createdAtFormatted}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-white">{marketCapFormatted}</div>
              <div className={`text-xs font-semibold flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(percentChange).toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="mb-3">
            <div className="w-full progress-bar rounded-full h-1.5 overflow-hidden mb-1">
              <div
                className="progress-fill h-full transition-all duration-500"
                style={{ width: `${Math.min(safeProgress, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Progress</span>
              <span className="text-green-500 font-semibold">{safeProgress.toFixed(1)}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={toggleWatchlist}
              className={`p-1.5 rounded-lg transition-colors ${
                isInWatchlist
                  ? 'bg-yellow-500/20 border border-yellow-500/50'
                  : 'bg-dark-700 border border-gray-700 hover:bg-yellow-500/10'
              }`}
              title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              <Star className={`w-4 h-4 ${isInWatchlist ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}`} />
            </button>
            {isLive && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded live-badge">
                LIVE
              </span>
            )}
            {isNew && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                NEW
              </span>
            )}
            {isVerified && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                VERIFIED
              </span>
            )}
            {isTrending && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                TRENDING
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Compact card for grid/list
  return (
    <div 
      className="card group cursor-pointer relative transition-all duration-200 hover:border-green-500/30"
      onClick={handleClick}
      style={{ padding: '0.75rem' }}
    >
      {rank && (
        <div className="absolute top-2 left-2 z-10 w-6 h-6 bg-dark-900/90 backdrop-blur-sm rounded-full flex items-center justify-center border border-gray-700">
          <span className="text-[10px] font-bold text-white">#{rank}</span>
        </div>
      )}
      
      {/* Top Row - Denser */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0 border border-gray-700">
            {imageUrl ? (
              <img src={imageUrl} alt={displayName} className="w-full h-full rounded-lg object-cover" />
            ) : (
              <span className="text-sm text-gray-500">{displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="text-sm font-bold text-white truncate">{displayName}</h3>
              <span className="text-[10px] text-gray-500 font-mono">{symbol}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
              <Clock className="w-2.5 h-2.5" />
              <span>{createdAtFormatted}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isLive && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded live-badge flex items-center gap-1">
              <span className="w-1 h-1 bg-current rounded-full animate-pulse"></span>
              LIVE
            </span>
          )}
        </div>
      </div>

      {/* Middle - More compact */}
      <div className="mb-2">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] text-gray-600">Market Cap</span>
          <span className="text-sm font-bold text-white count-up">{marketCapFormatted}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-gray-600">
          <span>Liq: ${(safeMarketCap * 0.1).toFixed(0)}</span>
          <div className="flex items-center gap-1.5">
            <span>{Math.floor(Math.random() * 1000)} txns</span>
            <span className="text-gray-700">•</span>
            <span>{Math.floor(Math.random() * 50)} replies</span>
          </div>
        </div>
      </div>

      {/* Bottom - Compact */}
      <div className="space-y-1.5">
        <div>
          <div className="w-full progress-bar rounded-full h-1 overflow-hidden mb-0.5">
            <div
              className="progress-fill h-full transition-all duration-500"
              style={{ width: `${Math.min(safeProgress, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-600">Progress</span>
            <div className="flex items-center gap-1.5">
              <span className="text-green-500 font-semibold">{safeProgress.toFixed(1)}%</span>
              <span className={`font-semibold flex items-center gap-0.5 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {Math.abs(percentChange).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className="w-full py-1.5 text-xs font-semibold btn-primary rounded-lg"
        >
          Details
        </button>
      </div>

      {/* Status Chips */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
        <button
          onClick={toggleWatchlist}
          className={`p-1.5 rounded-lg backdrop-blur-sm transition-colors ${
            isInWatchlist
              ? 'bg-yellow-500/20 border border-yellow-500/50'
              : 'bg-dark-900/80 border border-gray-700 hover:bg-yellow-500/10'
          }`}
          title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          <Star className={`w-3.5 h-3.5 ${isInWatchlist ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}`} />
        </button>
        {isNew && (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
            NEW
          </span>
        )}
        {isVerified && (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
            ✓
          </span>
        )}
        {isTrending && (
          <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
            🔥
          </span>
        )}
      </div>
    </div>
  );
}
