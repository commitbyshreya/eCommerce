const DEFAULT_API = 'http://localhost:3000/api';

function normalise(url) {
  if (!url) return DEFAULT_API;
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export const API_BASE_URL = normalise(window.TOOLKART_API_URL || localStorage.getItem('toolkart_api_url'));

export function setApiBaseUrl(url) {
  const normalised = normalise(url);
  localStorage.setItem('toolkart_api_url', normalised);
  return normalised;
}
