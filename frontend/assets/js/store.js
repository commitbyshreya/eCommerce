const CART_KEY = 'toolkart_cart';
const USER_KEY = 'toolkart_user';
const TOKEN_KEY = 'toolkart_token';

export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (error) {
    return [];
  }
}

export function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function addToCart(item) {
  const cart = getCart();
  const existing = cart.find((cartItem) => cartItem.id === item.id);

  if (existing) {
    existing.quantity += item.quantity || 1;
  } else {
    cart.push({ ...item, quantity: item.quantity || 1 });
  }

  saveCart(cart);
  return cart;
}

export function updateCartQuantity(id, quantity) {
  const cart = getCart().map((item) =>
    item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
  );
  saveCart(cart);
  return cart;
}

export function removeCartItem(id) {
  const cart = getCart().filter((item) => item.id !== id);
  saveCart(cart);
  return cart;
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
}

export function setSession(user, token = null, options = {}) {
  if (!user) {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('toolkart:session-changed', { detail: { user: null } }));
    }
    return null;
  }
  const record = { ...user };
  if (options.demo) {
    record.demo = true;
  }
  localStorage.setItem(USER_KEY, JSON.stringify(record));
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else if (!options.demo) {
    localStorage.removeItem(TOKEN_KEY);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('toolkart:session-changed', { detail: { user: record } }));
  }
  return record;
}

export function getSession() {
  const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    token,
    user,
    isDemo: Boolean(user?.demo)
  };
}

export function signOut() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('toolkart:session-changed', { detail: { user: null } }));
  }
}
