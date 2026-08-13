const {
  createChatSession,
  getChatMessages,
  getChatSessions,
  saveChatMessage,
} = require('../config/db');

async function ensureSession(userId, sessionId, title = 'Nutrition Coach') {
  if (sessionId) {
    const sessions = await getChatSessions(userId);
    const existing = sessions.find((item) => String(item.id) === String(sessionId));
    if (existing) {
      return existing;
    }
  }

  return createChatSession(userId, title);
}

async function listSessions(userId) {
  return getChatSessions(userId);
}

async function listMessages(userId, sessionId, limit = 50) {
  return getChatMessages(userId, sessionId, limit);
}

async function appendMessage(payload) {
  return saveChatMessage(payload);
}

module.exports = {
  appendMessage,
  ensureSession,
  listMessages,
  listSessions,
};