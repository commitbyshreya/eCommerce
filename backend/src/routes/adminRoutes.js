import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getDashboard } from '../controllers/adminController.js';

const router = Router();

router.use(authenticate, authorize('admin'));
router.get('/dashboard', getDashboard);

export default router;
