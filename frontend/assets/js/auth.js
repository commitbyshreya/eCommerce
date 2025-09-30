import { api } from './api.js';
import { setSession } from './store.js';

const authCard = document.querySelector('[data-auth-card]');
const loginView = document.querySelector('[data-view="login"]');
const registerView = document.querySelector('[data-view="register"]');
const loginForm = document.querySelector('[data-login-form]');
const registerForm = document.querySelector('[data-register-form]');

const demoCredentials = {
  'ava@toolkart.com': 'password123',
  'noah@example.com': 'password123',
  'admin@toolkart.com': 'Admin@123'
};

function redirectAfterLogin(user) {
  if (!user) {
    window.location.href = './index.html';
    return;
  }
  const destination = user.role === 'admin' ? './admin.html' : './index.html';
  window.location.href = destination;
}

function setStatus(form, message) {
  const status = form.querySelector('[data-auth-status]');
  if (status) {
    status.textContent = message;
  }
}

function switchView(mode) {
  if (!loginView || !registerView) return;
  if (mode === 'register') {
    loginView.classList.add('hidden');
    registerView.classList.remove('hidden');
  } else {
    registerView.classList.add('hidden');
    loginView.classList.remove('hidden');
  }
}

function bindSwitchLinks() {
  authCard?.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-switch]');
    if (!trigger) return;
    event.preventDefault();
    switchView(trigger.dataset.switch);
  });
}

async function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await api.login(payload);
    if (!response?.user) {
      throw new Error('Missing user profile');
    }
    setSession(response.user, response.token);
    setStatus(loginForm, 'Login successful! Redirecting...');
    setTimeout(() => {
      redirectAfterLogin(response.user);
    }, 900);
  } catch (error) {
    const safeEmail = payload.email.toLowerCase();
    const allowedPassword = demoCredentials[safeEmail];
    if (allowedPassword && allowedPassword === payload.password) {
      const adminEmails = ['ava@toolkart.com', 'admin@toolkart.com'];
      const demoUser = {
        id: 'demo-user',
        name: safeEmail.split('@')[0],
        email: payload.email,
        role: adminEmails.includes(safeEmail) ? 'admin' : 'customer'
      };
      setSession(demoUser, 'demo-token', { demo: true });
      setStatus(loginForm, 'Logged in (demo mode). Redirecting...');
      setTimeout(() => {
        redirectAfterLogin(demoUser);
      }, 900);
      return;
    }

    setStatus(loginForm, error.message || 'Invalid credentials. Please try again.');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const formData = new FormData(registerForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await api.register(payload);
    if (!response?.user) {
      throw new Error('Missing user profile');
    }
    setSession(response.user, response.token);
    setStatus(registerForm, 'Account created! Redirecting...');
    setTimeout(() => {
      window.location.href = './index.html';
    }, 900);
  } catch (error) {
    if (error?.message && error.message !== 'Request failed') {
      setStatus(registerForm, error.message);
      return;
    }
    setSession({
      id: 'demo-user',
      name: payload.name,
      email: payload.email,
      role: 'customer'
    }, 'demo-token', { demo: true });
    setStatus(registerForm, 'Demo account ready! Redirecting...');
    setTimeout(() => {
      window.location.href = './index.html';
    }, 900);
  }
}

bindSwitchLinks();

if (loginForm) {
  loginForm.addEventListener('submit', handleLogin);
}

if (registerForm) {
  registerForm.addEventListener('submit', handleRegister);
}
