const crypto = require('crypto');
const { findUserByToken } = require('../config/db');

function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
}

async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({ error: 'Authorization token is required.' });
    }

    const passwordHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await findUserByToken(passwordHash);

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
};