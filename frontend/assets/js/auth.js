import { api } from './api.js';
import { setSession } from './store.js';

const authCard = document.querySelector('[data-auth-card]');
const loginView = document.querySelector('[data-view="login"]');
const registerView = document.querySelector('[data-view="register"]');
const loginForm = document.querySelector('[data-login-form]');
const registerForm = document.querySelector('[data-register-form]');

const demoCredentials = {
  'ava@toolkart.com': 'password123',
  'noah@example.com': 'password123'
};

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
    setSession(response.token, response.user);
    setStatus(loginForm, 'Login successful! Redirecting...');
    setTimeout(() => {
      window.location.href = './index.html';
    }, 900);
  } catch (error) {
    const allowedPassword = demoCredentials[payload.email];
    if (allowedPassword && allowedPassword === payload.password) {
      setSession('demo-token', {
        id: 'demo-user',
        name: payload.email.split('@')[0],
        email: payload.email,
        role: payload.email === 'ava@toolkart.com' ? 'admin' : 'customer'
      });
      setStatus(loginForm, 'Logged in (demo mode). Redirecting...');
      setTimeout(() => {
        window.location.href = './index.html';
      }, 900);
      return;
    }

    setStatus(loginForm, 'Invalid credentials. Please try again.');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const formData = new FormData(registerForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await api.register(payload);
    setSession(response.token, response.user);
    setStatus(registerForm, 'Account created! Redirecting...');
    setTimeout(() => {
      window.location.href = './index.html';
    }, 900);
  } catch (error) {
    setSession('demo-token', {
      id: 'demo-user',
      name: payload.name,
      email: payload.email,
      role: 'customer'
    });
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
