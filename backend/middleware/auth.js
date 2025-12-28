import authService from '../services/auth.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = (req, res, next) => {
  try {
    const token = authService.extractToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = authService.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Optional authentication middleware
 * Doesn't fail if no token, but attaches user if token is valid
 */
export const optionalAuth = (req, res, next) => {
  try {
    const token = authService.extractToken(req.headers.authorization);

    if (token) {
      const decoded = authService.verifyToken(token);
      if (decoded) {
        req.user = decoded;
      }
    }

    next();
  } catch (error) {
    next();
  }
};

