/**
 * auth.js — Nirikshan Mitra Authentication & Role-Based Authorization Module
 *
 * Implements:
 * - Password hashing and verification via bcryptjs
 * - JWT token signing and verification with configurable JWT_SECRET
 * - Authentication middleware (authenticateToken) enforcing valid, active user sessions
 * - Authorization middleware (requireAdmin) enforcing Administrator role checks
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { userRepository } = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'nirikshan-mitra-prototype-jwt-secret-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/**
 * Hashes a plaintext password with bcrypt (cost factor 10)
 */
async function hashPassword(plaintext) {
  if (!plaintext || typeof plaintext !== 'string' || plaintext.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  return await bcrypt.hash(plaintext, 10);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash
 */
async function verifyPassword(plaintext, hash) {
  if (!plaintext || !hash) return false;
  try {
    return await bcrypt.compare(plaintext, hash);
  } catch (err) {
    return false;
  }
}

/**
 * Signs a JWT token containing user identity and role
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verifies a JWT token and decodes payload
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Express middleware to authenticate incoming requests via JWT
 * Rejects unauthenticated requests with HTTP 401
 */
async function authenticateToken(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string') {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      token = parts[1].trim();
    }
  }

  if (!token && req.headers['x-access-token']) {
    token = String(req.headers['x-access-token']).trim();
  }

  if (!token && req.query && req.query.token) {
    token = String(req.query.token).trim();
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in to access this resource.'
    });
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication credential.'
      });
    }

    // Verify user exists and is active in SQLite database
    const user = await userRepository.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authenticated user record no longer exists.'
      });
    }

    if (!user.active) {
      return res.status(401).json({
        success: false,
        error: 'User account is deactivated. Please contact an Administrator.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Authentication session expired. Please sign in again.'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid or malformed authentication credential.'
    });
  }
}

/**
 * Express middleware to enforce Administrator-only operations
 * Rejects non-admin users with HTTP 403
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required.'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access forbidden. Administrator privileges are required to perform this action.'
    });
  }

  next();
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  authenticateToken,
  requireAdmin
};
