import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { config } from '../config/env.js';
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

export async function register(req, res) {
  const { name, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const safeEmail = email.toLowerCase();

  try {
    if (isDatabaseConnected()) {
      const existing = await User.findOne({ email: safeEmail });
      if (existing) {
        return res.status(409).json({ message: 'Email already registered' });
      }

      const user = await User.create({ name, email: safeEmail, password });
      const token = createToken(user);
      return res.status(201).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
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
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Registration failed' });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const safeEmail = email.toLowerCase();

  try {
    if (isDatabaseConnected()) {
      const user = await User.findOne({ email: safeEmail });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const matches = await user.comparePassword(password);
      if (!matches) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = createToken(user);
      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
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
    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed' });
  }
}

export async function profile(req, res) {
  return res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role
  });
}

export function listDemoUsers(req, res) {
  if (!isDatabaseConnected()) {
    return res.json(demoStore.users.map(({ password, ...rest }) => rest));
  }
  return res.status(403).json({ message: 'Demo users endpoint available only offline' });
}
