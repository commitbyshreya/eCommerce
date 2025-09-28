import { API_BASE_URL } from './config.js';

async function request(path, options = {}) {
  const token = localStorage.getItem('toolkart_token');
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.message || 'Request failed');
  }

  return response.json();
}

export const api = {
  getHealth: () => request('/health'),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  getProfile: () => request('/auth/profile'),
  getProducts: (params = {}) => {
    const searchParams = new URLSearchParams(params);
    const query = searchParams.toString();
    return request(query ? `/products?${query}` : '/products');
  },
  getProduct: (id) => request(`/products/${id}`),
  getFilters: () => request('/products/filters'),
  getFeatured: () => request('/products/featured'),
  createOrder: (payload) => request('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  getOrders: () => request('/orders'),
  getAdminDashboard: () => request('/admin/dashboard')
};
