import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { demoStore, isDatabaseConnected } from '../utils/demoStore.js';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, config.jwtSecret);

    if (isDatabaseConnected()) {
      const user = await User.findById(payload.sub).select('-password');
      if (!user) {
        return res.status(401).json({ message: 'User no longer exists' });
      }
      req.user = user;
      return next();
    }

    const user = demoStore.users.find((item) => item._id === payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'Demo user not found' });
    }

    const { password, ...safeUser } = user;
    req.user = safeUser;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}
