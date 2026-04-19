const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { nama, email, password, no_hp, alamat, kelurahan, kecamatan } = req.body;
    if (!nama || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nama, email, dan password wajib diisi' });
    }
    
    const existsResult = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existsResult.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
    }

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (nama, email, password, no_hp, alamat, kelurahan, kecamatan, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'masyarakat')`,
      [nama, email, hash, no_hp, alamat, kelurahan, kecamatan]
    );
    const inserted = await pool.query('SELECT id, nama, email, role FROM users WHERE email = ?', [email]);
    const user = inserted.rows[0];

    const token = jwt.sign(
      { id: user.id, email: user.email, nama: user.nama, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      token,
      user
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Gagal mendaftar' });
  }
});

// Login
// Login
router.post('/login', async (req, res) => {
  try {
    console.log('📥 Raw request body:', JSON.stringify(req.body));
    console.log('📥 Content-Type header:', req.headers['content-type']);
    
    const { email, password } = req.body;
    console.log('📝 Login attempt:', { email, password: password ? '****' : 'empty' });
    
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
    }
    
    const result = await pool.query(
      'SELECT id, nama, email, password, role, no_hp, alamat, kelurahan, kecamatan, created_at FROM users WHERE email = ?',
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }

    const valid = await bcrypt.compare(password, user.password);
    console.log('🔐 Password valid:', valid);
    
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Email atau password salah' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, nama: user.nama, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const { password: _, ...userData } = user;
    res.json({
      success: true,
      message: 'Login berhasil',
      token,
      user: userData
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ success: false, message: 'Gagal login' });
  }
});

// Get profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nama, email, no_hp, alamat, kelurahan, kecamatan, role, created_at FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil profil' });
  }
});

// Update profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { nama, no_hp, alamat, kelurahan, kecamatan } = req.body;
    await pool.query(
      'UPDATE users SET nama=?, no_hp=?, alamat=?, kelurahan=?, kecamatan=?, updated_at=NOW() WHERE id=?',
      [nama, no_hp, alamat, kelurahan, kecamatan, req.user.id]
    );
    const updated = await pool.query(
      'SELECT id, nama, email, no_hp, alamat, kelurahan, kecamatan, role FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({ success: true, message: 'Profil diperbarui', user: updated.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal update profil' });
  }
});

module.exports = router;
