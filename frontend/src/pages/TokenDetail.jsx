import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, ExternalLink, Twitter, Globe, Send } from 'lucide-react';
import { getToken, getBuyTransaction, getSellTransaction, getPrivateKey } from '../services/api.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Connection, VersionedTransaction, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import { useToast } from '../hooks/useToast.js';
import ToastContainer from '../components/ToastContainer.jsx';
import InputModal from '../components/InputModal.jsx';
// // import { PriceChartWidget } from '../components/PriceChartWidget.jsx';
import TransactionHistory from '../components/TransactionHistory.jsx';
import CreatorActivity from '../components/CreatorActivity.jsx';
import FeeAllocationTracker from '../components/FeeAllocationTracker.jsx';
window.Buffer = Buffer;

// Note: In production, use a proper wallet adapter (like @solana/wallet-adapter-react)
// instead of prompting for private keys. This is for demonstration only.

export default function TokenDetail() {
  const { mint } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [buyInSol, setBuyInSol] = useState(true);
  const [sellInSol, setSellInSol] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('buy'); // 'buy' or 'sell'
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'buy' or 'sell'
  const { toasts, removeToast, success, error: showError } = useToast();
  // const [chartTimeframe, setChartTimeframe] = useState('1D'); // Commented out - chart coming soon

  useEffect(() => {
    loadToken();
  }, [mint]);

  const loadToken = async () => {
    try {
      setLoading(true);
      const response = await getToken(mint);
      setToken(response.data.token);
    } catch (err) {
      setErrorState('Token not found');
      console.error('Error loading token:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (privateKey = null) => {
    if (!user || !user.walletAddress) {
      showError('Please connect your wallet first');
      return;
    }

    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    if (!privateKey) {
      // Try to get stored private key automatically
      try {
        const privateKeyResponse = await getPrivateKey();
        if (privateKeyResponse.data.success && privateKeyResponse.data.privateKey) {
          // Use stored private key automatically
          await handleBuy(privateKeyResponse.data.privateKey);
          return;
        }
      } catch (keyError) {
        // If we can't get the private key, show modal for manual entry
        console.log('No stored private key, showing modal for manual entry');
      }
      setPendingAction('buy');
      setShowPrivateKeyModal(true);
      return;
    }

    try {
      setProcessing(true);
      
      // Get transaction from backend
      const response = await getBuyTransaction(mint, {
        publicKey: user.walletAddress,
        amount: buyAmount,
        denominatedInSol: buyInSol ? 'true' : 'false',
        slippage: 10,
        priorityFee: 0.00001,
        pool: 'auto',
      });

      // Deserialize transaction (response is base64 string)
      const transactionBuffer = Buffer.from(response.data.serializedTransaction, 'base64');
      const tx = VersionedTransaction.deserialize(new Uint8Array(transactionBuffer));

      const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
      tx.sign([keypair]);

      // Send transaction
      const connection = new Connection(
        import.meta.env.VITE_SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
        'confirmed'
      );

      const signature = await connection.sendTransaction(tx);
      console.log('Transaction sent:', signature);
      success(`Transaction sent! View on Solscan: https://solscan.io/tx/${signature}`);
      
      // Refresh token data
      loadToken();
      setBuyAmount('');
    } catch (err) {
      console.error('Error buying token:', err);
      showError(`Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleSell = async (privateKey = null) => {
    if (!user || !user.walletAddress) {
      showError('Please connect your wallet first');
      return;
    }

    if (!sellAmount || parseFloat(sellAmount) <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    if (!privateKey) {
      // Try to get stored private key automatically
      try {
        const privateKeyResponse = await getPrivateKey();
        if (privateKeyResponse.data.success && privateKeyResponse.data.privateKey) {
          // Use stored private key automatically
          await handleSell(privateKeyResponse.data.privateKey);
          return;
        }
      } catch (keyError) {
        // If we can't get the private key, show modal for manual entry
        console.log('No stored private key, showing modal for manual entry');
      }
      setPendingAction('sell');
      setShowPrivateKeyModal(true);
      return;
    }

    try {
      setProcessing(true);
      
      // Get transaction from backend
      const response = await getSellTransaction(mint, {
        publicKey: user.walletAddress,
        amount: sellAmount,
        denominatedInSol: sellInSol ? 'true' : 'false',
        slippage: 10,
        priorityFee: 0.00001,
        pool: 'auto',
      });

      // Deserialize transaction (response is base64 string)
      const transactionBuffer = Buffer.from(response.data.serializedTransaction, 'base64');
      const tx = VersionedTransaction.deserialize(new Uint8Array(transactionBuffer));

      const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
      tx.sign([keypair]);

      // Send transaction
      const connection = new Connection(
        import.meta.env.VITE_SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
        'confirmed'
      );

      const signature = await connection.sendTransaction(tx);
      console.log('Transaction sent:', signature);
      success(`Transaction sent! View on Solscan: https://solscan.io/tx/${signature}`);
      
      // Refresh token data
      loadToken();
      setSellAmount('');
    } catch (err) {
      console.error('Error selling token:', err);
      
      // Handle insufficient funds error specifically
      let errorMessage = err.response?.data?.error || err.message;
      
      // Check if this is a SendTransactionError (has logs property)
      if (err.logs && Array.isArray(err.logs)) {
        const logs = err.logs;
        const insufficientFunds = logs.some(log => 
          typeof log === 'string' && log.includes('insufficient lamports')
        );
        
        if (insufficientFunds) {
          const insufficientLog = logs.find(log => 
            typeof log === 'string' && log.includes('insufficient lamports')
          );
          
          if (insufficientLog) {
            const match = insufficientLog.match(/insufficient lamports (\d+), need (\d+)/);
            if (match) {
              const hasLamports = parseInt(match[1]) / 1e9;
              const needsLamports = parseInt(match[2]) / 1e9;
              errorMessage = `Insufficient SOL balance. You have ${hasLamports.toFixed(4)} SOL but need ${needsLamports.toFixed(4)} SOL.`;
            } else {
              errorMessage = 'Insufficient SOL balance. Please add more SOL to your wallet.';
            }
          } else {
            errorMessage = 'Insufficient SOL balance. Please add more SOL to your wallet.';
          }
        } else {
          errorMessage = 'Transaction failed: ' + (err.message || 'Unknown error');
        }
      }
      
      showError(`Error: ${errorMessage}`);
    } finally {
      setProcessing(false);
    }
  };

  const handlePrivateKeyConfirm = (privateKey) => {
    if (pendingAction === 'buy') {
      handleBuy(privateKey);
    } else if (pendingAction === 'sell') {
      handleSell(privateKey);
    }
    setShowPrivateKeyModal(false);
    setPendingAction(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading token...</div>
      </div>
    );
  }

  if (errorState || !token) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Token not found</div>
          <Link to="/" className="text-brand-400 hover:underline">
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  const marketCapFormatted = token.marketCap > 1000 
    ? `$${(token.marketCap / 1000).toFixed(1)}K`
    : `$${token.marketCap.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-dark-900">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <InputModal
        isOpen={showPrivateKeyModal}
        onClose={() => {
          setShowPrivateKeyModal(false);
          setPendingAction(null);
        }}
        onConfirm={handlePrivateKeyConfirm}
        title="Enter Private Key"
        message="Enter your wallet private key (base58) to sign the transaction"
        placeholder="Private key (base58)"
        type="password"
        buttonText="Sign Transaction"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        {/* Token Header */}
        <div className="glass rounded-3xl p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-4xl">
                {token.imageUrl ? (
                  <img src={token.imageUrl} alt={token.name} className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  token.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">{token.name}</h1>
                <p className="text-xl text-gray-400 mb-3">{token.symbol}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500 font-mono">{token.mint.slice(0, 8)}...{token.mint.slice(-8)}</span>
                  <a
                    href={`https://solscan.io/token/${token.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-brand-400 hover:text-brand-300"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Solscan
                  </a>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-col gap-4">
              <div>
                <div className="text-sm text-gray-400">Market Cap</div>
                <div className="text-2xl font-bold text-white">{marketCapFormatted}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Progress</div>
                <div className="text-2xl font-bold text-brand-400">{token.progress?.toFixed(2) || 0}%</div>
              </div>
            </div>
          </div>

          {/* Social Links */}
          {(token.twitter || token.telegram || token.website) && (
            <div className="flex items-center gap-4 mt-6 pt-6 border-t border-white/10">
              {token.twitter && (
                <a
                  href={token.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                  <span>Twitter</span>
                </a>
              )}
              {token.telegram && (
                <a
                  href={token.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Send className="w-5 h-5" />
                  <span>Telegram</span>
                </a>
              )}
              {token.website && (
                <a
                  href={token.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Globe className="w-5 h-5" />
                  <span>Website</span>
                </a>
              )}
            </div>
          )}

          {/* Description */}
          {token.description && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-gray-300">{token.description}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart */}
          <div className="lg:col-span-2 glass rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Price Chart</h2>
              {/* Timeframe selector - commented out for now */}
              {/* <div className="flex gap-2">
                {['1H', '4H', '1D', '1W'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setChartTimeframe(tf)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      chartTimeframe === tf
                        ? 'bg-brand-500 text-white'
                        : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div> */}
            </div>
            
            {/* Chart Widget - Coming Soon */}
            {/* <div style={{ height: '500px', width: '100%' }}>
              {token?.mint && (
                <PriceChartWidget 
                  tokenAddress={token.mint} 
                  timeframe={chartTimeframe}
                />
              )}
            </div> */}
            
            <div className="h-[500px] flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-2">Chart Coming Soon</h3>
                <p className="text-gray-400">Price charts will be available shortly</p>
              </div>
            </div>
          </div>

          {/* Buy/Sell Panel */}
          <div className="glass rounded-3xl p-6">
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab('buy')}
                className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${
                  activeTab === 'buy'
                    ? 'bg-gradient-hot text-white'
                    : 'bg-dark-800 text-gray-400 hover:text-white'
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => setActiveTab('sell')}
                className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${
                  activeTab === 'sell'
                    ? 'bg-gradient-hot text-white'
                    : 'bg-dark-800 text-gray-400 hover:text-white'
                }`}
              >
                Sell
              </button>
            </div>

            {activeTab === 'buy' ? (
              <div>
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Amount</label>
                  <input
                    type="number"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-3 bg-dark-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={buyInSol}
                        onChange={(e) => setBuyInSol(e.target.checked)}
                        className="rounded"
                      />
                      <span>In SOL</span>
                    </label>
                  </div>
                </div>
                <button
                  onClick={handleBuy}
                  disabled={processing || !user || !user.walletAddress}
                  className="w-full py-4 rounded-xl bg-gradient-hot hover:opacity-90 transition-opacity font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : 'Buy Token'}
                </button>
                {!user || !user.walletAddress ? (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Please connect your wallet first
                  </p>
                ) : null}
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">Amount</label>
                  <input
                    type="number"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-3 bg-dark-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sellInSol}
                        onChange={(e) => setSellInSol(e.target.checked)}
                        className="rounded"
                      />
                      <span>In SOL</span>
                    </label>
                  </div>
                </div>
                <button
                  onClick={handleSell}
                  disabled={processing || !user || !user.walletAddress}
                  className="w-full py-4 rounded-xl bg-gradient-hot hover:opacity-90 transition-opacity font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : 'Sell Token'}
                </button>
                {!user || !user.walletAddress ? (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Please connect your wallet first
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transparency Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TransactionHistory mint={mint} />
          <CreatorActivity mint={mint} />
        </div>
        <FeeAllocationTracker mint={mint} />
      </div>
    </div>
  );
}
