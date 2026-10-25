import { Router } from 'express';
import { getAdminStats } from '../controllers/admin.stats.controller.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAdmin);
router.get('/', getAdminStats);

export default router;
