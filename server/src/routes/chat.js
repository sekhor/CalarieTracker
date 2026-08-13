const express = require('express');
const { handleChatMessage } = require('../services/chatAdvisor');
const { listMessages, listSessions } = require('../services/chatHistory');

const router = express.Router();

router.get('/sessions', async (req, res) => {
  try {
    const sessions = await listSessions(req.user.id);
    return res.json({ sessions });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch chat sessions.', details: error.message });
  }
});

router.get('/sessions/:id/messages', async (req, res) => {
  try {
    const messages = await listMessages(req.user.id, req.params.id, 100);
    return res.json({ messages });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch chat messages.', details: error.message });
  }
});

router.post('/message', async (req, res) => {
  try {
    const { session_id: sessionId = null, message = '' } = req.body;
    if (!String(message || '').trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const result = await handleChatMessage({
      userId: req.user.id,
      sessionId,
      message: String(message).trim(),
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process chat message.', details: error.message });
  }
});

module.exports = router;