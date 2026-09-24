const crypto = require('crypto');
const express = require('express');
const {
  createUser,
  findUserByEmail,
  findUserByResetToken,
  updateUserToken,
  savePasswordResetToken,
  clearPasswordResetToken,
  updateUserPassword,
} = require('../config/db');
const { invalidateCachedUser, requireAuth } = require('../middleware/auth');

const router = express.Router();

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const passwordHash = hashValue(password);
    const rawToken = createToken();
    const tokenHash = hashValue(rawToken);

    const user = await createUser({
      email: normalizedEmail,
      name: String(name).trim(),
      passwordHash,
      tokenHash,
    });

    return res.status(201).json({
      token: rawToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to register user.', details: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await findUserByEmail(normalizedEmail);
    if (!user || user.password_hash !== hashValue(password)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const rawToken = createToken();
    const tokenHash = hashValue(rawToken);
    invalidateCachedUser(user.id);
    await updateUserToken(user.id, tokenHash);

    return res.json({
      token: rawToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to log in.', details: error.message });
  }
});

router.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    await updateUserToken(req.user.id, null);
    invalidateCachedUser(req.user.id);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to log out.', details: error.message });
  }
});

// POST /api/auth/forgot-password
// Generates a reset token and returns it directly (no email — suitable for local/demo apps).
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await findUserByEmail(normalizedEmail);

    // Always respond the same way to avoid email enumeration
    if (!user) {
      return res.json({ message: 'If that email exists, a reset token has been generated.' });
    }

    const rawToken = createToken();
    const tokenHash = hashValue(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await savePasswordResetToken(user.id, tokenHash, expiresAt);

    // Return the raw token directly (no email service — copy this token to reset your password)
    return res.json({
      message: 'Reset token generated. Copy it to reset your password.',
      resetToken: rawToken,
      expiresIn: '1 hour',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate reset token.', details: error.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Reset token and new password are required.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const tokenHash = hashValue(String(token).trim());
    const user = await findUserByResetToken(tokenHash);

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    const expiresAt = user.reset_token_expires_at
      ? new Date(user.reset_token_expires_at)
      : null;

    if (!expiresAt || expiresAt <= new Date()) {
      return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    const passwordHash = hashValue(password);
    await updateUserPassword(user.id, passwordHash);
    await clearPasswordResetToken(user.id);
    // Invalidate any existing session tokens for security
    invalidateCachedUser(user.id);
    await updateUserToken(user.id, null);

    return res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to reset password.', details: error.message });
  }
});

module.exports = router;