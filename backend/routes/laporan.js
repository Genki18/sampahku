const express = require('express');
const { pool } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { upload } = require('../s3');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();


// =======================
// GET LAPORAN USER SENDIRI
// =======================
router.get('/user/my', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM laporan_sampah WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({ success: true, data: result.rows });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Gagal mengambil laporan' });
  }
});


// =======================
// GET ALL LAPORAN
// =======================
router.get('/', async (req, res) => {
  try {
    const { status, kecamatan } = req.query;

    // 🔥 SAFE PARSE
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const offset = (page - 1) * limit;

    let where = [];
    let params = [];

    if (status) {
      where.push(`l.status = ?`);
      params.push(status);
    }

    if (kecamatan) {
      where.push(`l.kecamatan = ?`);
      params.push(kecamatan);
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    // 🔥 PAKAI query() (bukan execute)
    const result = await pool.query(`
      SELECT l.*, u.nama as nama_pelapor, u.no_hp
      FROM laporan_sampah l
      LEFT JOIN users u ON l.user_id = u.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const count = await pool.query(`
      SELECT COUNT(*) AS count 
      FROM laporan_sampah l 
      ${whereClause}
    `, params);

    res.json({
      success: true,
      data: result.rows,
      total: count.rows[0].count,
      page,
      limit
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil laporan'
    });
  }
});


// =======================
// GET BY ID
// =======================
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, u.nama as nama_pelapor, u.no_hp, u.email as email_pelapor
      FROM laporan_sampah l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.id = ?
    `, [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Laporan tidak ditemukan'
      });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil laporan'
    });
  }
});


// =======================
// CREATE LAPORAN
// =======================
router.post(
  '/',
  authMiddleware,
  (req, res, next) => {
    req.uploadFolder = 'laporan';
    next();
  },
  upload.single('foto'),
  async (req, res) => {
    try {
      const {
        judul,
        deskripsi,
        lokasi,
        latitude,
        longitude,
        kelurahan,
        kecamatan,
        kategori
      } = req.body;

      if (!judul || !lokasi) {
        return res.status(400).json({
          success: false,
          message: 'Judul dan lokasi wajib diisi'
        });
      }

      let foto_url = null;
      let foto_key = null;

      if (req.file) {
        foto_url = req.file.location || (req.file.filename ? `/uploads/${req.file.filename}` : null);
        foto_key = req.file.key || req.file.filename;
      }

      const id = uuidv4();

      await pool.execute(`
        INSERT INTO laporan_sampah 
        (id, user_id, judul, deskripsi, lokasi, latitude, longitude, kelurahan, kecamatan, foto_url, foto_key, kategori)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        req.user.id,
        judul,
        deskripsi,
        lokasi,
        latitude,
        longitude,
        kelurahan,
        kecamatan,
        foto_url,
        foto_key,
        kategori || 'sampah_liar'
      ]);

      await pool.execute(`
        INSERT INTO notifikasi (user_id, judul, pesan, tipe)
        VALUES (?, ?, ?, 'laporan')
      `, [
        req.user.id,
        'Laporan Diterima',
        'Laporan Anda telah berhasil dikirim dan sedang ditinjau'
      ]);

      const inserted = await pool.query(
        'SELECT * FROM laporan_sampah WHERE id = ?',
        [id]
      );

      res.status(201).json({
        success: true,
        message: 'Laporan berhasil dikirim',
        data: inserted.rows[0]
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Gagal membuat laporan'
      });
    }
  }
);


// =======================
// UPDATE STATUS
// =======================
router.patch('/:id/status', adminMiddleware, async (req, res) => {
  try {
    const { status, catatan_admin } = req.body;

    const validStatus = ['menunggu', 'diproses', 'selesai', 'ditolak'];

    if (!validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status tidak valid'
      });
    }

    await pool.execute(`
      UPDATE laporan_sampah
      SET status=?, catatan_admin=?, updated_at=NOW(),
          tanggal_penyelesaian=CASE WHEN ?='selesai' THEN NOW() ELSE NULL END
      WHERE id=?
    `, [status, catatan_admin, status, req.params.id]);

    const updated = await pool.query(
      'SELECT * FROM laporan_sampah WHERE id = ?',
      [req.params.id]
    );

    if (!updated.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Laporan tidak ditemukan'
      });
    }

    const laporan = updated.rows[0];

    if (laporan.user_id) {
      const pesanMap = {
        diproses: 'Laporan Anda sedang diproses',
        selesai: 'Laporan Anda telah selesai',
        ditolak: 'Laporan Anda ditolak'
      };

      await pool.execute(`
        INSERT INTO notifikasi (user_id, judul, pesan, tipe)
        VALUES (?, ?, ?, 'update_laporan')
      `, [
        laporan.user_id,
        `Status Laporan: ${status}`,
        pesanMap[status] || 'Status diperbarui'
      ]);
    }

    res.json({
      success: true,
      message: 'Status laporan diperbarui',
      data: laporan
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Gagal update status'
    });
  }
});

module.exports = router;