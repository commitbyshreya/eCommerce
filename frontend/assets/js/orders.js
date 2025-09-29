import { api } from './api.js';
import { requireSession } from './session.js';

const ordersListEl = document.querySelector('[data-orders-list]');
const summaryEl = document.querySelector('[data-orders-summary]');

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `$${amount.toFixed(2)}`;
}

function formatDate(value) {
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

function renderSummary(orders) {
  if (!summaryEl) return;
  if (!orders.length) {
    summaryEl.textContent = 'No orders yet.';
    return;
  }
  const total = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  summaryEl.textContent = `${orders.length} order${orders.length === 1 ? '' : 's'} • ${formatCurrency(total)}`;
}

function renderOrders(orders) {
  if (!ordersListEl) return;
  if (!orders.length) {
    ordersListEl.innerHTML = '<p class="text-muted">Your orders will appear here once you complete a purchase.</p>';
    return;
  }

  ordersListEl.innerHTML = orders
    .map((order) => {
      const itemCount = order.items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0;
      const itemsPreview = (order.items || []).slice(0, 3)
        .map((item) => `<li>${item.title || 'Item'} × ${item.qty || 0}</li>`)
        .join('');
      const moreCount = Math.max(0, (order.items || []).length - 3);
      const statusClass = getStatusBadgeClass(order.status);
      const orderId = String(order.id || '');
      const shortId = orderId ? orderId.slice(-6) : '—';

      return `
        <article class="order-card">
          <header class="order-card__header">
            <div>
              <p class="order-card__label">Order #${shortId}</p>
              <h3>${formatDate(order.createdAt)}</h3>
            </div>
            <div class="order-card__status">
              <span class="badge badge--pill ${statusClass}">${order.status}</span>
              <p class="order-card__total">${formatCurrency(order.total)}</p>
            </div>
          </header>
          <div class="order-card__body">
            <p class="text-muted">${itemCount} ${itemCount === 1 ? 'item' : 'items'}</p>
            <ul class="order-card__items">
              ${itemsPreview || '<li>No items recorded</li>'}
              ${moreCount ? `<li class="text-muted">+${moreCount} more item${moreCount === 1 ? '' : 's'}</li>` : ''}
            </ul>
          </div>
          <footer class="order-card__footer">
            <a class="order-card__link" href="./order-detail.html?id=${encodeURIComponent(order.id)}">View details →</a>
          </footer>
        </article>
      `;
    })
    .join('');
}

async function initOrdersPage() {
  try {
    await requireSession({ redirectTo: './login.html' });
    const orders = await api.getOrders();
    const list = Array.isArray(orders) ? orders : [];
    renderSummary(list);
    renderOrders(list);
  } catch (error) {
    if (ordersListEl) {
      ordersListEl.innerHTML = '<p class="text-muted">We were unable to load your orders. Please try again shortly.</p>';
    }
    if (summaryEl) {
      summaryEl.textContent = 'Error loading orders';
    }
  }
}

initOrdersPage();
