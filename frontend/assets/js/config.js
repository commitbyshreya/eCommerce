const FALLBACK_LOCAL = 'http://localhost:3000/api';
const HOSTED_DEFAULT = 'https://e-commerce-ivory-psi.vercel.app/api';
function resolveDefault() {
  const { origin, hostname } = window.location;
  if (window.TOOLKART_API_URL) return window.TOOLKART_API_URL;
  if (localStorage.getItem('toolkart_api_url')) return localStorage.getItem('toolkart_api_url');
  if (hostname.includes('vercel.app')) {
    return HOSTED_DEFAULT;
  }
  return FALLBACK_LOCAL;
}

function normalise(url) {
  if (!url) return resolveDefault();
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export const API_BASE_URL = normalise(resolveDefault());

export function setApiBaseUrl(url) {
  const normalised = normalise(url);
  localStorage.setItem('toolkart_api_url', normalised);
  return normalised;
}
