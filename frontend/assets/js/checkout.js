import { api } from './api.js';
import { requireSession } from './session.js';
import { getCart, clearCart } from './store.js';
import { updateCartIndicator } from './main.js';

const itemsEl = document.querySelector('[data-checkout-items]');
const subtotalEl = document.querySelector('[data-checkout-subtotal]');
const shippingEl = document.querySelector('[data-checkout-shipping]');
const taxEl = document.querySelector('[data-checkout-tax]');
const totalEl = document.querySelector('[data-checkout-total]');
const statusEl = document.querySelector('[data-checkout-status]');
const submitButton = document.querySelector('[data-checkout-submit]');

let sessionState = { user: null, isDemo: false };
let currentSummary = null;
let currentCart = [];

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `$${amount.toFixed(2)}`;
}

function calculateSummary(cart) {
  const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const shipping = subtotal === 0 || subtotal > 200 ? 0 : 12.5;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;
  return { subtotal, shipping, tax, total };
}

function renderCartItems(cart) {
  if (!itemsEl) return;
  if (!cart.length) {
    itemsEl.innerHTML = '<p class="text-muted">Your cart is empty. Add items before checking out.</p>';
    return;
  }

  itemsEl.innerHTML = cart
    .map((item) => `
      <article class="checkout-item">
        <div>
          <h3>${item.name}</h3>
          <p class="text-muted">$${Number(item.price || 0).toFixed(2)} each</p>
        </div>
        <div class="checkout-item__meta">
          <span>Qty ${item.quantity}</span>
          <strong>${formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}</strong>
        </div>
      </article>
    `)
    .join('');
}

function renderSummary(summary) {
  if (subtotalEl) subtotalEl.textContent = formatCurrency(summary.subtotal);
  if (shippingEl) shippingEl.textContent = formatCurrency(summary.shipping);
  if (taxEl) taxEl.textContent = formatCurrency(summary.tax);
  if (totalEl) totalEl.textContent = formatCurrency(summary.total);
}

function setStatus(message, tone = 'muted') {
  if (!statusEl) return;
  statusEl.classList.remove('text-muted', 'text-success', 'text-error');
  statusEl.classList.add(`text-${tone}`);
  statusEl.textContent = message;
}

async function placeOrder() {
  if (!currentCart.length) {
    setStatus('Your cart is empty.', 'error');
    return;
  }

  if (!submitButton) return;
  submitButton.disabled = true;
  setStatus('Processing payment…', 'muted');

  try {
    currentSummary = calculateSummary(currentCart);
    await api.simulateCheckout({
      subtotal: currentSummary.subtotal,
      shipping: currentSummary.shipping,
      tax: currentSummary.tax,
      total: currentSummary.total
    });

    await api.createOrder({
      items: currentCart.map((item) => ({
        productId: item.id,
        title: item.name,
        price: item.price,
        qty: item.quantity
      })),
      subtotal: currentSummary.subtotal,
      shipping: currentSummary.shipping,
      tax: currentSummary.tax,
      total: currentSummary.total,
      status: 'paid'
    });

    clearCart();
    updateCartIndicator();
    setStatus('Payment successful! Redirecting to orders…', 'success');
    setTimeout(() => {
      window.location.href = './orders.html';
    }, 900);
  } catch (error) {
    if (sessionState.isDemo) {
      clearCart();
      updateCartIndicator();
      setStatus('Demo checkout complete! Redirecting to orders…', 'success');
      setTimeout(() => {
        window.location.href = './orders.html';
      }, 900);
      return;
    }
    setStatus(error?.message || 'Payment failed. Please try again.', 'error');
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
}

async function initCheckout() {
  try {
    sessionState = await requireSession({ redirectTo: './login.html' });
  } catch (error) {
    if (statusEl) {
      statusEl.textContent = 'Redirecting to login…';
    }
    return;
  }

  currentCart = getCart();
  renderCartItems(currentCart);
  currentSummary = calculateSummary(currentCart);
  renderSummary(currentSummary);

  if (!currentCart.length && submitButton) {
    submitButton.disabled = true;
    setStatus('Add items to your cart before checking out.', 'muted');
  }

  submitButton?.addEventListener('click', placeOrder);
}

initCheckout();
