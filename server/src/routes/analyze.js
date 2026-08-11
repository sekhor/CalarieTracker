const express = require('express');
const router = express.Router();
const multer = require('multer');
const { analyzeMealPhoto } = require('../services/azureOpenAI');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are supported!'), false);
    }
  },
});

// POST /api/analyze - Upload image & estimate calories via Azure OpenAI Vision
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    let imageBuffer = null;
    let mimeType = 'image/jpeg';

    if (req.file) {
      imageBuffer = req.file.buffer;
      mimeType = req.file.mimetype;
    } else if (req.body.image_base64) {
      const base64Payload = req.body.image_base64;
      const mimeMatch = base64Payload.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
      const base64Str = base64Payload.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
      imageBuffer = Buffer.from(base64Str, 'base64');
    } else {
      return res.status(400).json({ error: 'Please upload a photo file or provide an image_base64 payload.' });
    }

    const customPrompt = req.body.prompt || '';
    const analysis = await analyzeMealPhoto({
      imageBuffer,
      mimeType,
      customPrompt,
    });

    return res.json({
      success: true,
      analysis,
      image_base64: `data:${mimeType};base64,${imageBuffer.toString('base64')}`,
      image_mime_type: mimeType,
    });
  } catch (err) {
    console.error('Meal analysis endpoint error:', err);
    return res.status(500).json({
      error: 'Failed to process meal photo analysis',
      details: err.message,
    });
  }
});

module.exports = router;
