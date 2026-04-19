const fs = require('fs');
const path = require('path');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

const uploadsDir = path.join('/tmp', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-2';
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'sampahku-storage';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const useS3 = process.env.USE_S3 === 'true';
const hasAwsCredentials = useS3 && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && BUCKET_NAME && !AWS_ACCESS_KEY_ID.includes('EXAMPLE') && !AWS_SECRET_ACCESS_KEY.includes('EXAMPLE') && !BUCKET_NAME.includes('S3_BUCKET_NAME');
let s3Client = null;
let storage;
let isS3Enabled = false;

if (hasAwsCredentials) {
  s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    }
  });

  isS3Enabled = true;
  console.log('✅ AWS S3 upload enabled:', BUCKET_NAME, AWS_REGION);

  storage = multerS3({
    s3: s3Client,
    bucket: BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const folder = req.uploadFolder || 'uploads';
      const ext = path.extname(file.originalname);
      const filename = `${folder}/${uuidv4()}${ext}`;
      cb(null, filename);
    },
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    }
  });
} else {
  console.warn('⚠️ AWS S3 credentials not configured or invalid, or bucket name is placeholder. Falling back to local storage.');
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const folder = req.uploadFolder || 'uploads';
      const ext = path.extname(file.originalname);
      const filename = `${folder}-${uuidv4()}${ext}`;
      cb(null, filename);
    }
  });
}

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar (JPG, PNG, GIF, WebP) dan PDF yang diizinkan'));
    }
  }
});

async function deleteFromS3(key) {
  if (!isS3Enabled) {
    try {
      const localPath = path.join(uploadsDir, key);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Local delete error:', err);
      return false;
    }
  }

  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    }));
    return true;
  } catch (err) {
    console.error('S3 delete error:', err);
    return false;
  }
}

function getS3Url(key) {
  if (isS3Enabled) {
    return `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  }
  return `/uploads/${key}`;
}

module.exports = { s3Client, upload, deleteFromS3, getS3Url, BUCKET_NAME, isS3Enabled };
