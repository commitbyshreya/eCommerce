import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { login, logout, me, profile, register } from '../controllers/authController.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticate, me);
router.get('/profile', authenticate, profile);

export default router;
