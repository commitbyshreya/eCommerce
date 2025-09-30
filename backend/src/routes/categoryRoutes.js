import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory
} from '../controllers/categoryController.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', listCategories);
router.post('/', authenticate, authorize('admin'), upload.single('image'), createCategory);
router.put('/:id', authenticate, authorize('admin'), upload.single('image'), updateCategory);
router.delete('/:id', authenticate, authorize('admin'), deleteCategory);

export default router;
