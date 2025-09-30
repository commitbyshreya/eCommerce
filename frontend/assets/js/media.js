import { API_BASE_URL } from './config.js';

const API_ORIGIN = API_BASE_URL.replace(/\/$/, '').replace(/\/api$/, '');

export function resolveMediaUrl(src) {
  if (!src) return '';
  if (typeof src !== 'string') return '';
  if (/^(?:https?:)?\/\//i.test(src) || src.startsWith('data:')) {
    return src;
  }
  const normalised = src.startsWith('/') ? src : `/${src}`;
  return `${API_ORIGIN}${normalised}`;
}
