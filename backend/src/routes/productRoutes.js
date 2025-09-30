import { Router } from 'express';
import {
  getFeatured,
  getFilters,
  getProduct,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', getProducts);
router.post('/', authenticate, authorize('admin'), upload.single('image'), createProduct);
router.put('/:id', authenticate, authorize('admin'), upload.single('image'), updateProduct);
router.delete('/:id', authenticate, authorize('admin'), deleteProduct);
router.get('/featured', getFeatured);
router.get('/filters', getFilters);
router.get('/:id', getProduct);

export default router;
