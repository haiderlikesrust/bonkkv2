import React, { useState, useEffect } from 'react';
import { ExternalLink, Wallet, TrendingUp, Activity } from 'lucide-react';
import { getCreatorActivity } from '../services/api.js';

export default function CreatorActivity({ mint, loadDelay = 0 }) {
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (mint) {
      // Load with delay to prevent concurrent RPC calls
      const timer = setTimeout(() => {
        loadActivity();
      }, loadDelay);
      return () => clearTimeout(timer);
    }
  }, [mint, loadDelay]);

  const loadActivity = async () => {
    try {
      setLoading(true);
      const response = await getCreatorActivity(mint);
      if (response.data.success) {
        setActivity(response.data.creator);
      }
    } catch (err) {
      console.error('Error loading creator activity:', err);
      setError('Failed to load creator activity');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const formatBalance = (balance) => {
    return balance.toFixed(4) + ' SOL';
  };

  if (loading) {
    return (
      <div className="card-gradient rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Creator Wallet Activity</h2>
        <div className="text-center py-8">
          <div className="text-gray-400">Loading creator activity...</div>
        </div>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="card-gradient rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Creator Wallet Activity</h2>
        <div className="text-center py-8">
          <div className="text-red-400">{error || 'No creator data available'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-gradient rounded-2xl p-6">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <Wallet className="w-6 h-6" />
        Creator Wallet Activity
      </h2>
      
      {/* Wallet Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-dark-800 rounded-lg p-4 border border-white/10">
          <div className="text-gray-400 text-sm mb-1">Wallet Balance</div>
          <div className="text-2xl font-bold text-white">{formatBalance(activity.stats.balance)}</div>
        </div>
        <div className="bg-dark-800 rounded-lg p-4 border border-white/10">
          <div className="text-gray-400 text-sm mb-1">Total Transactions</div>
          <div className="text-2xl font-bold text-white">{activity.stats.transactionCount}</div>
        </div>
      </div>

      {/* Wallet Address */}
      <div className="mb-6">
        <div className="text-gray-400 text-sm mb-2">Creator Wallet Address</div>
        <div className="flex items-center gap-2">
          <code className="text-white font-mono text-sm bg-dark-800 px-3 py-2 rounded flex-1">
            {activity.wallet}
          </code>
          <a
            href={activity.stats.solscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-brand-400 hover:text-brand-300 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recent Transactions ({activity.recentTransactions.length})
        </h3>
        
        {activity.recentTransactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400">No recent transactions</div>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {activity.recentTransactions.map((tx, index) => (
              <div
                key={tx.signature || index}
                className="bg-dark-800 rounded-lg p-3 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <TrendingUp
                      className={`w-4 h-4 flex-shrink-0 ${
                        tx.balanceChange >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-mono truncate">
                        {tx.signature.slice(0, 12)}...{tx.signature.slice(-8)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(tx.blockTime)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div
                        className={`text-sm font-semibold ${
                          tx.balanceChange >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {tx.balanceChange >= 0 ? '+' : ''}
                        {tx.balanceChange.toFixed(4)} SOL
                      </div>
                    </div>
                    <a
                      href={tx.solscanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

