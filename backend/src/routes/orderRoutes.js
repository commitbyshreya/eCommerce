import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createOrder, getOrderById, getOrders } from '../controllers/orderController.js';

const router = Router();

router.use(authenticate);
router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);

export default router;
