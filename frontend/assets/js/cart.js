import {
  getCart,
  updateCartQuantity,
  removeCartItem,
  clearCart,
  getSession
} from './store.js';
import { api } from './api.js';
import { updateCartIndicator } from './main.js';

const itemsContainer = document.querySelector('[data-cart-items]');
const subtotalEl = document.querySelector('[data-subtotal]');
const shippingEl = document.querySelector('[data-shipping]');
const taxEl = document.querySelector('[data-tax]');
const totalEl = document.querySelector('[data-total]');
const checkoutButton = document.querySelector('[data-checkout]');
const statusMessage = document.querySelector('[data-cart-status]');

function formatCurrency(value) {
  return value.toFixed(2);
}

function calculateSummary(cart) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 200 || subtotal === 0 ? 0 : 12.5;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;
  return { subtotal, shipping, tax, total };
}

function renderCart() {
  const cart = getCart();
  if (!itemsContainer) return;

  if (!cart.length) {
    itemsContainer.innerHTML = '<p>Your cart is empty. Explore the shop to add tools.</p>';
  } else {
    itemsContainer.innerHTML = cart
      .map(
        (item) => `
          <article class="cart-item" data-cart-id="${item.id}">
            <div class="cart-item__image">🛠️</div>
            <div>
              <h3>${item.name}</h3>
              <p class="text-muted">$${formatCurrency(item.price)} each</p>
              <div class="qty-stepper">
                <button type="button" data-action="decrease">-</button>
                <span>${item.quantity}</span>
                <button type="button" data-action="increase">+</button>
              </div>
            </div>
            <div class="cart-item__price">
              <strong>$${formatCurrency(item.price * item.quantity)}</strong>
              <button class="action-button" data-action="remove" title="Remove item">🗑️</button>
            </div>
          </article>
        `
      )
      .join('');
  }

  const summary = calculateSummary(cart);
  if (subtotalEl) subtotalEl.textContent = formatCurrency(summary.subtotal);
  if (shippingEl) shippingEl.textContent = formatCurrency(summary.shipping);
  if (taxEl) taxEl.textContent = formatCurrency(summary.tax);
  if (totalEl) totalEl.textContent = formatCurrency(summary.total);
}

function handleCartActions(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const card = button.closest('[data-cart-id]');
  if (!card) return;
  const id = card.dataset.cartId;

  const cart = getCart();
  const item = cart.find((cartItem) => cartItem.id === id);
  if (!item) return;

  if (action === 'increase') {
    updateCartQuantity(id, item.quantity + 1);
  }
  if (action === 'decrease') {
    updateCartQuantity(id, item.quantity - 1);
  }
  if (action === 'remove') {
    removeCartItem(id);
  }

  updateCartIndicator();
  renderCart();
}

async function handleCheckout() {
  const cart = getCart();
  if (!cart.length) {
    statusMessage.textContent = 'Your cart is empty.';
    return;
  }

  const { token } = getSession();
  if (!token) {
    statusMessage.textContent = 'Please log in to complete checkout.';
    return;
  }

  const summary = calculateSummary(cart);

  try {
    await api.createOrder({
      items: cart.map((item) => ({
        product: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      shipping: summary.shipping,
      tax: summary.tax
    });
    statusMessage.textContent = 'Order placed successfully!';
    clearCart();
    updateCartIndicator();
    renderCart();
  } catch (error) {
    statusMessage.textContent = 'Checkout failed. Please try again later.';
  }
}

if (itemsContainer) {
  itemsContainer.addEventListener('click', handleCartActions);
}

if (checkoutButton) {
  checkoutButton.addEventListener('click', handleCheckout);
}

renderCart();
