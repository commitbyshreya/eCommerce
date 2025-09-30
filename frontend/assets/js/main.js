import { setApiBaseUrl } from './config.js';
import { api } from './api.js';
import { getCart, getSession, setSession, signOut } from './store.js';

let teardownAccountMenu = null;

const PUBLIC_PAGES = new Set([
  '',
  'index.html',
  'shop.html',
  'about.html',
  'contact.html',
  'orders.html',
  'order-detail.html',
  'account.html',
  'cart.html',
  'checkout.html'
]);
const ADMIN_PAGES = new Set(['admin.html']);
const AUTH_PAGES = new Set(['login.html']);

function getPageName() {
  const path = window.location.pathname;
  const page = path.split('/').pop();
  if (!page || page === '') return 'index.html';
  return page;
}

function updatePublicNavigationVisibility(user) {
  const navs = document.querySelectorAll('[data-public-nav]');
  const shouldHide = user?.role === 'admin';
  navs.forEach((nav) => {
    nav.classList.toggle('hidden', shouldHide);
  });
}

function enforceRouteGuards(user) {
  const page = getPageName();

  if (user?.role === 'admin') {
    if (PUBLIC_PAGES.has(page) || AUTH_PAGES.has(page)) {
      if (page !== 'admin.html') {
        window.location.href = './admin.html';
      }
      return;
    }
  } else if (ADMIN_PAGES.has(page)) {
    window.location.href = './login.html';
    return;
  }

  if (!user && ADMIN_PAGES.has(page)) {
    window.location.href = './login.html';
  }
}

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

function renderAuthState(user) {
  const slot = document.querySelector('[data-auth-slot]');
  updatePublicNavigationVisibility(user);
  enforceRouteGuards(user);
  if (!slot) return;

  if (typeof teardownAccountMenu === 'function') {
    teardownAccountMenu();
    teardownAccountMenu = null;
  }

  if (!user) {
    slot.innerHTML = `
      <a class="nav__login" href="./login.html" data-auth-login>Login / Signup</a>
    `;
    return;
  }

  const displayName = user.name || user.email || 'Account';
  const initials = (displayName.charAt(0) || '?').toUpperCase();

  slot.innerHTML = `
    <div class="account-menu" data-account-menu>
      <button type="button" class="account-menu__trigger" data-account-trigger>
        <span class="account-menu__avatar" aria-hidden="true">${initials}</span>
        <span class="account-menu__name">${displayName}</span>
        <span class="account-menu__caret" aria-hidden="true">▾</span>
      </button>
      <div class="account-menu__dropdown hidden" data-account-dropdown>
        <a href="./account.html" data-account-link>My Account</a>
        <a href="./orders.html" data-account-link>My Orders</a>
        <a href="./cart.html" data-account-link>My Cart</a>
        <button type="button" data-account-logout>Logout</button>
      </div>
    </div>
  `;

  teardownAccountMenu = setupAccountMenu(slot);
}

function setupAccountMenu(container) {
  const trigger = container.querySelector('[data-account-trigger]');
  const dropdown = container.querySelector('[data-account-dropdown]');
  const logoutButton = container.querySelector('[data-account-logout]');

  if (!trigger || !dropdown) {
    return null;
  }

  let isOpen = false;

  function toggleMenu(force) {
    const nextState = typeof force === 'boolean' ? force : !isOpen;
    isOpen = nextState;
    dropdown.classList.toggle('hidden', !isOpen);
    trigger.setAttribute('aria-expanded', String(isOpen));
  }

  function handleTrigger(event) {
    event.preventDefault();
    toggleMenu();
  }

  function handleDocumentClick(event) {
    if (!container.contains(event.target)) {
      toggleMenu(false);
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      toggleMenu(false);
    }
  }

  async function handleLogout(event) {
    event.preventDefault();
    toggleMenu(false);
    try {
      await api.logout();
    } catch (error) {
      // noop – even if the API call fails we still clear the local session
    }
    signOut();
    window.location.href = './login.html';
  }

  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-expanded', 'false');

  trigger.addEventListener('click', handleTrigger);
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeydown);
  logoutButton?.addEventListener('click', handleLogout);

  return () => {
    trigger.removeEventListener('click', handleTrigger);
    document.removeEventListener('click', handleDocumentClick);
    document.removeEventListener('keydown', handleKeydown);
    logoutButton?.removeEventListener('click', handleLogout);
  };
}

async function hydrateSessionFromServer() {
  const { user, isDemo, token } = getSession();
  renderAuthState(user);

  if (isDemo) {
    return;
  }

  try {
    const profile = await api.getMe();
    if (profile?.id) {
      setSession(profile, token, { demo: isDemo });
    } else if (user) {
      signOut();
    }
  } catch (_error) {
    if (user) {
      signOut();
    }
  }
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
hydrateSessionFromServer();

window.addEventListener('storage', (event) => {
  if (event.key === 'toolkart_cart') {
    updateCartIndicator();
  } else if (event.key === 'toolkart_user') {
    const { user } = getSession();
    renderAuthState(user);
  }
});

window.addEventListener('toolkart:session-changed', (event) => {
  renderAuthState(event.detail?.user ?? null);
});

export { updateCartIndicator };
