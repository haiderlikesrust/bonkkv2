import express from 'express';
import authService from '../services/auth.js';
import userService from '../services/user.js';
import walletService from '../services/wallet.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register new account with email/password
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const emailExists = await userService.emailExists(email);
    if (emailExists) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await authService.hashPassword(password);

    // Create user (wallet will be created later when they connect one)
    const user = await userService.createUser(email, hashedPassword);

    // Generate JWT token
    const token = authService.generateToken({
      userId: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
      },
      token,
      message: 'Account created successfully',
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/login
 * Login with email/password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await userService.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValid = await authService.comparePassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = authService.generateToken({
      userId: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/connect-wallet
 * Connect wallet to account (requires authentication)
 */
router.post('/connect-wallet', async (req, res) => {
  try {
    const token = authService.extractToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = authService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { secretKey } = req.body;
    if (!secretKey) {
      return res.status(400).json({ error: 'Secret key required' });
    }

    // Create wallet from secret key
    const wallet = walletService.createFromSecretKey(secretKey);

    // Update user's wallet address and store encrypted private key
    const { config } = await import('../config/config.js');
    const user = await userService.updateWallet(
      decoded.userId, 
      wallet.publicKey, 
      wallet.secretKey, // Store the Base58 private key
      config.jwtSecret // Use JWT secret as encryption key
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      wallet: {
        address: wallet.publicKey,
      },
      message: 'Wallet connected successfully',
    });
  } catch (error) {
    console.error('Connect wallet error:', error);
    res.status(400).json({ error: 'Invalid secret key' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', async (req, res) => {
  try {
    const token = authService.extractToken(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = authService.verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await userService.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

/**
 * GET /api/auth/private-key
 * Get user's private key for signing transactions (requires authentication)
 * This is used to automatically sign transactions without asking user each time
 */
router.get('/private-key', async (req, res) => {
  try {
    const token = authService.extractToken(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = authService.verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { config } = await import('../config/config.js');
    const privateKey = await userService.getUserPrivateKey(decoded.userId, config.jwtSecret);
    
    if (!privateKey) {
      return res.status(404).json({ error: 'No private key stored for this user' });
    }

    res.json({
      success: true,
      privateKey, // Return decrypted private key
    });
  } catch (error) {
    console.error('Get private key error:', error);
    res.status(500).json({ error: 'Failed to retrieve private key' });
  }
});

export default router;
