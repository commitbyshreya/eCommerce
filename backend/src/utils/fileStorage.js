import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

export function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  return UPLOADS_DIR;
}

export function resolveUploadPath(filename = '') {
  return path.join(ensureUploadsDir(), filename);
}

export function buildPublicUploadUrl(filename) {
  if (!filename) return '';
  return `/uploads/${filename}`;
}
