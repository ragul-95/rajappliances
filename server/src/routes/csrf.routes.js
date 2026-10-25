import { Router } from 'express';
import { issueCsrfToken } from '../middleware/csrf.js';

const router = Router();

router.get('/csrf-token', (req, res) => {
  const token = issueCsrfToken(req, res);
  res.json({ csrfToken: token });
});

export default router;
