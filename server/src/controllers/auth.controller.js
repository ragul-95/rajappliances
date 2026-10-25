import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { signUserToken, setUserCookie, clearUserCookie } from '../middleware/auth.js';

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || name.trim().length < 2) {
      return next(new AppError('Enter your name (at least 2 characters).', 400));
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return next(new AppError('Enter a valid email address.', 400));
    }

    if (!password || password.length < 6) {
      return next(new AppError('Password must be at least 6 characters long.', 400));
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return next(
        new AppError('An account with this email already exists. Please sign in.', 409)
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    const token = signUserToken(user._id);
    setUserCookie(res, token);

    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide email and password.', 400));
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) {
      return next(new AppError('Invalid email or password.', 401));
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return next(new AppError('Invalid email or password.', 401));
    }

    const token = signUserToken(user._id);
    setUserCookie(res, token);

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    clearUserCookie(res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    res.json({
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
      },
    });
  } catch (err) {
    next(err);
  }
}
