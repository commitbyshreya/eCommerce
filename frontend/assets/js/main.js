import { setApiBaseUrl } from './config.js';
import { getCart } from './store.js';

function highlightActiveLink() {
  const navLinks = document.querySelectorAll('[data-nav-link]');
  const path = window.location.pathname.split('/').pop() || 'index.html';

  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href === './' && path === 'index.html') {
      link.classList.add('active');
    } else if (href && href.endsWith(path)) {
      link.classList.add('active');
    }
  });
}

function updateCartIndicator() {
  const indicator = document.querySelector('[data-cart-count]');
  if (!indicator) return;
  const cart = getCart();
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  indicator.textContent = totalItems > 0 ? totalItems : '0';
}

function handleApiSwitchForm() {
  const form = document.querySelector('[data-api-form]');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = form.querySelector('input');
    if (!input?.value) return;
    const savedUrl = setApiBaseUrl(input.value.trim());
    const feedback = form.querySelector('small');
    if (feedback) {
      feedback.textContent = `API base set to ${savedUrl}`;
    }
  });
}

highlightActiveLink();
updateCartIndicator();
handleApiSwitchForm();

window.addEventListener('storage', (event) => {
  if (event.key === 'toolkart_cart') {
    updateCartIndicator();
  }
});

export { updateCartIndicator };
