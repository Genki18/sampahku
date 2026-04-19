const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'sampahku',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  connectTimeout: 10000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  decimalNumbers: true,
});

const pool = {
  // ✅ FLEXIBLE (untuk SELECT, pagination, dll)
  query: async (sql, params = []) => {
    const [rows] = await mysqlPool.query(sql, params);
    return { rows };
  },

  // 🔒 STRICT (untuk INSERT / UPDATE sensitif)
  execute: async (sql, params = []) => {
    const [rows] = await mysqlPool.execute(sql, params);
    return { rows };
  },

  getConnection: () => mysqlPool.getConnection(),
  end: () => mysqlPool.end(),
};

async function initDB() {
  let client;
  try {
    console.log('📡 Connecting to database:', process.env.DB_HOST);
    client = await mysqlPool.getConnection();
    console.log('✅ Connected to database');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) PRIMARY KEY NOT NULL DEFAULT (UUID()),
        nama VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        no_hp VARCHAR(20),
        alamat TEXT,
        kelurahan VARCHAR(100),
        kecamatan VARCHAR(100),
        role VARCHAR(20) DEFAULT 'masyarakat',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS laporan_sampah (
        id CHAR(36) PRIMARY KEY NOT NULL DEFAULT (UUID()),
        user_id CHAR(36),
        judul VARCHAR(200) NOT NULL,
        deskripsi TEXT,
        lokasi VARCHAR(255) NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        kelurahan VARCHAR(100),
        kecamatan VARCHAR(100),
        foto_url TEXT,
        foto_key VARCHAR(500),
        status VARCHAR(50) DEFAULT 'menunggu',
        kategori VARCHAR(100) DEFAULT 'sampah_liar',
        prioritas VARCHAR(20) DEFAULT 'normal',
        catatan_admin TEXT,
        tanggal_penyelesaian TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_laporan_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS jadwal_pengangkutan (
        id CHAR(36) PRIMARY KEY NOT NULL DEFAULT (UUID()),
        kelurahan VARCHAR(100) NOT NULL,
        kecamatan VARCHAR(100) NOT NULL,
        hari VARCHAR(20) NOT NULL,
        jam_mulai TIME NOT NULL,
        jam_selesai TIME,
        zona VARCHAR(50),
        petugas VARCHAR(100),
        armada VARCHAR(100),
        keterangan TEXT,
        aktif BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS edukasi (
        id CHAR(36) PRIMARY KEY NOT NULL DEFAULT (UUID()),
        judul VARCHAR(200) NOT NULL,
        konten TEXT NOT NULL,
        kategori VARCHAR(100),
        thumbnail_url TEXT,
        thumbnail_key VARCHAR(500),
        penulis VARCHAR(100),
        views INT DEFAULT 0,
        published BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifikasi (
        id CHAR(36) PRIMARY KEY NOT NULL DEFAULT (UUID()),
        user_id CHAR(36),
        judul VARCHAR(200),
        pesan TEXT,
        tipe VARCHAR(50),
        dibaca BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_notifikasi_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [adminExists] = await client.execute("SELECT id FROM users WHERE email = ?", ['admin@sampahku.id']);
    if (adminExists.length === 0) {
      const hash = await bcrypt.hash('Admin123!', 10);
      await client.execute(
        `INSERT INTO users (id, nama, email, password, role) VALUES (?, ?, ?, ?, 'admin')`,
        [uuidv4(), 'Administrator', 'admin@sampahku.id', hash]
      );
      console.log('✅ Admin user seeded');
    }

    const [jadwalExists] = await client.execute('SELECT id FROM jadwal_pengangkutan LIMIT 1');
    if (jadwalExists.length === 0) {
      const jadwalData = [
        ['Dago', 'Coblong', 'Senin', '06:00', '09:00', 'Zona A'],
        ['Dago', 'Coblong', 'Kamis', '06:00', '09:00', 'Zona A'],
        ['Ledeng', 'Cidadap', 'Selasa', '07:00', '10:00', 'Zona B'],
        ['Ledeng', 'Cidadap', 'Jumat', '07:00', '10:00', 'Zona B'],
        ['Antapani Tengah', 'Antapani', 'Rabu', '06:30', '09:30', 'Zona C'],
        ['Antapani Tengah', 'Antapani', 'Sabtu', '06:30', '09:30', 'Zona C'],
        ['Braga', 'Sumur Bandung', 'Senin', '08:00', '11:00', 'Zona D'],
        ['Braga', 'Sumur Bandung', 'Kamis', '08:00', '11:00', 'Zona D'],
        ['Burangrang', 'Lengkong', 'Selasa', '06:00', '09:00', 'Zona E'],
        ['Burangrang', 'Lengkong', 'Jumat', '06:00', '09:00', 'Zona E'],
        ['Cibeuying Kidul', 'Mandalajati', 'Rabu', '07:30', '10:30', 'Zona F'],
        ['Cibeuying Kidul', 'Mandalajati', 'Sabtu', '07:30', '10:30', 'Zona F'],
      ];
      for (const j of jadwalData) {
        await client.execute(
          `INSERT INTO jadwal_pengangkutan (id, kelurahan, kecamatan, hari, jam_mulai, jam_selesai, zona) VALUES (?, ?, ?, ?, ?, ?, ?)` ,
          [uuidv4(), ...j]
        );
      }
      console.log('✅ Jadwal seeded');
    }

    const [eduExists] = await client.execute('SELECT id FROM edukasi LIMIT 1');
    if (eduExists.length === 0) {
      await client.execute(
        `INSERT INTO edukasi (id, judul, konten, kategori, penulis) VALUES
        (?, 'Cara Memilah Sampah yang Benar', 'Memilah sampah adalah langkah pertama dalam pengelolaan sampah yang bertanggung jawab. Sampah organik seperti sisa makanan dapat dijadikan kompos. Sampah anorganik seperti plastik, kertas, dan logam dapat didaur ulang. Sampah B3 (Berbahaya dan Beracun) seperti baterai dan elektronik harus dibuang di tempat khusus.', 'pilah-sampah', 'Tim SampahKu'),
        (?, 'Bahaya Sampah Liar bagi Kesehatan', 'Sampah liar yang tidak dikelola dapat menjadi sarang nyamuk Aedes aegypti penyebab demam berdarah. Selain itu, sampah organik yang membusuk menghasilkan gas metana berbahaya dan dapat mencemari air tanah. Laporkan sampah liar di sekitar Anda melalui fitur Laporan di aplikasi SampahKu.', 'kesehatan', 'Tim SampahKu'),
        (?, '3R: Reduce, Reuse, Recycle', 'Prinsip 3R adalah kunci pengelolaan sampah berkelanjutan. Reduce: kurangi penggunaan barang sekali pakai. Reuse: gunakan kembali barang yang masih layak. Recycle: daur ulang sampah menjadi produk baru. Dengan menerapkan 3R, kita dapat mengurangi volume sampah hingga 70%.', 'daur-ulang', 'Tim SampahKu'),
        (?, 'Kompos dari Sampah Dapur', 'Sampah organik dari dapur seperti kulit buah, sisa sayuran, dan ampas kopi dapat diolah menjadi kompos berkualitas tinggi. Cara membuat kompos: siapkan wadah berlubang, masukkan campuran sampah organik dan tanah, siram secukupnya dan aduk setiap minggu. Dalam 4-6 minggu kompos siap digunakan.', 'kompos', 'Tim SampahKu')
        `,
        [uuidv4(), uuidv4(), uuidv4(), uuidv4()]
      );
      console.log('✅ Edukasi seeded');
    }

    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('❌ Database init error:', err.message);
    throw err;
  } finally {
    if (client) await client.release();
  }
}

module.exports = { pool, initDB };
