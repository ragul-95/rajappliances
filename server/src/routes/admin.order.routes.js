import { Router } from 'express';
import {
  getAdminOrders,
  getAdminOrder,
  handleUpdateOrderStatus,
} from '../controllers/admin.order.controller.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAdmin);

router.get('/', getAdminOrders);
router.get('/:id', getAdminOrder);
router.patch('/:id/status', handleUpdateOrderStatus);

export default router;
