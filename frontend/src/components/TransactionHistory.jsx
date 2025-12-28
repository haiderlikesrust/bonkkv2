import React, { useState, useEffect } from 'react';
import { Clock, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { getTokenTransactions } from '../services/api.js';

export default function TransactionHistory({ mint }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (mint) {
      loadTransactions();
    }
  }, [mint]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await getTokenTransactions(mint, 50);
      if (response.data.success) {
        setTransactions(response.data.transactions || []);
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const formatFee = (fee) => {
    return (fee / 1e9).toFixed(9) + ' SOL';
  };

  if (loading) {
    return (
      <div className="card-gradient rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Transaction History</h2>
        <div className="text-center py-8">
          <div className="text-gray-400">Loading transactions...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-gradient rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-4">Transaction History</h2>
        <div className="text-center py-8">
          <div className="text-red-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-gradient rounded-2xl p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Transaction History</h2>
      <p className="text-gray-400 text-sm mb-6">
        On-chain transaction history for this token ({transactions.length} recent transactions)
      </p>
      
      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400">No transactions found</div>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {transactions.map((tx, index) => (
            <div
              key={tx.signature || index}
              className="bg-dark-800 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {tx.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-mono text-sm truncate">
                        {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          tx.status === 'success'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(tx.blockTime)}</span>
                      </div>
                      <span>Fee: {formatFee(tx.fee)}</span>
                    </div>
                  </div>
                </div>
                <a
                  href={tx.solscanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-brand-400 hover:text-brand-300 transition-colors flex-shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-sm">View</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

