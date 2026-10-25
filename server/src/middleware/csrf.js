import crypto from 'crypto';
import { env } from '../config/env.js';

export const CSRF_COOKIE_NAME = '_csrf';

export function issueCsrfToken(req, res) {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });
  return token;
}

export function verifyCsrf(req, res, next) {
  // Safe HTTP methods do not change state
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  const clientToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

  if (
    !clientToken ||
    !cookieToken ||
    typeof clientToken !== 'string' ||
    typeof cookieToken !== 'string' ||
    clientToken.length !== cookieToken.length
  ) {
    return res.status(403).json({
      message: 'Invalid or missing CSRF token.',
      code: 'CSRF_INVALID',
    });
  }

  const clientBuf = Buffer.from(clientToken);
  const cookieBuf = Buffer.from(cookieToken);

  if (!crypto.timingSafeEqual(clientBuf, cookieBuf)) {
    return res.status(403).json({
      message: 'Invalid or missing CSRF token.',
      code: 'CSRF_INVALID',
    });
  }

  next();
}
