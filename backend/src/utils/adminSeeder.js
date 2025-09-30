import { User } from '../models/User.js';
import { config } from '../config/env.js';

let ensurePromise = null;

export async function ensureAdminUser() {
  const { email, password, name } = config.adminAccount;
  if (!email || !password) {
    return null;
  }

  if (ensurePromise) {
    return ensurePromise;
  }

  ensurePromise = (async () => {
    try {
      const existing = await User.findOne({ email });
      if (existing) {
        let dirty = false;

        if (existing.role !== 'admin') {
          existing.role = 'admin';
          dirty = true;
        }

        if (password && typeof existing.comparePassword === 'function') {
          const matches = await existing.comparePassword(password);
          if (!matches) {
            existing.password = password;
            dirty = true;
          }
        }

        if (dirty) {
          await existing.save();
        }

        return existing;
      }

      return User.create({
        name: name || 'Administrator',
        email,
        password,
        role: 'admin'
      });
    } catch (error) {
      console.error('Failed to ensure admin user:', error);
      return null;
    } finally {
      ensurePromise = null;
    }
  })();

  return ensurePromise;
}
