import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import { env } from './config/env.js';
import { mongoSanitize } from './middleware/sanitize.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { verifyCsrf } from './middleware/csrf.js';
import { errorHandler } from './middleware/errorHandler.js';
import csrfRoutes from './routes/csrf.routes.js';
import adminAuthRoutes from './routes/admin.auth.routes.js';
import adminProductRoutes from './routes/admin.product.routes.js';
import adminStatsRoutes from './routes/admin.stats.routes.js';
import adminOrderRoutes from './routes/admin.order.routes.js';
import productRoutes from './routes/product.routes.js';
import authRoutes from './routes/auth.routes.js';
import orderRoutes from './routes/order.routes.js';

export const app = express();

// Security headers
app.use(helmet());

// Cross-origin resource sharing
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Cookie parser
app.use(cookieParser());

// HTTP Parameter Pollution protection
app.use(hpp());

// Sanitize against NoSQL operator injection
app.use(mongoSanitize);

// Global rate limiting
app.use('/api', globalLimiter);

// CSRF verification on mutating methods
app.use('/api', verifyCsrf);

// CSRF token route
app.use('/api', csrfRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Admin routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/stats', adminStatsRoutes);
app.use('/api/admin/orders', adminOrderRoutes);

// Public routes
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);

// Customer order routes
app.use('/api/orders', orderRoutes);

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ message: `Cannot ${req.method} ${req.originalUrl}` });
});

// Central error handling
app.use(errorHandler);

export default app;
