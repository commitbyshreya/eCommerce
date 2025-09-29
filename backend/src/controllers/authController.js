import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { config } from '../config/env.js';
import { ensureDatabaseConnection } from '../config/db.js';
import {
  addDemoUser,
  demoStore,
  findDemoUserByEmail,
  isDatabaseConnected
} from '../utils/demoStore.js';

function createToken(user) {
  return jwt.sign({ sub: user._id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
}

function formatUser(user) {
  if (!user) return null;
  const id = typeof user._id === 'object' && user._id !== null && 'toString' in user._id
    ? user._id.toString()
    : user._id || user.id;
  return {
    id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

function setSessionCookie(res, token) {
  const options = {
    httpOnly: true,
    secure: config.session.secure,
    sameSite: config.session.sameSite,
    maxAge: config.session.maxAge,
    path: '/'
  };

  if (config.session.domain) {
    options.domain = config.session.domain;
  }

  res.cookie(config.session.cookieName, token, options);
}

function clearSessionCookie(res) {
  const options = {
    httpOnly: true,
    secure: config.session.secure,
    sameSite: config.session.sameSite,
    path: '/'
  };

  if (config.session.domain) {
    options.domain = config.session.domain;
  }

  res.clearCookie(config.session.cookieName, options);
}

export async function register(req, res) {
  const { name, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  const safeEmail = email.toLowerCase();
  const preferDatabase = Boolean(config.mongoUri);

  try {
    const dbReady = await ensureDatabaseConnection();

    if (dbReady) {
      const existing = await User.findOne({ email: safeEmail });
      if (existing) {
        return res.status(409).json({ message: 'Email already registered' });
      }

      const user = await User.create({ name, email: safeEmail, password });
      const token = createToken(user);
      setSessionCookie(res, token);
      return res.status(201).json({ token, user: formatUser(user) });
    }

    if (preferDatabase) {
      return res.status(503).json({ message: 'Database unavailable. Please try again shortly.' });
    }

    const existing = findDemoUserByEmail(safeEmail);
    if (existing) {
      return res.status(409).json({ message: 'Email already registered (demo)' });
    }

    const user = addDemoUser({
      name,
      email: safeEmail,
      password: bcrypt.hashSync(password, 10),
      role: 'customer'
    });

    const token = createToken(user);
    setSessionCookie(res, token);
    return res.status(201).json({ token, user: formatUser(user) });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Invalid registration data' });
    }
    return res.status(500).json({ message: 'Registration failed' });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const safeEmail = email.toLowerCase();
  const preferDatabase = Boolean(config.mongoUri);

  try {
    const dbReady = await ensureDatabaseConnection();

    if (dbReady) {
      const user = await User.findOne({ email: safeEmail });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const matches = await user.comparePassword(password);
      if (!matches) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = createToken(user);
      setSessionCookie(res, token);
      return res.json({ token, user: formatUser(user) });
    }

    if (preferDatabase) {
      return res.status(503).json({ message: 'Database unavailable. Please try again shortly.' });
    }

    const user = findDemoUserByEmail(safeEmail);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials (demo)' });
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = createToken(user);
    setSessionCookie(res, token);
    return res.json({ token, user: formatUser(user) });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed' });
  }
}

export async function profile(req, res) {
  return res.json(formatUser(req.user));
}

export function listDemoUsers(req, res) {
  if (!isDatabaseConnected()) {
    return res.json(demoStore.users.map(({ password, ...rest }) => rest));
  }
  return res.status(403).json({ message: 'Demo users endpoint available only offline' });
}

export function me(req, res) {
  return res.json(formatUser(req.user));
}

export function logout(_req, res) {
  clearSessionCookie(res);
  return res.status(204).send();
}
