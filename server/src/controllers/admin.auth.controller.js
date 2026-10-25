import bcrypt from 'bcryptjs';
import { Admin } from '../models/Admin.js';
import { AppError } from '../utils/AppError.js';
import { signAdminToken, setAdminCookie, clearAdminCookie } from '../middleware/auth.js';

export async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new AppError('Please provide email and password.', 400));
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const admin = await Admin.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!admin) {
      return next(new AppError('Invalid email or password.', 401));
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return next(new AppError('Invalid email or password.', 401));
    }

    const token = signAdminToken(admin._id);
    setAdminCookie(res, token);

    res.json({
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function adminLogout(req, res, next) {
  try {
    clearAdminCookie(res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function adminMe(req, res, next) {
  try {
    res.json({
      admin: {
        _id: req.admin._id,
        name: req.admin.name,
        email: req.admin.email,
      },
    });
  } catch (err) {
    next(err);
  }
}
