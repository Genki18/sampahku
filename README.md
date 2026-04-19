# 🗑️ SampahKu – Sistem Manajemen Persampahan Kota Bandung

Aplikasi web berbasis cloud untuk pelaporan sampah liar, jadwal pengangkutan, dan edukasi persampahan bagi warga Kota Bandung.

---

## 🎯 Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 📸 **Laporan Sampah** | Warga melaporkan sampah liar dengan foto (upload ke S3), lokasi, dan kategori |
| 📅 **Jadwal Pengangkutan** | Cek jadwal truk sampah per kelurahan/kecamatan di Bandung |
| 📚 **Edukasi** | Artikel cara pilah sampah, kompos, daur ulang |
| ⚙️ **Admin Dashboard** | Kelola laporan, update status, statistik, manajemen jadwal |
| 👤 **Autentikasi** | Register/login warga & admin dengan JWT |

---

## 🏗️ Arsitektur Cloud

```
Internet
    │
    ▼
[Internet Gateway]
    │
    ▼
[VPC - ap-southeast-1]
├── Public Subnet
│   └── EC2 (Docker: Frontend Nginx + Backend Node.js)
└── Private Subnet
    └── RDS PostgreSQL

[S3 Bucket: sampahku-storage]  ← upload foto laporan & edukasi

[GitHub Actions]  → CI/CD → EC2
```

---

## 🚀 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JS (Single Page App)
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL (AWS RDS)
- **File Storage**: AWS S3 (foto laporan)
- **Container**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Server**: AWS EC2 (Ubuntu)
- **Web Server**: Nginx (reverse proxy)

---

## ⚙️ Setup & Deployment

### 1. Clone Repository
```bash
git clone https://github.com/USERNAME/sampahku.git
cd sampahku
```

### 2. Konfigurasi Environment
```bash
cp .env.example .env
nano .env   # isi semua nilai
```

### 3. Jalankan Lokal (Docker)
```bash
docker compose up --build
# Akses: http://localhost
```

### 4. Deploy ke EC2

**Prasyarat EC2:**
```bash
# Install Docker
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker ubuntu
```

**Setup GitHub Secrets** (Settings → Secrets → Actions):
| Secret | Keterangan |
|--------|-----------|
| `EC2_HOST` | Public IP EC2 |
| `EC2_SSH_KEY` | Isi file .pem (private key) |
| `DB_HOST` | RDS endpoint |
| `DB_NAME` | Nama database |
| `DB_USER` | Username DB |
| `DB_PASSWORD` | Password DB |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_REGION` | Region (ap-southeast-1) |
| `S3_BUCKET_NAME` | Nama bucket S3 |
| `JWT_SECRET` | Random secret string |

**Deploy otomatis** saat push ke branch `main`.

---

## 🗄️ Setup AWS

### RDS PostgreSQL
1. Buat RDS instance PostgreSQL di subnet private
2. Security group: izinkan port 5432 dari EC2 security group
3. Isi `DB_HOST` dengan endpoint RDS

### S3 Bucket
1. Buat bucket: `sampahku-storage`
2. Region: `ap-southeast-1`
3. CORS configuration:
```json
[{
  "AllowedHeaders": ["*"],
  "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
  "AllowedOrigins": ["http://YOUR-EC2-IP"],
  "ExposeHeaders": []
}]
```
4. Bucket policy (public read untuk foto):
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::sampahku-storage/*"
  }]
}
```

### IAM User untuk Aplikasi
Policy yang diperlukan:
- `AmazonS3FullAccess` (atau buat custom policy untuk bucket spesifik)

---

## 👥 Akun Default

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sampahku.id | Admin123! |

---

## 📁 Struktur Project

```
sampahku/
├── backend/
│   ├── routes/
│   │   ├── auth.js        # Register, login, profil
│   │   ├── laporan.js     # CRUD laporan + upload S3
│   │   ├── jadwal.js      # Jadwal pengangkutan
│   │   ├── edukasi.js     # Artikel edukasi
│   │   ├── admin.js       # Dashboard admin
│   │   └── upload.js      # Generic file upload
│   ├── middleware/
│   │   └── auth.js        # JWT middleware
│   ├── db.js              # PostgreSQL + init tables
│   ├── s3.js              # AWS S3 config + multer
│   ├── server.js          # Express app
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── index.html         # SPA frontend
│   ├── nginx.conf         # Nginx config
│   └── Dockerfile
├── .github/
│   └── workflows/
│       └── deploy.yml     # GitHub Actions CI/CD
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/register` | Daftar akun |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/profile` | Profil user |
| GET | `/api/laporan` | Daftar laporan |
| POST | `/api/laporan` | Buat laporan + upload foto S3 |
| PATCH | `/api/laporan/:id/status` | Update status (admin) |
| GET | `/api/jadwal` | Daftar jadwal |
| POST | `/api/jadwal` | Tambah jadwal (admin) |
| GET | `/api/edukasi` | Daftar artikel |
| GET | `/api/admin/stats` | Statistik dashboard |
| GET | `/api/health` | Health check |

---

## 📊 Rubrik Nilai

- ✅ Implementasi sistem berjalan (Docker + EC2 + RDS + S3)
- ✅ Diagram arsitektur (VPC, subnet, EC2, RDS, S3, IGW)
- ✅ CI/CD dengan GitHub Actions
- ✅ Docker containerized
- ✅ S3 untuk upload foto laporan
- ✅ VPC dengan public/private subnet
- ✅ Kreativitas: SPA, admin dashboard, real-time status update

---

*SampahKu – Dibuat untuk UTS Cloud Computing | Kota Bandung Bersih Bersama* 🗑️🌿
