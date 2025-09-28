import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createOrder, getOrders } from '../controllers/orderController.js';

const router = Router();

router.use(authenticate);
router.post('/', createOrder);
router.get('/', getOrders);

export default router;
