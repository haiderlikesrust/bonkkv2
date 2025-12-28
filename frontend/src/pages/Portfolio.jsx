import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Edit, TrendingUp, Copy, Check, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getToken } from '../services/api.js';
import { Connection, PublicKey } from '@solana/web3.js';
import { useToast } from '../hooks/useToast.js';
import ToastContainer from '../components/ToastContainer.jsx';
import FeeDistributionModal from '../components/FeeDistributionModal.jsx';

export default function Portfolio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myTokens, setMyTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [copied, setCopied] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const { toasts, removeToast, success, error } = useToast();

  useEffect(() => {
    if (user) {
      console.log('[Portfolio] User loaded:', user);
      fetchMyTokens();
      if (user.walletAddress) {
        fetchBalance(user.walletAddress);
      }
    }
  }, [user]);

  const fetchMyTokens = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      console.log('[Portfolio] Fetching tokens, token exists:', !!token);
      
      if (!token) {
        console.error('[Portfolio] No auth token found in localStorage');
        error('Please log in to view your tokens');
        setLoading(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/tokens/my`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('[Portfolio] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Portfolio] Received response:', data);
        console.log('[Portfolio] Success:', data.success);
        console.log('[Portfolio] Token count:', data.tokens?.length || 0);
        if (data.tokens && data.tokens.length > 0) {
          console.log('[Portfolio] First token:', data.tokens[0]);
        }
        setMyTokens(data.tokens || []);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Portfolio] API error - Status:', response.status);
        console.error('[Portfolio] API error - Data:', errorData);
        error(`Failed to load tokens: ${errorData.error || 'Unknown error'}`);
        setMyTokens([]);
      }
    } catch (err) {
      console.error('[Portfolio] Error fetching tokens:', err);
      console.error('[Portfolio] Error details:', err.message);
      error('Failed to load your tokens');
      setMyTokens([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async (address) => {
    try {
      setLoadingBalance(true);
      const connection = new Connection(
        import.meta.env.VITE_SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
        'confirmed'
      );
      const publicKey = new PublicKey(address);
      const balanceLamports = await connection.getBalance(publicKey);
      const balanceSOL = balanceLamports / 1e9;
      setBalance(balanceSOL);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleEditFees = (token) => {
    setSelectedToken(token);
    setShowFeeModal(true);
  };

  const handleFeeUpdate = async (feeDistribution) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/tokens/${selectedToken.mint}/fees`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ feeDistribution }),
        }
      );

      if (response.ok) {
        success('Fee distribution updated successfully');
        setShowFeeModal(false);
        setSelectedToken(null);
        fetchMyTokens(); // Refresh tokens
      } else {
        const data = await response.json();
        error(data.error || 'Failed to update fee distribution');
      }
    } catch (err) {
      console.error('Error updating fees:', err);
      error('Failed to update fee distribution');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Please login to view your portfolio</div>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-gradient-hot rounded-xl hover:opacity-90 transition-opacity font-semibold text-white"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <FeeDistributionModal
        isOpen={showFeeModal}
        onClose={() => {
          setShowFeeModal(false);
          setSelectedToken(null);
        }}
        token={selectedToken}
        onSave={handleFeeUpdate}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Portfolio</h1>
          <p className="text-gray-400">Manage your tokens and fee distribution</p>
        </div>

        {/* Balance Card */}
        <div className="glass rounded-3xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Wallet Balance</h2>
                <p className="text-gray-400">
                  {user.walletAddress ? `${user.walletAddress.slice(0, 8)}...${user.walletAddress.slice(-8)}` : 'No wallet connected'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">SOL Balance</div>
              <div className="text-3xl font-bold text-white">
                {loadingBalance ? (
                  <span className="text-gray-500">Loading...</span>
                ) : balance !== null ? (
                  `${balance.toFixed(4)} SOL`
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </div>
              <button
                onClick={() => user.walletAddress && fetchBalance(user.walletAddress)}
                className="text-xs text-brand-400 hover:text-brand-300 mt-2"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* My Tokens */}
        <div className="glass rounded-3xl p-6">
          <h2 className="text-2xl font-bold text-white mb-6">My Tokens</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-400">Loading tokens...</div>
            </div>
          ) : myTokens.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">You haven't created any tokens yet</div>
              <button
                onClick={() => navigate('/create')}
                className="px-6 py-3 bg-gradient-hot rounded-xl hover:opacity-90 transition-opacity font-semibold text-white"
              >
                Create Your First Token
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myTokens.map((token) => (
                <div key={token.mint} className="bg-dark-800 rounded-2xl p-6 hover:bg-dark-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Token Icon */}
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-2xl">
                        {token.imageUrl ? (
                          <img src={token.imageUrl} alt={token.name} className="w-full h-full rounded-xl object-cover" />
                        ) : (
                          token.name?.charAt(0).toUpperCase() || 'T'
                        )}
                      </div>

                      {/* Token Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white">{token.name}</h3>
                          <span className="px-2 py-1 bg-brand-500/20 text-brand-400 text-xs font-semibold rounded">
                            {token.symbol}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-400 font-mono">
                            {token.mint?.slice(0, 8)}...{token.mint?.slice(-8)}
                          </span>
                          <button
                            onClick={() => handleCopy(token.mint, token.mint)}
                            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                          >
                            {copied === token.mint ? (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                          <a
                            href={`https://solscan.io/token/${token.mint}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-brand-400 hover:text-brand-300 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>View</span>
                          </a>
                        </div>
                        {token.marketCap && (
                          <div className="mt-2 flex items-center gap-4">
                            <span className="text-gray-400">Market Cap:</span>
                            <span className="text-white font-semibold">
                              ${token.marketCap > 1000 
                                ? `${(token.marketCap / 1000).toFixed(1)}K`
                                : token.marketCap.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigate(`/token/${token.mint}`)}
                        className="px-4 py-2 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors text-white font-semibold"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleEditFees(token)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors text-white font-semibold"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Fees
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

