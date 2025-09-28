import { Router } from 'express';
import { getFeatured, getFilters, getProduct, getProducts } from '../controllers/productController.js';

const router = Router();

router.get('/', getProducts);
router.get('/featured', getFeatured);
router.get('/filters', getFilters);
router.get('/:id', getProduct);

export default router;
