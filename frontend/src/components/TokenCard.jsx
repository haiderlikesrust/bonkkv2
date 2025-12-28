import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Clock } from 'lucide-react';

export default function TokenCard({ token, isHot = false }) {
  const navigate = useNavigate();
  
  // Token data structure from API
  const {
    name = 'Token',
    symbol = 'TKN',
    mint = '7xKXtg2CW87d97TXJ3tn3Mw5Jj',
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
  } = token || {};

  // Use marketCap from API, with fallbacks
  const marketCapValue = marketCap || usd_market_cap || market_cap || 0;
  
  // Use the first available image field
  const imageUrl = tokenImageUrl || image_uri || imageUri || image_url || null;
  
  // createdAt from API is already formatted as "Xm ago", "Xh ago", etc.
  const createdAtFormatted = createdAt || created_at || 'Recently';

  // Ensure we have valid numbers
  const safeMarketCap = typeof marketCapValue === 'number' ? marketCapValue : 0;
  const safeProgress = typeof progress === 'number' ? progress : 0;

  const displayName = name || symbol;
  const shortMint = mint && mint.length > 8 ? `${mint.slice(0, 4)}...${mint.slice(-4)}` : mint;
  const marketCapFormatted = safeMarketCap > 1000 
    ? `$${(safeMarketCap / 1000).toFixed(1)}K`
    : `$${safeMarketCap.toFixed(2)}`;

  const handleClick = () => {
    if (mint) {
      navigate(`/token/${mint}`);
    }
  };

  return (
    <div className={`rounded-2xl p-6 transition-all hover:scale-105 ${
      isHot ? 'bg-white/10 backdrop-blur-lg' : 'card-gradient'
    }`}>
      {/* Token Icon and Info */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-2xl">
            {imageUrl ? (
              <img src={imageUrl} alt={displayName} className="w-full h-full rounded-xl object-cover" />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{displayName}</h3>
            <p className="text-sm text-gray-400">{symbol}</p>
          </div>
        </div>
      </div>

      {/* Contract Address */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 font-mono">{shortMint}</p>
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
          <Clock className="w-3 h-3" />
          <span>{createdAtFormatted}</span>
        </div>
      </div>

      {/* Market Cap */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Market Cap</span>
          <span className="text-lg font-bold text-white">{marketCapFormatted}</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-dark-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-brand-500 to-brand-400 h-full transition-all duration-500"
            style={{ width: `${Math.min(safeProgress, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">Progress</span>
          <span className="text-xs font-semibold text-brand-400">{safeProgress.toFixed(2)}%</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleClick}
        className="w-full py-3 rounded-xl bg-gradient-hot hover:opacity-90 transition-opacity font-semibold text-white"
      >
        View Details
      </button>
    </div>
  );
}

