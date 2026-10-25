import { Router } from 'express';
import { handleCreateOrder, handleGetMyOrders } from '../controllers/order.controller.js';
import { requireUser } from '../middleware/auth.js';

const router = Router();

// Customer authentication required for all order routes
router.use(requireUser);

router.post('/', handleCreateOrder);
router.get('/mine', handleGetMyOrders);

export default router;
