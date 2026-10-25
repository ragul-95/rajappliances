import { Router } from 'express';
import { register, login, logout, me } from '../controllers/auth.controller.js';
import { requireUser } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', requireUser, me);

export default router;
