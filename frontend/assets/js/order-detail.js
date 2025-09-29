import { api } from './api.js';
import { requireSession } from './session.js';

const params = new URLSearchParams(window.location.search);
const orderId = params.get('id');

const numberEl = document.querySelector('[data-order-number]');
const statusEl = document.querySelector('[data-order-status]');
const dateEl = document.querySelector('[data-order-date]');
const totalEl = document.querySelector('[data-order-total]');
const summaryTotalEl = document.querySelector('[data-order-summary-total]');
const subtotalEl = document.querySelector('[data-order-subtotal]');
const shippingEl = document.querySelector('[data-order-shipping]');
const taxEl = document.querySelector('[data-order-tax]');
const itemsContainer = document.querySelector('[data-order-items]');
const messageEl = document.querySelector('[data-order-message]');
const containerEl = document.querySelector('[data-order-container]');

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `$${amount.toFixed(2)}`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusBadgeClass(status) {
  const key = String(status || '').toLowerCase();
  if (key === 'paid' || key === 'completed') return 'badge--status-paid';
  if (key === 'shipped') return 'badge--status-shipped';
  if (key === 'cancelled') return 'badge--status-cancelled';
  return 'badge--status-pending';
}

function renderItems(items) {
  if (!itemsContainer) return;
  if (!items.length) {
    itemsContainer.innerHTML = '<p class="text-muted">No items found for this order.</p>';
    return;
  }

  itemsContainer.innerHTML = items
    .map((item) => `
      <article class="order-item" data-order-item>
        <div>
          <h3>${item.title || 'Item'}</h3>
          <p class="text-muted">${formatCurrency(item.price)} • Qty ${item.qty || 0}</p>
        </div>
        <p class="order-item__total">${formatCurrency((item.price || 0) * (item.qty || 0))}</p>
      </article>
    `)
    .join('');
}

function renderOrder(order) {
  const idDisplay = String(order.id || '');
  const shortId = idDisplay ? idDisplay.slice(-8) : '—';
  if (numberEl) numberEl.textContent = `#${shortId}`;
  if (statusEl) {
    statusEl.textContent = order.status;
    statusEl.className = `badge badge--pill ${getStatusBadgeClass(order.status)}`;
  }
  if (dateEl) dateEl.textContent = formatDate(order.createdAt);
  if (totalEl) totalEl.textContent = formatCurrency(order.total);
  if (summaryTotalEl) summaryTotalEl.textContent = formatCurrency(order.total);
  if (subtotalEl) subtotalEl.textContent = formatCurrency(order.subtotal);
  if (shippingEl) shippingEl.textContent = formatCurrency(order.shipping);
  if (taxEl) taxEl.textContent = formatCurrency(order.tax);
  renderItems(order.items || []);
}

async function initOrderDetail() {
  if (!orderId) {
    if (messageEl) {
      messageEl.textContent = 'No order ID provided. Please return to the orders page.';
    }
    if (containerEl) {
      containerEl.classList.add('order-detail--error');
    }
    return;
  }

  try {
    await requireSession({ redirectTo: './login.html' });
    const order = await api.getOrder(orderId);
    if (!order?.id) {
      throw new Error('Order not found');
    }
    renderOrder(order);
    if (messageEl) {
      messageEl.textContent = '';
    }
  } catch (error) {
    if (messageEl) {
      messageEl.textContent = error?.message || 'Unable to load this order.';
    }
    if (itemsContainer) {
      itemsContainer.innerHTML = '';
    }
    if (containerEl) {
      containerEl.classList.add('order-detail--error');
    }
  }
}

initOrderDetail();
