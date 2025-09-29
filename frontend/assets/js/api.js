import { API_BASE_URL } from './config.js';
import { getSession } from './store.js';

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const { token } = getSession();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: options.credentials ?? 'include'
  });

  const hasBody = response.status !== 204;
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let payload = null;

  if (hasBody) {
    try {
      payload = isJson ? await response.json() : await response.text();
    } catch (_error) {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object'
        ? payload.message || payload.error
        : payload;
    throw new Error(message || 'Request failed');
  }

  return payload;
}

export const api = {
  getHealth: () => request('/health'),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/me'),
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
  getOrder: (id) => request(`/orders/${id}`),
  simulateCheckout: (payload) => request('/checkout/simulate', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getOrders: () => request('/orders'),
  getAdminDashboard: () => request('/admin/dashboard')
};
