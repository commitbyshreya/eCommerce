import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { ensureUploadsDir, buildPublicUploadUrl } from '../utils/fileStorage.js';

const uploadsDir = ensureUploadsDir();

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadsDir);
  },
  filename(_req, file, cb) {
    const unique = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(file.originalname || '') || '.bin';
    cb(null, `${unique}${extension}`);
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

export function extractUploadedImage(file) {
  if (!file) return '';
  return buildPublicUploadUrl(file.filename);
}
