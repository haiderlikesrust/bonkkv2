import express from 'express';
import cors from 'cors';
import { config } from './config/config.js';
import logger from './utils/logger.js';

// Routes
import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallets.js';
import tokenRoutes from './routes/tokens.js';

// Services
import feeCollectionService from './services/feeCollection.js';

const app = express();

// Middleware
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' })); // Increase limit for image uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Increase limit for image uploads

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'bonkv2.fun backend',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/tokens', tokenRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined,
  });
});

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  logger.success(`🚀 bonkv2.fun backend server running on port ${PORT}`);
  logger.info(`📍 Health check: http://localhost:${PORT}/health`);
  logger.info(`🔗 PumpPortal API: ${config.pumpPortal.baseUrl}`);
  logger.info(`🌐 Environment: ${config.nodeEnv}`);
  
  // Start automatic fee collection (runs every hour)
  // Fee collection is enabled by default. Set DISABLE_FEE_COLLECTION=true to disable
  if (process.env.DISABLE_FEE_COLLECTION === 'true') {
    logger.info(`💰 Fee collection disabled (set DISABLE_FEE_COLLECTION=false to enable)`);
  } else {
    logger.info(`💰 Starting automatic fee collection (every 1 hour)`);
    feeCollectionService.startAutoCollection(1);
  }
});

export default app;

