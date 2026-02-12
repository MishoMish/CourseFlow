const multer = require('multer');
const path = require('path');
const { v4: uuid } = require('uuid');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure upload directories exist
['pdfs', 'images', 'files'].forEach((dir) => {
  const fullPath = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    let subdir = 'files';
    if (ext === '.pdf') subdir = 'pdfs';
    else if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) subdir = 'images';
    cb(null, path.join(UPLOAD_DIR, subdir));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const MAX_SIZE = (parseInt(process.env.UPLOAD_MAX_SIZE_MB, 10) || 50) * 1024 * 1024;

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
      '.zip', '.tar', '.gz', '.md', '.txt', '.html', '.css', '.js',
      '.ts', '.json', '.xml', '.csv', '.mp4', '.webm',
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Файловият тип ${ext} не е разрешен.`));
    }
  },
});

module.exports = { upload, UPLOAD_DIR };
