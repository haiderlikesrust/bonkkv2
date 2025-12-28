import express from 'express';
import walletService from '../services/wallet.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/wallets/create
 * Create a new wallet (no authentication required)
 * Note: Users should connect wallet via /api/auth/connect-wallet after registering
 */
router.post('/create', async (req, res) => {
  try {
    const wallet = walletService.generateWallet();

    res.json({
      success: true,
      wallet: {
        address: wallet.publicKey,
        secretKey: wallet.secretKey, // Base58 format (preferred)
        secretKeyArray: wallet.secretKeyArray, // Array format
        secretKeyHex: wallet.secretKeyHex,
        secretKeyBase64: wallet.secretKeyBase64,
      },
      warning: 'Store your secret key securely! This is the only time it will be shown. Use the Base58 format (secretKey) for connecting wallets.',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/wallets/dev
 * Create a dev/test wallet
 */
router.post('/dev', async (req, res) => {
  try {
    const wallet = walletService.createDevWallet();

    res.json({
      success: true,
      wallet: {
        address: wallet.publicKey,
        secretKey: wallet.secretKey, // Base58 format (preferred)
        secretKeyArray: wallet.secretKeyArray, // Array format
        secretKeyHex: wallet.secretKeyHex,
        secretKeyBase64: wallet.secretKeyBase64,
        type: wallet.type,
        createdAt: wallet.createdAt,
      },
      warning: 'This is a dev wallet for testing only. Do not use for production. Use the Base58 format (secretKey) for connecting wallets.',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/wallets/import
 * Import wallet from secret key (requires authentication)
 */
router.post('/import', authenticate, async (req, res) => {
  try {
    const { secretKey } = req.body;

    if (!secretKey) {
      return res.status(400).json({ error: 'Secret key required' });
    }

    const wallet = walletService.createFromSecretKey(secretKey);

    res.json({
      success: true,
      wallet: {
        address: wallet.publicKey,
        // Don't return secret key on import
      },
      message: 'Wallet imported successfully',
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid secret key format' });
  }
});

export default router;
