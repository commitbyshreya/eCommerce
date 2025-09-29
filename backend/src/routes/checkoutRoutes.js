import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { simulatePayment } from '../controllers/checkoutController.js';

const router = Router();

router.post('/simulate', authenticate, simulatePayment);

export default router;
