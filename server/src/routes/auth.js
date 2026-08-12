const crypto = require('crypto');
const express = require('express');
const {
  createUser,
  findUserByEmail,
  updateUserToken,
} = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

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

module.exports = router;