// Mock database untuk testing (ketika RDS tidak available)
const users = new Map();
const laporan = [];
const jadwal = [];
const edukasi = [];

// Seed data
async function initMockDB() {
  const bcrypt = require('bcryptjs');
  
  // Admin user
  const adminHash = await bcrypt.hash('Admin123!', 10);
  users.set('admin@sampahku.id', {
    id: '1',
    nama: 'Administrator',
    email: 'admin@sampahku.id',
    password: adminHash,
    role: 'admin',
    created_at: new Date()
  });
  
  // Test user
  const userHash = await bcrypt.hash('Warga123!', 10);
  users.set('warga@bandung.id', {
    id: '2',
    nama: 'Warga Bandung',
    email: 'warga@bandung.id',
    password: userHash,
    role: 'masyarakat',
    no_hp: '081234567890',
    kelurahan: 'Dago',
    kecamatan: 'Coblong',
    created_at: new Date()
  });
  
  // Jadwal data
  jadwal.push(
    { id: '1', kelurahan: 'Dago', kecamatan: 'Coblong', hari: 'Senin', jam_mulai: '06:00', zona: 'Zona A' },
    { id: '2', kelurahan: 'Dago', kecamatan: 'Coblong', hari: 'Kamis', jam_mulai: '06:00', zona: 'Zona A' },
    { id: '3', kelurahan: 'Ledeng', kecamatan: 'Cidadap', hari: 'Selasa', jam_mulai: '07:00', zona: 'Zona B' },
    { id: '4', kelurahan: 'Antapani Tengah', kecamatan: 'Antapani', hari: 'Rabu', jam_mulai: '06:30', zona: 'Zona C' }
  );
  
  // Edukasi data
  edukasi.push(
    {
      id: '1',
      judul: 'Cara Memilah Sampah yang Benar',
      konten: 'Memilah sampah adalah langkah pertama dalam pengelolaan sampah yang bertanggung jawab.',
      kategori: 'pilah-sampah',
      penulis: 'Tim SampahKu'
    },
    {
      id: '2',
      judul: 'Bahaya Sampah Liar bagi Kesehatan',
      konten: 'Sampah liar yang tidak dikelola dapat menjadi sarang nyamuk Aedes aegypti penyebab demam berdarah.',
      kategori: 'kesehatan',
      penulis: 'Tim SampahKu'
    }
  );
  
  console.log('✅ Mock database initialized');
}

// Mock queries untuk auth
async function findUserByEmail(email) {
  const user = users.get(email);
  if (!user) {
    console.log(`🔍 User ${email} not found in mock DB. Available users: ${Array.from(users.keys()).join(', ')}`);
  } else {
    console.log(`✅ User ${email} found with password hash length: ${user.password?.length || 'UNDEFINED'}`);
  }
  return user || null;
}

async function createUser(userData) {
  users.set(userData.email, { id: Date.now().toString(), ...userData, created_at: new Date() });
  return users.get(userData.email);
}

async function getStats() {
  return {
    total_laporan: 24,
    selesai: 18,
    total_pengguna: users.size
  };
}

module.exports = {
  initMockDB,
  findUserByEmail,
  createUser,
  getStats,
  users,
  laporan,
  jadwal,
  edukasi
};
