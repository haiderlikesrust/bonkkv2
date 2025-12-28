import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Copy, Check, ExternalLink, Plus, Key, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { createWallet, createDevWallet, connectWallet } from '../services/api.js';
import { PublicKey } from '@solana/web3.js';
import { getSolanaConnection } from '../utils/solana.js';
import { useToast } from '../hooks/useToast.js';
import ToastContainer from '../components/ToastContainer.jsx';

export default function Wallets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [importKey, setImportKey] = useState('');
  const [balance, setBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const { toasts, removeToast, success, error } = useToast();

  useEffect(() => {
    // Load user's connected wallet if any
    if (user?.walletAddress) {
      setWallets([{
        address: user.walletAddress,
        isConnected: true,
      }]);
      fetchBalance(user.walletAddress);
    }
  }, [user]);

  const fetchBalance = async (address) => {
    try {
      setLoadingBalance(true);
      const connection = getSolanaConnection();
      const publicKey = new PublicKey(address);
      const balanceLamports = await connection.getBalance(publicKey);
      const balanceSOL = balanceLamports / 1e9; // Convert lamports to SOL
      setBalance(balanceSOL);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleCreateWallet = async () => {
    try {
      setLoading(true);
      const response = await createWallet();
      const newWallet = response.data.wallet;
      
      setWallets([...wallets, {
        address: newWallet.address,
        privateKey: newWallet.secretKey,
      }]);
      setShowCreateModal(false);
      success('Wallet created! Make sure to save your private key securely.');
    } catch (err) {
      console.error('Error creating wallet:', err);
      error('Error creating wallet: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDevWallet = async () => {
    try {
      setLoading(true);
      const response = await createDevWallet();
      const newWallet = response.data.wallet;
      
      setWallets([...wallets, {
        address: newWallet.address,
        privateKey: newWallet.secretKey,
      }]);
      setShowCreateModal(false);
      success('Dev wallet created! This wallet is for testing only.');
    } catch (err) {
      console.error('Error creating dev wallet:', err);
      error('Error creating dev wallet: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleImportWallet = async () => {
    if (!importKey.trim()) {
      error('Please enter a private key');
      return;
    }

    try {
      setLoading(true);
      const response = await connectWallet(importKey);
      success('Wallet connected successfully!');
      setImportKey('');
      // Reload to get updated user data, then fetch balance
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error('Error importing wallet:', err);
      error('Error connecting wallet: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConnectWallet = async (privateKey) => {
    try {
      setLoading(true);
      await connectWallet(privateKey);
      success('Wallet connected successfully!');
      // Reload to get updated user data, then fetch balance
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error('Error connecting wallet:', err);
      error('Error connecting wallet: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Wallets</h1>
          <p className="text-gray-400">Manage your Solana wallets</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-hot rounded-xl hover:opacity-90 transition-opacity font-semibold text-white"
          >
            <Plus className="w-5 h-5" />
            Create New Wallet
          </button>
        </div>

        {/* Connected Wallet */}
        {user?.walletAddress && (
          <div className="glass rounded-3xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Connected Wallet</h3>
                  <p className="text-sm text-gray-400">Currently active wallet</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-semibold rounded-lg">
                Connected
              </span>
            </div>
              <div className="bg-dark-800 rounded-xl p-4">
                {/* Balance */}
                <div className="mb-4 pb-4 border-b border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Balance</span>
                    <button
                      onClick={() => user.walletAddress && fetchBalance(user.walletAddress)}
                      className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {loadingBalance ? (
                      <span className="text-gray-500">Loading...</span>
                    ) : balance !== null ? (
                      `${balance.toFixed(4)} SOL`
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Address</span>
                  <button
                    onClick={() => handleCopy(user.walletAddress, 'connected')}
                    className="flex items-center gap-2 text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    {copied === 'connected' ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span className="text-sm">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="text-sm">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-white font-mono text-sm break-all">{user.walletAddress}</p>
                <a
                  href={`https://solscan.io/account/${user.walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-brand-400 hover:text-brand-300 mt-3 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Solscan
                </a>
              </div>
          </div>
        )}

        {/* Import Wallet */}
        <div className="glass rounded-3xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Import Wallet</h2>
          <div className="flex gap-4">
            <input
              type="password"
              value={importKey}
              onChange={(e) => setImportKey(e.target.value)}
              placeholder="Enter private key (Base58 format)"
              className="flex-1 px-4 py-3 bg-dark-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={handleImportWallet}
              disabled={loading}
              className="px-6 py-3 bg-brand-500 rounded-xl hover:bg-brand-600 transition-colors font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Enter your wallet's private key in Base58 format (or JSON array/comma-separated format)
          </p>
        </div>

        {/* Created Wallets List */}
        {wallets.filter(w => w.address !== user?.walletAddress).length > 0 && (
          <div className="glass rounded-3xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Your Wallets</h2>
            <div className="space-y-4">
              {wallets.filter(w => w.address !== user?.walletAddress).map((wallet, index) => (
                <div key={index} className="bg-dark-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5 text-gray-400" />
                      <span className="text-white font-mono text-sm">
                        {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(wallet.address, `wallet-${index}`)}
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                      {copied === `wallet-${index}` ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span className="text-sm">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="text-sm">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  {wallet.privateKey && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">Private Key (Base58)</span>
                        <button
                          onClick={() => handleCopy(wallet.privateKey, `key-${index}`)}
                          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-xs"
                        >
                          {copied === `key-${index}` ? (
                            <>
                              <Check className="w-3 h-3" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-gray-300 font-mono text-xs break-all">{wallet.privateKey}</p>
                      <p className="text-xs text-blue-400 mt-2">💡 Use this Base58 format when connecting your wallet</p>
                      <p className="text-xs text-red-400 mt-1">⚠️ Save this private key securely. You won't be able to see it again!</p>
                    </div>
                  )}
                  {!wallet.isConnected && (
                    <button
                      onClick={() => handleConnectWallet(wallet.privateKey)}
                      disabled={loading || !wallet.privateKey}
                      className="mt-3 w-full py-2 bg-brand-500/20 text-brand-400 rounded-lg hover:bg-brand-500/30 transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Connect This Wallet
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Wallet Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass rounded-3xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-6">Create Wallet</h2>
              <div className="space-y-4">
                <button
                  onClick={handleCreateWallet}
                  disabled={loading}
                  className="w-full py-4 bg-gradient-hot rounded-xl hover:opacity-90 transition-opacity font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create New Wallet'}
                </button>
                <button
                  onClick={handleCreateDevWallet}
                  disabled={loading}
                  className="w-full py-4 bg-dark-800 rounded-xl hover:bg-dark-700 transition-colors font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Dev Wallet (Testing)'}
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-full py-3 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

