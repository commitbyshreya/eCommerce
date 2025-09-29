import { api } from './api.js';
import { getSession, setSession, signOut } from './store.js';

async function fetchProfile() {
  try {
    const existing = getSession();
    const profile = await api.getMe();
    if (profile?.id) {
      setSession(profile, existing.token, { demo: existing.isDemo });
      return { user: profile, token: existing.token, isDemo: existing.isDemo };
    }
  } catch (_error) {
    // swallow errors – callers decide how to react
  }
  return { user: null, token: null, isDemo: false };
}

export async function ensureSession(options = {}) {
  const { forceRefresh = false } = options;
  const existing = getSession();

  if (existing.isDemo) {
    return existing;
  }

  if (existing.user && !forceRefresh) {
    return existing;
  }

  if (!existing.token) {
    if (existing.user) {
      signOut();
    }
    return { user: null, token: null, isDemo: false };
  }

  const refreshed = await fetchProfile();
  if (refreshed.user) {
    return { ...existing, ...refreshed };
  }

  signOut();
  return { user: null, token: null, isDemo: false };
}

export async function requireSession(options = {}) {
  const { redirectTo = './login.html' } = options;
  const session = await ensureSession({ forceRefresh: true });
  if (!session.user) {
    if (redirectTo) {
      window.location.href = redirectTo;
    }
    throw new Error('Authentication required');
  }
  return session;
}
