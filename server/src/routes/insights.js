const express = require('express');
const { getUserInsights } = require('../services/insightEngine');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const payload = await getUserInsights(req.user.id);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load nutrition insights.', details: error.message });
  }
});

module.exports = router;