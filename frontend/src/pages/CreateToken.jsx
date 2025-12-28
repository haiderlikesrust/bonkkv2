import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { uploadTokenImage, createToken, getPrivateKey, getVanityMint } from '../services/api.js';
import vanityMintPool from '../utils/vanityMintPool.js';
import { VersionedTransaction, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import { useToast } from '../hooks/useToast.js';
import ToastContainer from '../components/ToastContainer.jsx';
import InputModal from '../components/InputModal.jsx';
import { generateVanityMintWithTimeout } from '../utils/vanityMintGenerator.js';
import { getSolanaConnection } from '../utils/solana.js';
window.Buffer = Buffer;

export default function CreateToken() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(1); // 1: form, 2: image upload, 3: transaction
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    image: null,
    imagePreview: null,
    twitter: '',
    telegram: '',
    website: '',
  });

  const [metadataUri, setMetadataUri] = useState('');
  const [ipfsImageUrl, setIpfsImageUrl] = useState(null);
  const [mintKeypair, setMintKeypair] = useState(null);
  const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const pendingTransactionRef = useRef(null); // Use ref to avoid closure issues
  const { toasts, removeToast, success, error } = useToast();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        error('Image size must be less than 5MB');
        return;
      }
      setFormData(prev => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file),
      }));
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null,
      imagePreview: null,
    }));
  };

  const handleImageUpload = async () => {
    if (!formData.image) {
      error('Please select an image');
      return;
    }

    try {
      setLoading(true);
      
      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result.split(',')[1];
        
        const response = await uploadTokenImage({
          imageBase64: base64String,
          fileName: formData.image.name,
          name: formData.name,
          symbol: formData.symbol,
          description: formData.description,
          twitter: formData.twitter,
          telegram: formData.telegram,
          website: formData.website,
        });

        setMetadataUri(response.data.metadataUri);
        // Use local image URL from our system (preferred) or extract from IPFS metadata
        let imageUrl = response.data.imageUrl || // Local image URL from our system
                      response.data.metadata?.image || 
                      response.data.metadata?.imageUri || 
                      response.data.metadata?.image_url ||
                      null;
        
        // If image URL not in response, fetch it from metadata URI
        if (!imageUrl && response.data.metadataUri) {
          try {
            // Convert IPFS URI to HTTP URL if needed
            let metadataUrl = response.data.metadataUri;
            if (metadataUrl.startsWith('ipfs://')) {
              metadataUrl = metadataUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
            }
            
            const metadataResponse = await fetch(metadataUrl);
            const metadata = await metadataResponse.json();
            imageUrl = metadata.image || metadata.imageUri || metadata.image_url || null;
            
            // Convert IPFS image URI to HTTP URL if needed
            if (imageUrl && imageUrl.startsWith('ipfs://')) {
              imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
            }
            
            console.log('[IMAGE UPLOAD] Fetched image URL from metadata URI:', imageUrl);
          } catch (err) {
            console.warn('[IMAGE UPLOAD] Could not fetch metadata from URI:', err);
          }
        }
        
        setIpfsImageUrl(imageUrl);
        console.log('[IMAGE UPLOAD] IPFS response:', response.data);
        console.log('[IMAGE UPLOAD] Final image URL:', imageUrl);
        setStep(2);
      };
      reader.readAsDataURL(formData.image);
    } catch (err) {
      console.error('Error uploading image:', err);
      error('Error uploading image: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateToken = async () => {
    if (!user || !user.walletAddress) {
      error('Please connect your wallet first');
      return;
    }

    if (!metadataUri) {
      error('Please upload image first');
      return;
    }

    // Create transaction and show modal for private key input
    try {
      setLoading(true);
      setStep(3);

      // Try to get vanity mint from pool first (instant, like pump.fun)
      // Falls back to local generation if pool is empty
      let mint;
      let mintSecretKeyBase58;
      
      try {
        console.log('[CREATE TOKEN] Getting vanity mint from backend API...');
        // Use backend API which will remove from JSON file after use
        const poolResponse = await getVanityMint();
        
        if (poolResponse && poolResponse.data && poolResponse.data.success && poolResponse.data.secretKey) {
          // Got from backend API - instant!
          console.log('✅ [CREATE TOKEN] Got vanity mint from backend:', poolResponse.data.mintAddress);
          console.log('   From pool:', poolResponse.data.fromPool);
          console.log('   Secret key exists:', !!poolResponse.data.secretKey);
          console.log('   Secret key type:', typeof poolResponse.data.secretKey);
          console.log('   Secret key length:', poolResponse.data.secretKey?.length);
          
          mintSecretKeyBase58 = poolResponse.data.secretKey;
          
          if (!mintSecretKeyBase58) {
            throw new Error('Secret key is missing from pool response');
          }
          
          if (typeof mintSecretKeyBase58 !== 'string') {
            throw new Error('Invalid secret key type from pool: ' + typeof mintSecretKeyBase58);
          }
          
          const decodedSecretKey = bs58.decode(mintSecretKeyBase58);
          console.log('   Decoded secret key length:', decodedSecretKey.length);
          
          // Validate secret key size (must be 64 bytes for Solana keypair)
          if (decodedSecretKey.length !== 64) {
            throw new Error(`Invalid secret key size: ${decodedSecretKey.length} bytes (expected 64). Secret key may be corrupted.`);
          }
          
          mint = Keypair.fromSecretKey(decodedSecretKey);
          setMintKeypair(mint);
          console.log('✅ [CREATE TOKEN] Using pool mint, skipping local generation');
        } else {
          throw new Error('Backend pool is empty or returned invalid mint');
        }
      } catch (poolError) {
        // Pool is empty or error - generate locally (slow)
        console.error('⚠️ [CREATE TOKEN] Pool unavailable, generating locally...');
        console.error('[CREATE TOKEN] Pool error object:', poolError);
        console.error('[CREATE TOKEN] Pool error response:', poolError.response?.data);
        console.error('[CREATE TOKEN] Pool error status:', poolError.response?.status);
        console.error('[CREATE TOKEN] Pool error message:', poolError.message);
        console.error('[CREATE TOKEN] Full error:', JSON.stringify(poolError, null, 2));
        const startTime = Date.now();
        
        const generatedMint = await generateVanityMintWithTimeout(300000, (progress) => {
          const elapsed = parseFloat(progress.elapsed);
          const rate = parseInt(progress.rate);
          const attempts = parseInt(progress.attempts);
          const estimatedTotalAttempts = 5650000;
          const remainingAttempts = Math.max(0, estimatedTotalAttempts - attempts);
          const estimatedSecondsRemaining = rate > 0 ? Math.ceil(remainingAttempts / rate) : 0;
          const estimatedMinutes = Math.ceil(estimatedSecondsRemaining / 60);
          console.log(`Progress: ${attempts.toLocaleString()} attempts, ~${rate}/sec, est. ${estimatedMinutes}min remaining`);
        });
        
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ Vanity mint generated locally in ${totalTime}s:`, generatedMint.publicKey.toBase58());
        mint = generatedMint;
        mintSecretKeyBase58 = bs58.encode(mint.secretKey);
        setMintKeypair(mint);
      }

      // Create token transaction
      // Send mint secret key to backend - backend will derive public key and send to pumpportal
      // We need the secret key back to sign the transaction
      // (mintSecretKeyBase58 is already set above from pool or local generation)
      const response = await createToken({
        tokenMetadata: {
          name: formData.name,
          symbol: formData.symbol,
          uri: metadataUri,
          description: formData.description,
          imageUrl: ipfsImageUrl || formData.imagePreview, // Use IPFS image URL if available, fallback to preview
          twitter: formData.twitter,
          telegram: formData.telegram,
          website: formData.website,
        },
        mint: mintSecretKeyBase58, // Secret key - backend converts to public key for pumpportal
        publicKey: user.walletAddress,
        amount: 0.01, // Dev buy of 0.01 SOL
        denominatedInSol: 'true',
        slippage: 10,
        priorityFee: 0.0005,
        pool: 'pump',
        isMayhemMode: 'false',
      });

      const txData = {
        transaction: response.data.transaction,
        mint,
      };
      setPendingTransaction(txData);
      pendingTransactionRef.current = txData; // Also store in ref

      // Try to get stored private key automatically
      try {
        const privateKeyResponse = await getPrivateKey();
        if (privateKeyResponse.data.success && privateKeyResponse.data.privateKey) {
          // We have the private key, sign and send automatically
          await handlePrivateKeyConfirm(privateKeyResponse.data.privateKey);
          return; // Exit early - transaction will be handled by handlePrivateKeyConfirm
        }
      } catch (keyError) {
        // If we can't get the private key, show modal for manual entry
        console.log('No stored private key, showing modal for manual entry');
      }

      // If we don't have stored private key, show modal
      setShowPrivateKeyModal(true);
      setLoading(false);
    } catch (err) {
      console.error('Error creating token:', err);
      error('Error creating token: ' + (err.response?.data?.error || err.message));
      setLoading(false);
      setStep(2);
    }
  };

  const handlePrivateKeyConfirm = async (privateKey) => {
    // Use ref to get current value (avoids stale closure issues)
    const txData = pendingTransactionRef.current;
    
    if (!txData) {
      error('No pending transaction found. Please try creating the token again.');
      setShowPrivateKeyModal(false);
      setPendingTransaction(null);
      setStep(2);
      return;
    }

    try {
      setProcessing(true);
      setStep(3);

      // Use pending transaction data
      const { transaction, mint } = txData;

      // Deserialize transaction
      const transactionBuffer = Buffer.from(transaction, 'base64');
      const tx = VersionedTransaction.deserialize(new Uint8Array(transactionBuffer));

      // Sign transaction
      const signerKeypair = Keypair.fromSecretKey(bs58.decode(privateKey));
      tx.sign([mint, signerKeypair]);

      // Send transaction using Helius RPC
      const connection = getSolanaConnection();

      const signature = await connection.sendTransaction(tx);
      console.log('Token created:', signature);
      
      // Clear state and close modal
      setPendingTransaction(null);
      pendingTransactionRef.current = null; // Clear ref too
      setShowPrivateKeyModal(false);
      setMintKeypair(null);
      
      success(`Token created successfully! View on Solscan: https://solscan.io/tx/${signature}`);
      
      // Navigate to token detail page
      setTimeout(() => {
        navigate(`/token/${mint.publicKey.toBase58()}`);
      }, 1500);
    } catch (err) {
      console.error('Error creating token:', err);
      
      // Handle insufficient funds error specifically
      let errorMessage = 'Error creating token: ' + (err.response?.data?.error || err.message);
      
      // Check if this is a SendTransactionError (has logs property)
      if (err.logs && Array.isArray(err.logs)) {
        const logs = err.logs;
        const insufficientFunds = logs.some(log => 
          typeof log === 'string' && log.includes('insufficient lamports')
        );
        
        if (insufficientFunds) {
          // Extract the balance and required amount from logs if available
          const insufficientLog = logs.find(log => 
            typeof log === 'string' && log.includes('insufficient lamports')
          );
          
          if (insufficientLog) {
            const match = insufficientLog.match(/insufficient lamports (\d+), need (\d+)/);
            if (match) {
              const hasLamports = parseInt(match[1]) / 1e9; // Convert to SOL
              const needsLamports = parseInt(match[2]) / 1e9; // Convert to SOL
              errorMessage = `Insufficient SOL balance. You have ${hasLamports.toFixed(4)} SOL but need ${needsLamports.toFixed(4)} SOL. Please add more SOL to your wallet.`;
            } else {
              errorMessage = 'Insufficient SOL balance. Please add more SOL to your wallet to cover transaction fees and the dev buy amount (0.01 SOL).';
            }
          } else {
            errorMessage = 'Insufficient SOL balance. Please add more SOL to your wallet to cover transaction fees and the dev buy amount (0.01 SOL).';
          }
        } else {
          // For other transaction errors, try to get more details
          errorMessage = 'Transaction failed: ' + (err.message || 'Unknown error');
          if (logs.length > 0) {
            console.error('Transaction logs:', logs);
          }
        }
      }
      
      error(errorMessage);
      setPendingTransaction(null);
      pendingTransactionRef.current = null; // Clear ref too
      setShowPrivateKeyModal(false);
      setStep(2);
    } finally {
      setProcessing(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Please login to create a token</div>
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

  if (!user.walletAddress) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Please connect your wallet first</div>
          <button
            onClick={() => navigate('/wallets')}
            className="px-6 py-3 bg-gradient-hot rounded-xl hover:opacity-90 transition-opacity font-semibold text-white"
          >
            Go to Wallets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <InputModal
        isOpen={showPrivateKeyModal}
        onClose={() => {
          setShowPrivateKeyModal(false);
          setPendingTransaction(null);
          pendingTransactionRef.current = null; // Clear ref too
          setProcessing(false);
          setStep(2);
        }}
        onConfirm={handlePrivateKeyConfirm}
        title="Enter Private Key"
        message="Enter your wallet private key (base58) to sign the transaction"
        placeholder="Private key (base58)"
        type="password"
        buttonText="Sign Transaction"
        closeOnConfirm={false}
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Create Token</h1>
          <p className="text-gray-400">Launch your token on Pump.fun</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-brand-400' : 'text-gray-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-brand-500' : 'bg-dark-800'}`}>
              1
            </div>
            <span className="font-semibold">Details</span>
          </div>
          <div className={`w-16 h-1 ${step >= 2 ? 'bg-brand-500' : 'bg-dark-800'}`} />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-brand-400' : 'text-gray-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-brand-500' : 'bg-dark-800'}`}>
              2
            </div>
            <span className="font-semibold">Upload</span>
          </div>
          <div className={`w-16 h-1 ${step >= 3 ? 'bg-brand-500' : 'bg-dark-800'}`} />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-brand-400' : 'text-gray-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-brand-500' : 'bg-dark-800'}`}>
              3
            </div>
            <span className="font-semibold">Create</span>
          </div>
        </div>

        {/* Form */}
        <div className="glass rounded-3xl p-8">
          {step === 1 && (
            <>
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Token Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="My Awesome Token"
                    className="w-full px-4 py-3 bg-dark-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>

                {/* Symbol */}
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Token Symbol *
                  </label>
                  <input
                    type="text"
                    name="symbol"
                    value={formData.symbol}
                    onChange={handleInputChange}
                    placeholder="MAT"
                    maxLength={10}
                    className="w-full px-4 py-3 bg-dark-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your token..."
                    rows={4}
                    className="w-full px-4 py-3 bg-dark-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {/* Image */}
                <div>
                  <label className="block text-sm font-semibold text-gray-400 mb-2">
                    Token Image *
                  </label>
                  {formData.imagePreview ? (
                    <div className="relative">
                      <img
                        src={formData.imagePreview}
                        alt="Preview"
                        className="w-32 h-32 rounded-xl object-cover"
                      />
                      <button
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-brand-500 transition-colors">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-gray-400">Click to upload image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Social Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">
                      Twitter
                    </label>
                    <input
                      type="url"
                      name="twitter"
                      value={formData.twitter}
                      onChange={handleInputChange}
                      placeholder="https://twitter.com/..."
                      className="w-full px-4 py-3 bg-dark-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">
                      Telegram
                    </label>
                    <input
                      type="url"
                      name="telegram"
                      value={formData.telegram}
                      onChange={handleInputChange}
                      placeholder="https://t.me/..."
                      className="w-full px-4 py-3 bg-dark-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      placeholder="https://..."
                      className="w-full px-4 py-3 bg-dark-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleImageUpload}
                  disabled={loading || !formData.name || !formData.symbol || !formData.image}
                  className="w-full py-4 bg-gradient-hot rounded-xl hover:opacity-90 transition-opacity font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Uploading...' : 'Next: Upload Image'}
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="text-center">
              <div className="text-green-400 mb-4">✅ Image uploaded successfully!</div>
              <button
                onClick={handleCreateToken}
                disabled={loading}
                className="w-full py-4 bg-gradient-hot rounded-xl hover:opacity-90 transition-opacity font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Token...' : 'Create Token'}
              </button>
              <button
                onClick={() => setStep(1)}
                className="w-full mt-4 py-3 text-gray-400 hover:text-white transition-colors"
              >
                Go Back
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <Loader className="w-16 h-16 text-brand-400 animate-spin mx-auto mb-4" />
              <div className="text-white text-xl mb-2">Creating your token...</div>
              <div className="text-gray-400">Please wait while we process your transaction</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

