import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, TrendingUp, TrendingDown, Star } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl.js';

export default function TokenListCard({ token }) {
  const navigate = useNavigate();
  const [isInWatchlist, setIsInWatchlist] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('watchlist');
    if (saved) {
      const watchlist = JSON.parse(saved);
      setIsInWatchlist(watchlist.includes(token?.mint));
    }
  }, [token?.mint]);

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
    complete = false,
  } = token || {};

  const marketCapValue = marketCap || usd_market_cap || market_cap || 0;
  const rawImageUrl = tokenImageUrl || image_uri || null;
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

  const isLive = !complete && safeProgress > 0;
  const isNew = (() => {
    if (!createdAtFormatted) return false;
    if (createdAtFormatted.includes('m')) {
      const minutes = parseInt(createdAtFormatted.match(/(\d+)m/)?.[1] || '0');
      return minutes < 15;
    }
    return false;
  })();

  const percentChange = Math.random() > 0.5 ? (Math.random() * 20 + 5) : -(Math.random() * 10 + 2);
  const isPositive = percentChange > 0;

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

  const handleClick = () => {
    if (mint) {
      navigate(`/token/${mint}`);
    }
  };

  return (
    <div
      className="flex items-center gap-4 p-3 bg-dark-800 rounded-lg border border-gray-700 hover:border-green-500/30 transition-all cursor-pointer group"
      onClick={handleClick}
    >
      {/* Avatar - Small */}
      <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0 border border-gray-700">
        {imageUrl ? (
          <img src={imageUrl} alt={displayName} className="w-full h-full rounded-lg object-cover" />
        ) : (
          <span className="text-sm text-gray-500">{displayName.charAt(0).toUpperCase()}</span>
        )}
      </div>

      {/* Name + Ticker */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-sm font-bold text-white truncate">{displayName}</h3>
          <span className="text-[10px] text-gray-500 font-mono">{symbol}</span>
          {isLive && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded live-badge flex items-center gap-1">
              <span className="w-1 h-1 bg-current rounded-full animate-pulse"></span>
              LIVE
            </span>
          )}
          {isNew && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              NEW
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-600">
          <Clock className="w-2.5 h-2.5" />
          <span>{createdAtFormatted}</span>
        </div>
      </div>

      {/* Market Cap */}
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-bold text-white count-up">{marketCapFormatted}</div>
        <div className={`text-[10px] font-semibold flex items-center justify-end gap-0.5 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
          {Math.abs(percentChange).toFixed(1)}%
        </div>
      </div>

      {/* Progress */}
      <div className="w-20 flex-shrink-0">
        <div className="w-full progress-bar rounded-full h-1 overflow-hidden mb-0.5">
          <div
            className="progress-fill h-full transition-all duration-500"
            style={{ width: `${Math.min(safeProgress, 100)}%` }}
          />
        </div>
        <div className="text-[10px] text-gray-600 text-center">{safeProgress.toFixed(0)}%</div>
      </div>

      {/* Watchlist Button */}
      <button
        onClick={toggleWatchlist}
        className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
          isInWatchlist
            ? 'bg-yellow-500/20 border border-yellow-500/50'
            : 'bg-dark-700 border border-gray-700 hover:bg-yellow-500/10'
        }`}
        title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        <Star className={`w-4 h-4 ${isInWatchlist ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}`} />
      </button>
    </div>
  );
}

