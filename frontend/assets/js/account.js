import { api } from './api.js';
import { requireSession } from './session.js';

const nameEl = document.querySelector('[data-account-name]');
const emailEl = document.querySelector('[data-account-email]');
const statusEl = document.querySelector('[data-account-status]');
const ordersContainer = document.querySelector('[data-account-orders]');

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getStatusBadgeClass(status) {
  const key = String(status || '').toLowerCase();
  if (key === 'paid' || key === 'completed') return 'badge--status-paid';
  if (key === 'shipped') return 'badge--status-shipped';
  if (key === 'cancelled') return 'badge--status-cancelled';
  return 'badge--status-pending';
}

function renderProfile(user, isDemo) {
  if (nameEl) nameEl.textContent = user.name || user.email;
  if (emailEl) emailEl.textContent = user.email;
  if (statusEl) {
    statusEl.textContent = isDemo ? 'Demo session active' : 'Secure session active';
  }
}

function renderRecentOrders(orders) {
  if (!ordersContainer) return;
  if (!orders.length) {
    ordersContainer.innerHTML = '<p class="text-muted">No orders yet. Explore the shop to get started.</p>';
    return;
  }

  ordersContainer.innerHTML = orders
    .slice(0, 3)
    .map((order) => {
      const itemCount = order.items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0;
      const statusClass = getStatusBadgeClass(order.status);
      const orderId = String(order.id || '');
      const shortId = orderId ? orderId.slice(-6) : '—';
      return `
        <article class="account-order-card">
          <div>
            <p class="account-order-card__label">Order #${shortId}</p>
            <h3>${formatDate(order.createdAt)}</h3>
            <p class="text-muted">${itemCount} ${itemCount === 1 ? 'item' : 'items'}</p>
          </div>
          <div class="account-order-card__meta">
            <span class="badge badge--pill ${statusClass}">${order.status}</span>
            <p class="account-order-card__total">$${Number(order.total || 0).toFixed(2)}</p>
            <a class="account-order-card__link" href="./order-detail.html?id=${encodeURIComponent(order.id)}">View details →</a>
          </div>
        </article>
      `;
    })
    .join('');
}

async function initAccountPage() {
  try {
    const session = await requireSession({ redirectTo: './login.html' });
    renderProfile(session.user, session.isDemo);

    if (ordersContainer) {
      ordersContainer.innerHTML = '<p class="text-muted">Loading orders…</p>';
    }

    const orders = await api.getOrders();
    renderRecentOrders(Array.isArray(orders) ? orders : []);
  } catch (error) {
    if (ordersContainer) {
      ordersContainer.innerHTML = '<p class="text-muted">Unable to load orders right now.</p>';
    }
    if (statusEl) {
      statusEl.textContent = 'Authentication required';
    }
    // When requireSession redirects the page we ignore the error
  }
}

initAccountPage();
