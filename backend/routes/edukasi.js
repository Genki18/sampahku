const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { adminMiddleware } = require('../middleware/auth');
const { upload } = require('../s3');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { kategori } = req.query;
    let where = ['published = true'];
    let params = [];
    if (kategori) { where.push('kategori = ?'); params.push(kategori); }
    const result = await pool.query(
      `SELECT id, judul, kategori, thumbnail_url, penulis, views, created_at FROM edukasi WHERE ${where.join(' AND ')} ORDER BY created_at DESC`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    await pool.query('UPDATE edukasi SET views = views + 1 WHERE id = ?', [req.params.id]);
    const result = await pool.query('SELECT * FROM edukasi WHERE id = ?', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Tidak ditemukan' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal' });
  }
});

router.post('/', adminMiddleware, (req, res, next) => {
  req.uploadFolder = 'edukasi';
  next();
}, upload.single('thumbnail'), async (req, res) => {
  try {
    const { judul, konten, kategori, penulis } = req.body;
    let thumbnail_url = null, thumbnail_key = null;
    if (req.file) {
      thumbnail_url = req.file.location;
      thumbnail_key = req.file.key;
    }
    const id = uuidv4();
    await pool.query(
      'INSERT INTO edukasi (id, judul, konten, kategori, thumbnail_url, thumbnail_key, penulis) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, judul, konten, kategori, thumbnail_url, thumbnail_key, penulis]
    );
    const inserted = await pool.query('SELECT * FROM edukasi WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal' });
  }
});

module.exports = router;
