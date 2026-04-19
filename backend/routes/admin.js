const express = require('express');
const { pool } = require('../db');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Dashboard stats
router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const [total, menunggu, diproses, selesai, users, bulanIni] = await Promise.all([
      pool.query('SELECT COUNT(*) AS count FROM laporan_sampah'),
      pool.query("SELECT COUNT(*) AS count FROM laporan_sampah WHERE status='menunggu'"),
      pool.query("SELECT COUNT(*) AS count FROM laporan_sampah WHERE status='diproses'"),
      pool.query("SELECT COUNT(*) AS count FROM laporan_sampah WHERE status='selesai'"),
      pool.query("SELECT COUNT(*) AS count FROM users WHERE role='masyarakat'"),
      pool.query("SELECT COUNT(*) AS count FROM laporan_sampah WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())")
    ]);
    res.json({
      success: true,
      data: {
        total_laporan: parseInt(total.rows[0].count),
        menunggu: parseInt(menunggu.rows[0].count),
        diproses: parseInt(diproses.rows[0].count),
        selesai: parseInt(selesai.rows[0].count),
        total_pengguna: parseInt(users.rows[0].count),
        laporan_bulan_ini: parseInt(bulanIni.rows[0].count)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal' });
  }
});

// Get all users (admin)
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nama, email, no_hp, kelurahan, kecamatan, role, created_at FROM users ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal' });
  }
});

// Laporan per kecamatan (chart)
router.get('/laporan-per-kecamatan', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT kecamatan, COUNT(*) as total,
        SUM(CASE WHEN status='selesai' THEN 1 ELSE 0 END) as selesai,
        SUM(CASE WHEN status='menunggu' THEN 1 ELSE 0 END) as menunggu
      FROM laporan_sampah
      WHERE kecamatan IS NOT NULL
      GROUP BY kecamatan ORDER BY total DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal' });
  }
});

// Get notifikasi user
router.get('/notifikasi', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notifikasi ORDER BY created_at DESC LIMIT 50');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal' });
  }
});

module.exports = router;
