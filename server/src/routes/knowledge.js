const express = require('express');
const multer = require('multer');
const { getKnowledgeDocuments } = require('../config/db');
const { ingestKnowledgeBuffer, ingestKnowledgeDocument } = require('../services/knowledgeIngestion');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
});

router.get('/', async (req, res) => {
  try {
    const documents = await getKnowledgeDocuments(req.user.id);
    return res.json({ documents });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load knowledge documents.', details: error.message });
  }
});

router.post('/text', async (req, res) => {
  try {
    const { title, content, doc_type: docType = 'note', tags = [] } = req.body;
    if (!String(title || '').trim() || !String(content || '').trim()) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }

    const document = await ingestKnowledgeDocument({
      userId: req.user.id,
      title: String(title).trim(),
      docType,
      sourceName: 'manual_text',
      contentText: String(content),
      tags: Array.isArray(tags) ? tags : [],
    });

    return res.json({ success: true, document });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to save knowledge note.', details: error.message });
  }
});

router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Document file is required.' });
    }

    const document = await ingestKnowledgeBuffer({
      userId: req.user.id,
      title: req.body.title || req.file.originalname,
      docType: req.body.doc_type || 'uploaded_document',
      sourceName: req.file.originalname,
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      tags: req.body.tags ? String(req.body.tags).split(',').map((tag) => tag.trim()).filter(Boolean) : [],
    });

    return res.json({ success: true, document });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to upload knowledge document.', details: error.message });
  }
});

module.exports = router;