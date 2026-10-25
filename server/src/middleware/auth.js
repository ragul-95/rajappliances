import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Admin } from '../models/Admin.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export const ADMIN_COOKIE_NAME = 'raj_admin_token';
export const USER_COOKIE_NAME = 'raj_user_token';

const cookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export function signAdminToken(adminId) {
  return jwt.sign({ id: adminId, role: 'admin' }, env.JWT_ADMIN_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

export function signUserToken(userId) {
  return jwt.sign({ id: userId, role: 'user' }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

export function setAdminCookie(res, token) {
  res.cookie(ADMIN_COOKIE_NAME, token, cookieOptions);
}

export function setUserCookie(res, token) {
  res.cookie(USER_COOKIE_NAME, token, cookieOptions);
}

export function clearAdminCookie(res) {
  res.clearCookie(ADMIN_COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
  });
}

export function clearUserCookie(res) {
  res.clearCookie(USER_COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
  });
}

export async function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.[ADMIN_COOKIE_NAME];
    if (!token) {
      return next(new AppError('Please sign in as admin to continue.', 401));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_ADMIN_SECRET);
    } catch {
      return next(new AppError('Admin session expired or invalid. Please sign in again.', 401));
    }

    if (decoded.role !== 'admin' || !decoded.id) {
      return next(new AppError('Invalid admin credentials.', 401));
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return next(new AppError('Admin account not found.', 401));
    }

    req.admin = admin;
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireUser(req, res, next) {
  try {
    const token = req.cookies?.[USER_COOKIE_NAME];
    if (!token) {
      return next(new AppError('Please sign in to continue.', 401));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch {
      return next(new AppError('Session expired. Please sign in again.', 401));
    }

    if (decoded.role !== 'user' || !decoded.id) {
      return next(new AppError('Invalid user credentials.', 401));
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError('User account not found.', 401));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
