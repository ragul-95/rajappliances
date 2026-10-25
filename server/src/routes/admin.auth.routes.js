import { Router } from 'express';
import { adminLogin, adminLogout, adminMe } from '../controllers/admin.auth.controller.js';
import { requireAdmin } from '../middleware/auth.js';
import { adminAuthLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/login', adminAuthLimiter, adminLogin);
router.post('/logout', adminLogout);
router.get('/me', requireAdmin, adminMe);

export default router;
