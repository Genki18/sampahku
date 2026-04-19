const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { upload } = require('../s3');

const router = express.Router();

// Generic file upload endpoint
router.post('/', authMiddleware, (req, res, next) => {
  req.uploadFolder = req.query.folder || 'uploads';
  next();
}, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Tidak ada file yang diupload' });
  }

  const url = req.file.location || `/uploads/${req.file.filename}`;
  const key = req.file.key || req.file.filename;

  res.json({
    success: true,
    message: 'File berhasil diupload',
    data: {
      url,
      key,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    }
  });
});

module.exports = router;
