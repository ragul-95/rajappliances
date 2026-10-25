import { Router } from 'express';
import {
  adminGetProducts,
  adminGetProduct,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
} from '../controllers/admin.product.controller.js';
import { requireAdmin } from '../middleware/auth.js';
import { handleProductUpload } from '../middleware/upload.js';

const router = Router();

// All admin product routes require admin auth
router.use(requireAdmin);

router.get('/', adminGetProducts);
router.get('/:id', adminGetProduct);
router.post('/', handleProductUpload, adminCreateProduct);
router.put('/:id', handleProductUpload, adminUpdateProduct);
router.delete('/:id', adminDeleteProduct);

export default router;
