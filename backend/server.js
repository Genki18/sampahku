require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const { initDB } = require('./db');
initDB().then(() => {
  console.log('✅ Database initialized');
}).catch(err => {
  console.error('⚠️ Database init error:', err.message);
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/auth');
const laporanRoutes = require('./routes/laporan');
const jadwalRoutes = require('./routes/jadwal');
const edukasiRoutes = require('./routes/edukasi'); // ✅ fix typo
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');

app.use('/api/auth', authRoutes);
app.use('/api/laporan', laporanRoutes);
app.use('/api/jadwal', jadwalRoutes);
app.use('/api/edukasi', edukasiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SampahKu API',
    version: '1.0.0'
  });
});

// 🔥 Static frontend (pakai dist untuk production)
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));
app.use('/uploads', express.static(path.join('/tmp', 'uploads')));

// fallback ke index.html (WAJIB PALING BAWAH)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🗑️ SampahKu API berjalan di port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;