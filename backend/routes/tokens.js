import express from 'express';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pumpPortalService from '../services/pumpportal.js';
import tokenService from '../services/token.js';
import transparencyService from '../services/transparency.js';
import vanityMintPool from '../services/vanityMintPool.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * GET /api/tokens/new
 * Get new tokens created on our platform
 * Market cap is updated from Pump.fun API if available
 */
router.get('/new', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    // Get tokens from our database (only tokens created on our platform)
    const tokens = await tokenService.getAllTokens(limit, offset);
    
    console.log(`[GET /api/tokens/new] Found ${tokens.length} tokens (limit: ${limit}, offset: ${offset})`);

    // Update market cap from Pump.fun API for each token (in background, don't wait)
    tokens.forEach(async (token) => {
      try {
        const coinInfo = await pumpPortalService.getCoinInfo(token.mint);
        if (coinInfo.usd_market_cap !== undefined) {
          await tokenService.updateToken(token.mint, {
            marketCap: coinInfo.usd_market_cap || 0,
          });
        }
      } catch (error) {
        // Silently fail - market cap update is not critical
        console.debug(`Failed to update market cap for ${token.mint}:`, error.message);
      }
    });

    res.json({
      success: true,
      tokens: tokens.map(token => ({
        mint: token.mint,
        name: token.name,
        symbol: token.symbol,
        marketCap: token.marketCap,
        progress: token.progress,
        createdAt: token.createdAtDisplay,
        imageUrl: token.imageUrl,
      })),
    });
  } catch (error) {
    console.error('Error in /tokens/new:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch tokens' });
  }
});

/**
 * Helper function to calculate time ago
 */
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}m ago`;
  }
}

/**
 * GET /api/tokens/my
 * Get tokens created by current user
 * NOTE: Must come before /:mint route to avoid route matching conflict
 */
router.get('/my', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.user.userId);
    console.log(`[GET /api/tokens/my] Fetching tokens for user ID: ${userId}`);
    
    const tokens = await tokenService.getTokensByCreator(userId);
    console.log(`[GET /api/tokens/my] Found ${tokens.length} tokens for user ${userId}`);

    // Update market cap and image from Pump.fun API for each token (in background)
    tokens.forEach(async (token) => {
      try {
        const coinInfo = await pumpPortalService.getCoinInfo(token.mint);
        const updates = {};
        
        if (coinInfo.usd_market_cap !== undefined) {
          updates.marketCap = coinInfo.usd_market_cap || 0;
        }
        
        // Save image if we don't have one but Pump.fun has one
        if (coinInfo.image_uri && !token.imageUrl) {
          updates.imageUrl = coinInfo.image_uri;
        }
        
        if (Object.keys(updates).length > 0) {
          await tokenService.updateToken(token.mint, updates);
        }
      } catch (error) {
        // Silently fail - updates are not critical
        console.debug(`Failed to update token data for ${token.mint}:`, error.message);
      }
    });

    res.json({
      success: true,
      tokens: tokens.map(token => ({
        id: token.id,
        mint: token.mint,
        name: token.name,
        symbol: token.symbol,
        marketCap: token.marketCap,
        progress: token.progress,
        createdAt: token.createdAtDisplay,
        imageUrl: token.imageUrl,
        feeDistribution: token.feeDistribution,
      })),
    });
  } catch (error) {
    console.error('Error in /tokens/my:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch user tokens' });
  }
});

/**
 * GET /api/tokens/vanity
 * Get a vanity mint from the pool (instant, like pump.fun)
 * Reads directly from database or JSON file
 * NOTE: Must be BEFORE /:mint route to avoid route conflict
 */
router.get('/vanity', authenticate, async (req, res) => {
  try {
    console.log('[VANITY API] Request received from user:', req.user.userId);
    
    let vanityMint = null;
    let secretKeyBase58 = null;
    let mintAddress = null;
    
    // Try to get from database pool first
    try {
      vanityMint = vanityMintPool.getVanityMint();
      if (vanityMint && vanityMint.secretKeyBase58) {
        secretKeyBase58 = vanityMint.secretKeyBase58;
        mintAddress = vanityMint.mintAddress;
        console.log('[VANITY API] ✅ Retrieved from database pool:', mintAddress);
      }
    } catch (dbError) {
      console.log('[VANITY API] Database pool error, trying JSON file...', dbError.message);
    }
    
    // If database pool is empty, read directly from JSON file
    if (!secretKeyBase58) {
      const jsonFile = path.join(__dirname, '../../vanity-mints-pool.json');
      
      if (fs.existsSync(jsonFile)) {
        console.log('[VANITY API] Reading from JSON file...');
        const fileContent = fs.readFileSync(jsonFile, 'utf8');
        const data = JSON.parse(fileContent);
        
        if (data.mints && data.mints.length > 0) {
          // Get first mint from JSON
          const mint = data.mints.shift(); // Remove first mint from array
          
          // Validate secret key format
          if (!mint.secretKey || !Array.isArray(mint.secretKey)) {
            console.error('[VANITY API] Invalid secret key format in JSON');
            throw new Error('Invalid secret key format in JSON file');
          }
          
          const secretKeyBytes = new Uint8Array(mint.secretKey);
          
          // Handle both 32-byte (private key only) and 64-byte (full keypair) formats
          let fullSecretKey;
          if (secretKeyBytes.length === 32) {
            // Only private key (seed) provided - need to derive full 64-byte keypair secret key
            console.log('[VANITY API] Secret key is 32 bytes, deriving full keypair secret key...');
            
            // Use tweetnacl (which Solana uses internally) to derive keypair from seed
            const nacl = await import('tweetnacl');
            const keyPair = nacl.sign.keyPair.fromSeed(secretKeyBytes);
            
            // Solana's secret key format is [32-byte seed + 32-byte public key] = 64 bytes
            fullSecretKey = new Uint8Array(64);
            fullSecretKey.set(secretKeyBytes, 0); // First 32 bytes: seed
            fullSecretKey.set(keyPair.publicKey, 32); // Last 32 bytes: public key
            
            // Validate the keypair matches the stored mint address
            const keypair = Keypair.fromSecretKey(fullSecretKey);
            const derivedAddress = keypair.publicKey.toBase58();
            if (derivedAddress !== mint.mintAddress) {
              console.error(`[VANITY API] Secret key does not match mint address. Derived: ${derivedAddress}, Expected: ${mint.mintAddress}`);
              throw new Error('Secret key does not match mint address');
            }
          } else if (secretKeyBytes.length === 64) {
            // Full 64-byte keypair secret key
            fullSecretKey = secretKeyBytes;
            
            // Validate the keypair can be created
            try {
              const testKeypair = Keypair.fromSecretKey(fullSecretKey);
              if (testKeypair.publicKey.toBase58() !== mint.mintAddress) {
                console.error('[VANITY API] Secret key does not match mint address');
                throw new Error('Secret key does not match mint address');
              }
            } catch (error) {
              console.error('[VANITY API] Failed to validate keypair:', error.message);
              throw new Error(`Invalid secret key: ${error.message}`);
            }
          } else {
            console.error(`[VANITY API] Invalid secret key size: ${secretKeyBytes.length} bytes (expected 32 or 64)`);
            throw new Error(`Invalid secret key size: ${secretKeyBytes.length} bytes (expected 32 or 64)`);
          }
          
          secretKeyBase58 = bs58.encode(fullSecretKey);
          mintAddress = mint.mintAddress;
          
          // Update count if it exists
          if (data.count !== undefined) {
            data.count = data.mints.length;
          }
          
          // Save updated JSON file (without the used mint)
          fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2));
          console.log('[VANITY API] ✅ Retrieved from JSON file and removed:', mintAddress);
          console.log(`[VANITY API] Remaining mints in pool: ${data.mints.length}`);
          
          // Also update frontend copy
          const frontendFile = path.join(__dirname, '../../frontend/public/vanity-mints-pool.json');
          if (fs.existsSync(frontendFile)) {
            fs.writeFileSync(frontendFile, JSON.stringify(data, null, 2));
            console.log('[VANITY API] ✅ Updated frontend copy');
          }
        }
      }
    }
    
    if (!secretKeyBase58 || !mintAddress) {
      return res.status(404).json({
        success: false,
        error: 'No vanity mints available',
        details: 'Pool is empty and JSON file not found. Run: npm run vanity-mints-cuda',
      });
    }
    
    const secretKey = String(secretKeyBase58);
    
    if (!secretKey || secretKey.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to encode secret key',
      });
    }
    
    console.log('[VANITY API] Returning mint:', mintAddress);
    console.log('[VANITY API] Secret key length:', secretKey.length);
    
    res.json({
      success: true,
      mintAddress: mintAddress,
      secretKey: secretKey,
      fromPool: !!vanityMint,
    });
  } catch (error) {
    console.error('[VANITY API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get vanity mint',
      details: error.message,
    });
  }
});

/**
 * GET /api/tokens/:mint
 * Get token data from our platform, or fetch from Pump.fun API if not found
 */
router.get('/:mint', optionalAuth, async (req, res) => {
  try {
    const { mint } = req.params;
    let token = await tokenService.findByMint(mint);

    // If not found in our database, fetch from Pump.fun API (but don't save to DB, just return)
    if (!token) {
      try {
        const pumpFunData = await pumpPortalService.getCoinInfo(mint);
        
        // Safely parse dates from Pump.fun API
        let createdAt, updatedAt, createdAtDisplay;
        try {
          if (pumpFunData.created_timestamp) {
            createdAt = new Date(pumpFunData.created_timestamp);
            if (isNaN(createdAt.getTime())) {
              createdAt = new Date();
            }
          } else {
            createdAt = new Date();
          }
          
          if (pumpFunData.updated_at) {
            updatedAt = new Date(pumpFunData.updated_at * 1000);
            if (isNaN(updatedAt.getTime())) {
              updatedAt = new Date();
            }
          } else {
            updatedAt = new Date();
          }
          
          createdAtDisplay = getTimeAgo(createdAt);
        } catch (dateError) {
          console.warn('Error parsing dates from Pump.fun data:', dateError);
          createdAt = new Date();
          updatedAt = new Date();
          createdAtDisplay = 'Just now';
        }
        
        // Convert Pump.fun API response to our token format
        // Note: This token is not in our DB, so we use Pump.fun's image_uri
        token = {
          id: mint,
          mint: pumpFunData.mint,
          name: pumpFunData.name,
          symbol: pumpFunData.symbol,
          description: pumpFunData.description,
          imageUrl: pumpFunData.image_uri || null, // Use Pump.fun image for tokens not in our DB
          metadataUri: pumpFunData.metadata_uri,
          creatorWallet: pumpFunData.creator,
          twitter: pumpFunData.twitter,
          telegram: null, // Pump.fun API doesn't provide telegram
          website: pumpFunData.website,
          marketCap: pumpFunData.usd_market_cap || 0,
          progress: pumpFunData.complete ? 100 : ((pumpFunData.virtual_sol_reserves / pumpFunData.total_supply) * 100) || 0,
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
          createdAtDisplay: createdAtDisplay,
          feeDistribution: { holders: 50, dev: 50, flywheel: 0, supportBonkv2: 0 }, // Default for Pump.fun tokens
          // Additional Pump.fun specific fields
          complete: pumpFunData.complete,
          usdMarketCap: pumpFunData.usd_market_cap,
          lastTradeTimestamp: pumpFunData.last_trade_timestamp,
          athMarketCap: pumpFunData.ath_market_cap,
        };
      } catch (pumpFunError) {
        console.error('Error fetching from Pump.fun:', pumpFunError);
        return res.status(404).json({ error: 'Token not found in our platform or on Pump.fun' });
      }
    }

    // Always use saved imageUrl from our database (token.imageUrl comes from mapRowToToken which uses row.image_url)
    res.json({
      success: true,
      token: {
        id: token.id,
        mint: token.mint,
        name: token.name,
        symbol: token.symbol,
        description: token.description,
        imageUrl: token.imageUrl, // This will be from our DB (saved image) if token exists in DB
        metadataUri: token.metadataUri,
        creatorWallet: token.creatorWallet,
        marketCap: token.marketCap,
        progress: token.progress,
        twitter: token.twitter,
        telegram: token.telegram,
        website: token.website,
        createdAt: token.createdAt,
        createdAtDisplay: token.createdAtDisplay,
        // Include additional fields if available (from Pump.fun)
        ...(token.usdMarketCap && { usdMarketCap: token.usdMarketCap }),
        ...(token.athMarketCap && { athMarketCap: token.athMarketCap }),
        ...(token.complete !== undefined && { complete: token.complete }),
      },
    });
  } catch (error) {
    console.error('Error in /tokens/:mint:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch token' });
  }
});

/**
 * PUT /api/tokens/:mint/fees
 * Update fee distribution for a token
 */
router.put('/:mint/fees', authenticate, async (req, res) => {
  try {
    const { mint } = req.params;
    const { feeDistribution } = req.body;

    // Verify user owns this token
    const token = await tokenService.findByMint(mint);
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    if (parseInt(token.creatorUserId) !== parseInt(req.user.userId)) {
      return res.status(403).json({ error: 'You do not have permission to update this token' });
    }

    // Validate fee distribution
    const { holders, dev, flywheel, supportBonkv2 } = feeDistribution;
    const total = holders + dev + flywheel + supportBonkv2;
    if (total !== 100) {
      return res.status(400).json({ error: 'Fee distribution must total 100%' });
    }

    // Update token
    const updatedToken = await tokenService.updateToken(mint, { feeDistribution });

    res.json({
      success: true,
      token: {
        mint: updatedToken.mint,
        feeDistribution: updatedToken.feeDistribution,
      },
      message: 'Fee distribution updated successfully',
    });
  } catch (error) {
    console.error('Error in /tokens/:mint/fees:', error);
    res.status(500).json({ error: error.message || 'Failed to update fee distribution' });
  }
});

/**
 * POST /api/tokens/upload-image
 * Upload image to IPFS (required before token creation) AND save locally
 */
router.post('/upload-image', authenticate, async (req, res) => {
  try {
    // Note: In production, use multer or similar to handle file uploads
    // This is a simplified version
    const { imageBase64, fileName, name, symbol, description, twitter, telegram, website } = req.body;

    if (!imageBase64 || !name || !symbol) {
      return res.status(400).json({ error: 'Image, name, and symbol are required' });
    }

    // Convert base64 to buffer
    // Handle both "data:image/png;base64,xxx" and raw base64
    let base64Data = imageBase64;
    if (imageBase64.includes(',')) {
      base64Data = imageBase64.split(',')[1];
    }
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Save image locally first
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'images');
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const fileExtension = fileName?.split('.').pop() || 'png';
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const localFilePath = path.join(uploadsDir, uniqueFileName);
    
    // Save image to local storage
    fs.writeFileSync(localFilePath, imageBuffer);
    const localImageUrl = `/uploads/images/${uniqueFileName}`;
    console.log('✅ Image saved locally:', localImageUrl);

    // Also upload to IPFS (still needed for PumpPortal)
    const ipfsResult = await pumpPortalService.uploadImageToIPFS(imageBuffer, fileName || 'token.png', {
      name,
      symbol,
      description,
      twitter,
      telegram,
      website,
      showName: true,
    });

    res.json({
      success: true,
      metadataUri: ipfsResult.metadataUri,
      metadata: ipfsResult.metadata,
      imageUrl: localImageUrl, // Return local image URL (served from our system)
      message: 'Image uploaded to IPFS and saved locally successfully',
    });
  } catch (error) {
    console.error('Upload image error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error response:', error.response?.data);
    res.status(500).json({ 
      error: error.message || 'Failed to upload image',
      details: error.response?.data || error.stack,
    });
  }
});

/**
 * POST /api/tokens/create
 * Get token creation transaction (Local API - returns transaction to sign)
 * Also stores token in our database
 * Docs: https://pumpportal.fun/creation
 */
router.post('/create', authenticate, async (req, res) => {
  try {
    const {
      tokenMetadata, // { name, symbol, uri, description, twitter, telegram, website }
      mint, // Base58 encoded mint keypair secret key (or mint address)
      publicKey, // User's wallet public key
      amount, // Dev buy amount
      denominatedInSol = 'true',
      slippage = 10,
      priorityFee = 0.0005,
      pool = 'pump',
      isMayhemMode = 'false',
      quoteMint, // For Bonk tokens
    } = req.body;

    if (!tokenMetadata || !mint || !publicKey || !amount) {
      return res.status(400).json({ 
        error: 'tokenMetadata, mint, publicKey, and amount are required' 
      });
    }

    // The mint parameter is the secret key in base58 format (from pumpportal requirement)
    // We need to derive the public key (mint address) from it for database storage
    let mintAddress;
    try {
      // Try to decode as secret key (base58) and derive public key
      console.log('[CREATE TOKEN] Attempting to decode mint secret key, length:', mint?.length);
      const secretKey = bs58.decode(mint);
      console.log('[CREATE TOKEN] Decoded secret key length:', secretKey.length);
      const mintKeypair = Keypair.fromSecretKey(secretKey);
      mintAddress = mintKeypair.publicKey.toBase58();
      console.log('[CREATE TOKEN] Derived mint address from secret key:', mintAddress);
    } catch (error) {
      // If decoding fails, assume mint is already the public key (backward compatibility)
      console.error('[CREATE TOKEN] Error decoding mint secret key:', error.message);
      console.error('[CREATE TOKEN] Error stack:', error.stack);
      console.warn('[CREATE TOKEN] Could not decode mint as secret key, using as public key');
      mintAddress = mint;
    }

    // Store token in our database FIRST
    // If storage fails, we should NOT create the transaction
    // This ensures tokens in our database match tokens created on-chain
    let storedToken;
    try {
      console.log('[CREATE TOKEN] Attempting to store token in database...');
      console.log('[CREATE TOKEN] Mint address:', mintAddress);
      console.log('[CREATE TOKEN] Creator user ID:', req.user.userId);
      console.log('[CREATE TOKEN] Creator wallet:', publicKey);
      
      storedToken = await tokenService.createToken({
        mint: mintAddress,
        name: tokenMetadata.name,
        symbol: tokenMetadata.symbol,
        description: tokenMetadata.description,
        imageUrl: tokenMetadata.imageUrl,
        metadataUri: tokenMetadata.uri,
        creatorUserId: parseInt(req.user.userId),
        creatorWallet: publicKey,
        twitter: tokenMetadata.twitter,
        telegram: tokenMetadata.telegram,
        website: tokenMetadata.website,
      });
      console.log('✅ Token stored successfully in database:', storedToken.mint);
    } catch (dbError) {
      // If token already exists, check if it's the same creator trying to reuse
      if (dbError.message.includes('already exists') || dbError.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        console.log('ℹ️ Token already exists in database:', mintAddress);
        storedToken = await tokenService.findByMint(mintAddress);
        if (!storedToken) {
          return res.status(500).json({
            error: 'Token exists but could not be retrieved from database',
          });
        }
        
        // Check if this is the same creator
        if (storedToken.creatorUserId.toString() !== req.user.userId.toString()) {
          return res.status(409).json({
            error: 'This mint address is already used by another creator',
            details: 'Each token must have a unique mint address. The vanity wallet you are using has already been used to create a token.',
          });
        }
        
        // Same creator trying to reuse - this might be intentional (retry) or they want to create a new token
        // Since we can't create a new token with the same mint, return an error
        // IMPORTANT: Don't proceed to pumpportal if token already exists
        return res.status(409).json({
          error: 'Token with this mint address already exists',
          details: 'You have already created a token with this mint address. Each token must have a unique mint address. If you want to create a new token, you need to use a different mint keypair.',
          existingToken: {
            mint: storedToken.mint,
            name: storedToken.name,
            symbol: storedToken.symbol,
          },
        });
      } else {
        // CRITICAL: If storage fails, DO NOT create transaction
        console.error('❌ CRITICAL ERROR: Failed to store token in database!');
        console.error('  Error message:', dbError.message);
        console.error('  Error code:', dbError.code);
        console.error('  Error stack:', dbError.stack);
        console.error('  Mint address:', mintAddress);
        console.error('  User ID:', req.user.userId);
        console.error('  Transaction creation ABORTED - token will NOT be created on-chain');
        
        return res.status(500).json({
          error: 'Failed to store token in database. Transaction creation aborted.',
          details: dbError.message,
          code: dbError.code,
        });
      }
    }

    // Only proceed with transaction creation if token was successfully stored
    // Get create transaction (returns serialized transaction)
    // Note: pumpportal expects the mint public key (address), not the secret key
    // The secret key is used later to sign the transaction on the client side
    console.log('[CREATE TOKEN] Calling pumpportal API with mint address:', mintAddress);
    try {
      const transactionBuffer = await pumpPortalService.getCreateTokenTransaction({
        publicKey,
        tokenMetadata: {
          name: tokenMetadata.name,
          symbol: tokenMetadata.symbol,
          uri: tokenMetadata.uri,
        },
        mint: mintAddress, // Send mint public key (address) to pumpportal
        amount,
        denominatedInSol,
        slippage,
        priorityFee,
        pool,
        isMayhemMode,
        quoteMint,
      });
      console.log('[CREATE TOKEN] Successfully received transaction from pumpportal');

      // Convert to base64 for JSON response
      const transactionBase64 = Buffer.from(transactionBuffer).toString('base64');

      res.json({
        success: true,
        transaction: transactionBase64,
        mint: mint, // Return the secret key (base58) to frontend for signing
        mintAddress: mintAddress, // Also return the public key for reference
        message: 'Token stored and transaction ready to sign and send',
        instructions: 'Deserialize this transaction, sign it with your wallet, and send it to Solana RPC',
      });
    } catch (pumpportalError) {
      console.error('[CREATE TOKEN] Error calling pumpportal API:', pumpportalError.message);
      console.error('[CREATE TOKEN] Pumpportal error response:', pumpportalError.response?.data);
      console.error('[CREATE TOKEN] Pumpportal error status:', pumpportalError.response?.status);
      
      // Try to extract error message from response
      let errorMessage = pumpportalError.message || 'Failed to create token transaction';
      if (pumpportalError.response?.data) {
        try {
          if (pumpportalError.response.data instanceof ArrayBuffer) {
            const decoder = new TextDecoder();
            errorMessage = decoder.decode(pumpportalError.response.data);
          } else if (Buffer.isBuffer(pumpportalError.response.data)) {
            errorMessage = pumpportalError.response.data.toString();
          } else if (typeof pumpportalError.response.data === 'object') {
            errorMessage = JSON.stringify(pumpportalError.response.data);
          } else {
            errorMessage = pumpportalError.response.data.toString();
          }
        } catch (parseError) {
          console.error('[CREATE TOKEN] Could not parse pumpportal error:', parseError);
        }
      }
      
      throw new Error(`Pumpportal API error: ${errorMessage}`);
    }
  } catch (error) {
    console.error('Create token error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error response:', error.response?.data);
    
    // Provide more detailed error information
    let errorMessage = error.message || 'Failed to create token transaction';
    let errorDetails = error.response?.data || error.stack;
    
    // If it's an axios error from pumpportal, extract more details
    if (error.response) {
      try {
        // Try to parse the response if it's text/buffer
        if (error.response.data instanceof ArrayBuffer) {
          const decoder = new TextDecoder();
          errorDetails = decoder.decode(error.response.data);
        } else if (Buffer.isBuffer(error.response.data)) {
          errorDetails = error.response.data.toString();
        } else {
          errorDetails = error.response.data;
        }
      } catch (parseError) {
        errorDetails = 'Could not parse error response';
      }
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails,
    });
  }
});

/**
 * POST /api/tokens/:mint/buy
 * Get buy transaction (Local API - returns transaction to sign)
 * Docs: https://pumpportal.fun/local-trading-api/trading-api
 */
router.post('/:mint/buy', authenticate, async (req, res) => {
  try {
    const { mint } = req.params;
    const { 
      publicKey,
      amount, 
      denominatedInSol = 'true',
      slippage = 10,
      priorityFee = 0.00001,
      pool = 'auto',
    } = req.body;

    if (!publicKey || !amount) {
      return res.status(400).json({ error: 'publicKey and amount are required' });
    }

    // Get buy transaction from PumpPortal
    const response = await pumpPortalService.getBuyTransaction({
      publicKey,
      mint,
      amount,
      denominatedInSol,
      slippage,
      priorityFee,
      pool,
    });

    // Response should be ArrayBuffer, convert to base64
    let transactionBase64;
    if (response instanceof ArrayBuffer || response instanceof Uint8Array) {
      transactionBase64 = Buffer.from(response).toString('base64');
    } else if (typeof response === 'string') {
      transactionBase64 = response;
    } else {
      transactionBase64 = Buffer.from(JSON.stringify(response)).toString('base64');
    }

    res.json({
      success: true,
      serializedTransaction: transactionBase64,
      message: 'Buy transaction ready to sign and send',
    });
  } catch (error) {
    console.error('Buy token error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create buy transaction',
      details: error.response?.data,
    });
  }
});

/**
 * POST /api/tokens/:mint/sell
 * Get sell transaction (Local API - returns transaction to sign)
 * Docs: https://pumpportal.fun/local-trading-api/trading-api
 */
router.post('/:mint/sell', authenticate, async (req, res) => {
  try {
    const { mint } = req.params;
    const { 
      publicKey,
      amount, // Can be number or "100%" for percentage
      denominatedInSol = 'false',
      slippage = 10,
      priorityFee = 0.00001,
      pool = 'auto',
    } = req.body;

    if (!publicKey || !amount) {
      return res.status(400).json({ error: 'publicKey and amount are required' });
    }

    // Get sell transaction from PumpPortal
    const response = await pumpPortalService.getSellTransaction({
      publicKey,
      mint,
      amount,
      denominatedInSol,
      slippage,
      priorityFee,
      pool,
    });

    // Response should be ArrayBuffer, convert to base64
    let transactionBase64;
    if (response instanceof ArrayBuffer || response instanceof Uint8Array) {
      transactionBase64 = Buffer.from(response).toString('base64');
    } else if (typeof response === 'string') {
      transactionBase64 = response;
    } else {
      transactionBase64 = Buffer.from(JSON.stringify(response)).toString('base64');
    }

    res.json({
      success: true,
      serializedTransaction: transactionBase64,
      message: 'Sell transaction ready to sign and send',
    });
  } catch (error) {
    console.error('Sell token error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create sell transaction',
      details: error.response?.data,
    });
  }
});

/**
 * POST /api/tokens/collect-fees
 * Manually trigger fee collection for all tokens (admin/creator only)
 */
router.post('/collect-fees', authenticate, async (req, res) => {
  try {
    // In production, you might want to restrict this to admins or token creators only
    const feeCollectionService = (await import('../services/feeCollection.js')).default;
    
    // Run fee collection in background
    feeCollectionService.collectAllFees()
      .then(results => {
        console.log('Fee collection completed:', results);
      })
      .catch(error => {
        console.error('Fee collection error:', error);
      });

    res.json({
      success: true,
      message: 'Fee collection started in background',
    });
  } catch (error) {
    console.error('Error starting fee collection:', error);
    res.status(500).json({ error: error.message || 'Failed to start fee collection' });
  }
});

/**
 * GET /api/tokens/:mint/chart
 * Get candlestick chart data for a token from Pump.fun trades
 */
router.get('/:mint/chart', optionalAuth, async (req, res) => {
  try {
    const { mint } = req.params;
    const { timeframe = '1h', limit = 1000 } = req.query;

    // Validate timeframe
    const validTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
    const chartTimeframe = validTimeframes.includes(timeframe) ? timeframe : '1h';

    // Validate and parse limit
    const chartLimit = Math.min(Math.max(parseInt(limit) || 1000, 1), 10000); // Between 1 and 10000

    console.log(`[GET /api/tokens/${mint}/chart] Fetching chart data (timeframe: ${chartTimeframe}, limit: ${chartLimit})`);

    // Fetch candlestick data from Pump.fun trades
    const candles = await pumpPortalService.getCandlestickData(mint, chartTimeframe, chartLimit);

    res.json({
      success: true,
      chart: {
        mint,
        timeframe: chartTimeframe,
        candles: candles,
        count: candles.length,
      },
    });
  } catch (error) {
    console.error('Error in /tokens/:mint/chart:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch chart data',
      details: error.response?.data,
    });
  }
});

/**
 * GET /api/tokens/:mint/trades
 * Get raw trades data for a token from Pump.fun
 */
router.get('/:mint/trades', optionalAuth, async (req, res) => {
  try {
    const { mint } = req.params;
    const { limit = 100, offset = 0, minimumSize = 0 } = req.query;

    const trades = await pumpPortalService.getTrades(mint, {
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0,
      minimumSize: parseFloat(minimumSize) || 0,
    });

    res.json({
      success: true,
      trades: trades,
      count: Array.isArray(trades) ? trades.length : 0,
    });
  } catch (error) {
    console.error('Error in /tokens/:mint/trades:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch trades',
      details: error.response?.data,
    });
  }
});

/**
 * GET /api/tokens/:mint/transactions
 * Get transaction history for a token
 */
router.get('/:mint/transactions', optionalAuth, async (req, res) => {
  try {
    const { mint } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    let transactions;
    try {
      transactions = await transparencyService.getTokenTransactionHistory(mint, limit);
    } catch (error) {
      console.error('Error fetching token transactions:', error.message);
      // Return empty array if fetch fails (token might not exist on-chain yet)
      transactions = [];
    }

    res.json({
      success: true,
      transactions: transactions.map(tx => ({
        signature: tx.signature,
        blockTime: tx.blockTime,
        slot: tx.slot,
        status: tx.status,
        fee: tx.fee,
        solscanUrl: `https://solscan.io/tx/${tx.signature}`,
      })),
      count: transactions.length,
    });
  } catch (error) {
    console.error('Error fetching token transactions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch transactions' });
  }
});

/**
 * GET /api/tokens/:mint/transfers
 * Get token transfers for a token
 */
router.get('/:mint/transfers', optionalAuth, async (req, res) => {
  try {
    const { mint } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const transfers = await transparencyService.getTokenTransfers(mint, limit);

    res.json({
      success: true,
      transfers: transfers.map(transfer => ({
        signature: transfer.signature,
        blockTime: transfer.blockTime,
        from: transfer.from,
        to: transfer.to,
        amount: transfer.amount,
        type: transfer.type,
        solscanUrl: `https://solscan.io/tx/${transfer.signature}`,
      })),
      count: transfers.length,
    });
  } catch (error) {
    console.error('Error fetching token transfers:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch transfers' });
  }
});

/**
 * GET /api/tokens/:mint/creator-activity
 * Get creator wallet activity for a token
 */
router.get('/:mint/creator-activity', optionalAuth, async (req, res) => {
  try {
    const { mint } = req.params;
    
    // Get token to find creator wallet
    const token = await tokenService.findByMint(mint);
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const creatorWallet = token.creatorWallet;
    
    if (!creatorWallet) {
      return res.status(400).json({ error: 'Token has no creator wallet' });
    }
    
    // Get wallet stats (with error handling)
    let walletStats;
    let recentTxs = [];
    
    try {
      walletStats = await transparencyService.getWalletStats(creatorWallet);
    } catch (error) {
      console.error('Error fetching wallet stats:', error.message);
      // Return default stats if fetch fails
      walletStats = {
        address: creatorWallet,
        balance: 0,
        balanceLamports: 0,
        transactionCount: 0,
        solscanUrl: `https://solscan.io/account/${creatorWallet}`,
        error: error.message,
      };
    }
    
    // Get recent transactions (with error handling)
    try {
      recentTxs = await transparencyService.getWalletTransactionHistory(creatorWallet, 20);
    } catch (error) {
      console.error('Error fetching wallet transactions:', error.message);
      // Return empty array if fetch fails
      recentTxs = [];
    }

    res.json({
      success: true,
      creator: {
        wallet: creatorWallet,
        stats: walletStats,
        recentTransactions: recentTxs.map(tx => ({
          signature: tx.signature,
          blockTime: tx.blockTime,
          status: tx.status,
          balanceChange: tx.balanceChange,
          fee: tx.fee,
          solscanUrl: tx.solscanUrl,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching creator activity:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch creator activity' });
  }
});

/**
 * POST /api/rpc/send-transaction
 * Proxy RPC call to send transaction
 */
router.post('/rpc/send-transaction', authenticate, async (req, res) => {
  try {
    const { transaction } = req.body;
    
    if (!transaction) {
      return res.status(400).json({ error: 'Transaction is required' });
    }

    // Import Connection here to avoid circular dependencies
    const { Connection } = await import('@solana/web3.js');
    const { config } = await import('../config/config.js');
    
    const connection = new Connection(config.solana.rpcUrl, {
      commitment: 'confirmed',
      httpHeaders: config.solana.heliusApiKey ? {
        'x-api-key': config.solana.heliusApiKey,
      } : undefined,
    });

    // Convert base64 transaction back to buffer
    const transactionBuffer = Buffer.from(transaction, 'base64');
    const tx = (await import('@solana/web3.js')).VersionedTransaction.deserialize(
      new Uint8Array(transactionBuffer)
    );

    // Send transaction
    const signature = await connection.sendTransaction(tx);

    res.json({
      success: true,
      signature,
    });
  } catch (error) {
    console.error('Error sending transaction:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to send transaction',
    });
  }
});

/**
 * GET /api/tokens/:mint/fee-history
 * Get fee collection and distribution history
 */
router.get('/:mint/fee-history', optionalAuth, async (req, res) => {
  try {
    const { mint } = req.params;
    
    // Get token to find creator wallet and fee distribution
    const token = await tokenService.findByMint(mint);
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const creatorWallet = token.creatorWallet;
    const feeDistribution = token.feeDistribution || { holders: 0, dev: 100, flywheel: 0, supportBonkv2: 0 };
    
    // Get fee collection transactions
    const feeTransactions = await transparencyService.getFeeCollectionHistory(mint, creatorWallet);

    res.json({
      success: true,
      feeDistribution: feeDistribution,
      feeHistory: feeTransactions.map(tx => ({
        signature: tx.signature,
        blockTime: tx.blockTime,
        status: tx.status,
        balanceChange: tx.balanceChange,
        solscanUrl: tx.solscanUrl,
      })),
      count: feeTransactions.length,
    });
  } catch (error) {
    console.error('Error fetching fee history:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch fee history' });
  }
});


export default router;
