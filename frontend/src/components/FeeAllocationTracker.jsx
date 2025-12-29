import React, { useState, useEffect } from 'react';
import { DollarSign, Users, Zap, Gift } from 'lucide-react';
import { getFeeHistory } from '../services/api.js';

export default function FeeAllocationTracker({ mint, loadDelay = 0 }) {
  const [feeData, setFeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (mint) {
      // Load with delay to prevent concurrent RPC calls
      const timer = setTimeout(() => {
        loadFeeData();
      }, loadDelay);
      return () => clearTimeout(timer);
    }
  }, [mint, loadDelay]);

  const loadFeeData = async () => {
    try {
      setLoading(true);
      const response = await getFeeHistory(mint);
      if (response.data.success) {
        setFeeData(response.data);
      }
    } catch (err) {
      console.error('Error loading fee data:', err);
      setError('Failed to load fee allocation data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="card-gradient rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Fee Allocation</h2>
        <div className="text-center py-8">
          <div className="text-gray-400">Loading fee allocation data...</div>
        </div>
      </div>
    );
  }

  if (error || !feeData) {
    return (
      <div className="card-gradient rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Fee Allocation</h2>
        <div className="text-center py-8">
          <div className="text-red-400">{error || 'No fee data available'}</div>
        </div>
      </div>
    );
  }

  const { feeDistribution } = feeData;
  const totalPercent = (feeDistribution.holders || 0) + 
                      (feeDistribution.dev || 0) + 
                      (feeDistribution.flywheel || 0) + 
                      (feeDistribution.supportPonk || 0);

  const distributionItems = [
    {
      label: 'Top Holders',
      value: feeDistribution.holders || 0,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
    },
    {
      label: 'Dev Wallet',
      value: feeDistribution.dev || 0,
      icon: DollarSign,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    },
    {
      label: 'Flywheel (Buyback)',
      value: feeDistribution.flywheel || 0,
      icon: Zap,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
    },
    {
      label: 'PONK Support',
      value: feeDistribution.supportPonk || 0,
      icon: Gift,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
    },
  ];

  return (
    <div className="card-gradient rounded-2xl p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Fee Allocation & Distribution</h2>
      <p className="text-gray-400 text-sm mb-6">
        See how creator fees are distributed when collected
      </p>

      {/* Distribution Breakdown */}
      <div className="mb-6">
        <div className="text-gray-400 text-sm mb-3">Fee Distribution (Total: {totalPercent}%)</div>
        <div className="space-y-3">
          {distributionItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="bg-dark-800 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${item.bgColor}`}>
                      <Icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <span className="text-white font-medium">{item.label}</span>
                  </div>
                  <span className="text-white font-bold text-lg">{item.value}%</span>
                </div>
                <div className="w-full bg-dark-900 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${item.bgColor} transition-all duration-500`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fee Collection History */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">
          Fee Collection History ({feeData.feeHistory?.length || 0} collections)
        </h3>
        
        {!feeData.feeHistory || feeData.feeHistory.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400">No fee collections recorded yet</div>
            <div className="text-gray-500 text-sm mt-2">
              Fees are collected automatically every hour if configured
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {feeData.feeHistory.map((tx, index) => (
              <div
                key={tx.signature || index}
                className="bg-dark-800 rounded-lg p-3 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-white text-sm font-mono">
                      {tx.signature.slice(0, 12)}...{tx.signature.slice(-8)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatDate(tx.blockTime)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {tx.balanceChange !== undefined && (
                      <div className="text-right">
                        <div className="text-sm font-semibold text-green-400">
                          +{tx.balanceChange.toFixed(4)} SOL
                        </div>
                      </div>
                    )}
                    <a
                      href={tx.solscanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-500 hover:text-green-600 transition-colors"
                    >
                      View
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

