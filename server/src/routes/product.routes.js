import { Router } from 'express';
import {
  getProducts,
  getHomeProducts,
  getProductById,
} from '../controllers/product.controller.js';

const router = Router();

router.get('/', getProducts);
router.get('/home', getHomeProducts);
router.get('/:id', getProductById);

export default router;
