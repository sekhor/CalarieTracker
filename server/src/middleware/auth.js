const crypto = require('crypto');
const { findUserByToken, getDbStatus } = require('../config/db');

const TOKEN_CACHE_TTL_MS = 15000;
const TOKEN_CACHE_MAX_ENTRIES = 1000;
const tokenUserCache = new Map();

function getCachedUser(tokenHash) {
  const cached = tokenUserCache.get(tokenHash);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    tokenUserCache.delete(tokenHash);
    return null;
  }
  return cached.user;
}

function cacheUser(tokenHash, user) {
  if (tokenUserCache.size >= TOKEN_CACHE_MAX_ENTRIES) {
    const oldestKey = tokenUserCache.keys().next().value;
    tokenUserCache.delete(oldestKey);
  }
  tokenUserCache.set(tokenHash, { user, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });
}

function invalidateCachedUser(userId) {
  for (const [tokenHash, cached] of tokenUserCache.entries()) {
    if (String(cached.user?.id) === String(userId)) {
      tokenUserCache.delete(tokenHash);
    }
  }
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
}

async function requireAuth(req, res, next) {
  try {
    const dbStatus = getDbStatus();
    if (dbStatus.connectionState === 'connecting' && process.env.MSSQL_SERVER) {
      res.setHeader('Retry-After', '2');
      return res.status(503).json({ error: 'Database is initializing. Please retry shortly.' });
    }

    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({ error: 'Authorization token is required.' });
    }

    const passwordHash = crypto.createHash('sha256').update(token).digest('hex');
    let user = getCachedUser(passwordHash);
    if (!user) {
      user = await findUserByToken(passwordHash);
      if (user) cacheUser(passwordHash, user);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    return next();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to authenticate request.', details: error.message });
  }
}

module.exports = {
  requireAuth,
  getTokenFromRequest,
  invalidateCachedUser,
};