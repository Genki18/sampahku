const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all jadwal
router.get('/', async (req, res) => {
  try {
    const { kelurahan, kecamatan, hari } = req.query;
    let where = ['aktif = true'];
    let params = [];
    let idx = 1;

    if (kelurahan) { where.push(`LOWER(kelurahan) LIKE LOWER(?)`); params.push(`%${kelurahan}%`); }
    if (kecamatan) { where.push(`LOWER(kecamatan) LIKE LOWER(?)`); params.push(`%${kecamatan}%`); }
    if (hari) { where.push(`LOWER(hari) = LOWER(?)`); params.push(hari); }

    const result = await pool.query(
      `SELECT * FROM jadwal_pengangkutan WHERE ${where.join(' AND ')} ORDER BY kecamatan, kelurahan, hari`,
      params
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil jadwal' });
  }
});

// Get daftar kecamatan
router.get('/kecamatan', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT kecamatan FROM jadwal_pengangkutan WHERE aktif=true ORDER BY kecamatan');
    res.json({ success: true, data: result.rows.map(r => r.kecamatan) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal' });
  }
});

// Create jadwal (admin)
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { kelurahan, kecamatan, hari, jam_mulai, jam_selesai, zona, petugas, armada, keterangan } = req.body;
    const id = uuidv4();
    await pool.query(
      'INSERT INTO jadwal_pengangkutan (id, kelurahan,kecamatan,hari,jam_mulai,jam_selesai,zona,petugas,armada,keterangan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, kelurahan, kecamatan, hari, jam_mulai, jam_selesai, zona, petugas, armada, keterangan]
    );
    const inserted = await pool.query('SELECT * FROM jadwal_pengangkutan WHERE id = ?', [id]);
    res.status(201).json({ success: true, data: inserted.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal membuat jadwal' });
  }
});

// Update jadwal (admin)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { kelurahan, kecamatan, hari, jam_mulai, jam_selesai, zona, petugas, armada, keterangan, aktif } = req.body;
    await pool.query(
      'UPDATE jadwal_pengangkutan SET kelurahan=?, kecamatan=?, hari=?, jam_mulai=?, jam_selesai=?, zona=?, petugas=?, armada=?, keterangan=?, aktif=? WHERE id=?',
      [kelurahan, kecamatan, hari, jam_mulai, jam_selesai, zona, petugas, armada, keterangan, aktif, req.params.id]
    );
    const updated = await pool.query('SELECT * FROM jadwal_pengangkutan WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal update jadwal' });
  }
});

module.exports = router;
