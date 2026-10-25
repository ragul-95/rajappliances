import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Admin } from '../src/models/Admin.js';
import { User } from '../src/models/User.js';
import { Product } from '../src/models/Product.js';
import { Order } from '../src/models/Order.js';
import { Counter } from '../src/models/Counter.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDB(mongoServer.getUri());
});

afterAll(async () => {
  await disconnectDB();
  if (mongoServer) await mongoServer.stop();
});

describe('Stage A: Foundation & Security Checks', () => {
  it('GET /api/health returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET /api/csrf-token returns a token and sets the _csrf cookie', async () => {
    const res = await request(app).get('/api/csrf-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('csrfToken');
    expect(typeof res.body.csrfToken).toBe('string');
    expect(res.body.csrfToken.length).toBe(64); // 32 bytes hex = 64 chars

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const csrfCookie = cookies.find((c) => c.startsWith('_csrf='));
    expect(csrfCookie).toBeDefined();
    expect(csrfCookie).toContain('HttpOnly');
  });

  it('A POST without a CSRF token gets 403 CSRF_INVALID', async () => {
    const res = await request(app).post('/api/some-endpoint').send({ test: 123 });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      message: 'Invalid or missing CSRF token.',
      code: 'CSRF_INVALID',
    });
  });

  it('A POST with a mismatched CSRF token gets 403 CSRF_INVALID', async () => {
    const tokenRes = await request(app).get('/api/csrf-token');
    const cookies = tokenRes.headers['set-cookie'];

    const res = await request(app)
      .post('/api/some-endpoint')
      .set('Cookie', cookies)
      .set('X-CSRF-Token', 'wrong-token-value-with-length-64-characters-0123456789abcdef012345678')
      .send({ test: 123 });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF_INVALID');
  });

  it('A POST with matching cookie and X-CSRF-Token passes CSRF check', async () => {
    const tokenRes = await request(app).get('/api/csrf-token');
    const token = tokenRes.body.csrfToken;
    const cookies = tokenRes.headers['set-cookie'];

    // Post to an endpoint (will hit 404 since route doesn't exist, which proves CSRF passed!)
    const res = await request(app)
      .post('/api/test-route')
      .set('Cookie', cookies)
      .set('X-CSRF-Token', token)
      .send({ test: 123 });

    // Should NOT be 403 CSRF_INVALID
    expect(res.status).toBe(404);
  });

  it('All 5 Mongoose models are properly configured', async () => {
    expect(Admin.modelName).toBe('Admin');
    expect(User.modelName).toBe('User');
    expect(Product.modelName).toBe('Product');
    expect(Order.modelName).toBe('Order');
    expect(Counter.modelName).toBe('Counter');

    // Test Admin model validation
    const admin = new Admin({ name: 'Test Admin', email: 'admin@test.com', passwordHash: 'hash123' });
    expect(admin.validateSync()).toBeUndefined();

    // Test User model validation
    const user = new User({ name: 'Test User', email: 'user@test.com', passwordHash: 'hash123' });
    expect(user.validateSync()).toBeUndefined();

    // Test Counter model validation
    const counter = new Counter({ name: 'orders', seq: 1 });
    expect(counter.validateSync()).toBeUndefined();

    // Test Product model validation
    const product = new Product({
      name: 'Test Product',
      category: 'Electronics',
      description: 'A valid description with more than 10 characters',
      price: 1999,
      images: [{ angle: 'front', url: 'https://example.com/front.jpg' }],
    });
    expect(product.validateSync()).toBeUndefined();

    // Test Order model validation
    const order = new Order({
      orderNumber: 'RA-2026-000001',
      user: new mongoose.Types.ObjectId(),
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: 'Test Product',
          image: 'https://example.com/front.jpg',
          quantity: 1,
          unitPrice: 1999,
        },
      ],
      shipping: {
        fullName: 'John Doe',
        mobile: '9876543210',
        line1: '123 Main St',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
      },
      paymentMethod: 'Cash on Delivery',
      subtotal: 1999,
      deliveryFee: 0,
      total: 1999,
      status: 'Order Placed',
    });
    expect(order.validateSync()).toBeUndefined();
  });
});
