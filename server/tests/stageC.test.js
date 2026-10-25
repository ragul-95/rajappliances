import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Product } from '../src/models/Product.js';
import { User } from '../src/models/User.js';

let csrfToken;
let csrfCookie;
let sampleProduct;
let userCookie;
const testCustomerEmail = `customer_${Date.now()}@rajappliences.com`;

beforeAll(async () => {
  await connectDB();

  // Obtain CSRF token and cookie
  const csrfRes = await request(app).get('/api/csrf-token');
  csrfToken = csrfRes.body.csrfToken;
  csrfCookie = csrfRes.headers['set-cookie'];

  // Ensure products exist in DB (seeded in Stage B)
  sampleProduct = await Product.findOne();
  expect(sampleProduct).toBeDefined();
});

afterAll(async () => {
  await User.deleteOne({ email: testCustomerEmail });
  await disconnectDB();
});

describe('Stage C: Public Products and Customer Auth', () => {
  describe('Public Products API', () => {
    it('GET /api/products returns all products', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products.length).toBeGreaterThanOrEqual(40);
    });

    it('GET /api/products filters by category', async () => {
      const res = await request(app).get('/api/products?category=Fashion');
      expect(res.status).toBe(200);
      expect(res.body.products.length).toBeGreaterThan(0);
      res.body.products.forEach((p) => {
        expect(p.category).toBe('Fashion');
      });
    });

    it('GET /api/products filters by multiple categories', async () => {
      const res = await request(app).get('/api/products?category=Fashion,Electronics');
      expect(res.status).toBe(200);
      expect(res.body.products.length).toBeGreaterThan(0);
      res.body.products.forEach((p) => {
        expect(['Fashion', 'Electronics']).toContain(p.category);
      });
    });

    it('GET /api/products filters by search term', async () => {
      const res = await request(app).get('/api/products?search=Sony');
      expect(res.status).toBe(200);
      expect(res.body.products.length).toBeGreaterThan(0);
      res.body.products.forEach((p) => {
        const match =
          p.name.toLowerCase().includes('sony') ||
          p.brand.toLowerCase().includes('sony') ||
          p.category.toLowerCase().includes('sony');
        expect(match).toBe(true);
      });
    });

    it('GET /api/products filters by price range (minPrice & maxPrice)', async () => {
      const minPrice = 1000;
      const maxPrice = 5000;
      const res = await request(app).get(`/api/products?minPrice=${minPrice}&maxPrice=${maxPrice}`);
      expect(res.status).toBe(200);
      expect(res.body.products.length).toBeGreaterThan(0);
      res.body.products.forEach((p) => {
        expect(p.price).toBeGreaterThanOrEqual(minPrice);
        expect(p.price).toBeLessThanOrEqual(maxPrice);
      });
    });

    it('GET /api/products sorts correctly (price-low, price-high, rating)', async () => {
      const lowRes = await request(app).get('/api/products?sort=price-low&limit=10');
      expect(lowRes.status).toBe(200);
      const lowPrices = lowRes.body.products.map((p) => p.price);
      for (let i = 0; i < lowPrices.length - 1; i++) {
        expect(lowPrices[i]).toBeLessThanOrEqual(lowPrices[i + 1]);
      }

      const highRes = await request(app).get('/api/products?sort=price-high&limit=10');
      expect(highRes.status).toBe(200);
      const highPrices = highRes.body.products.map((p) => p.price);
      for (let i = 0; i < highPrices.length - 1; i++) {
        expect(highPrices[i]).toBeGreaterThanOrEqual(highPrices[i + 1]);
      }
    });

    it('GET /api/products filters by comma-separated ids', async () => {
      const all = await Product.find().limit(3);
      const ids = all.map((p) => p._id.toString()).join(',');
      const res = await request(app).get(`/api/products?ids=${ids}`);
      expect(res.status).toBe(200);
      expect(res.body.products.length).toBe(3);
    });

    it('GET /api/products/home returns deals, bestSellers, and recommended sections', async () => {
      const res = await request(app).get('/api/products/home');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('deals');
      expect(res.body).toHaveProperty('bestSellers');
      expect(res.body).toHaveProperty('recommended');

      expect(Array.isArray(res.body.deals)).toBe(true);
      expect(Array.isArray(res.body.bestSellers)).toBe(true);
      expect(Array.isArray(res.body.recommended)).toBe(true);

      expect(res.body.deals.length).toBeLessThanOrEqual(8);
      expect(res.body.bestSellers.length).toBeLessThanOrEqual(8);
      expect(res.body.recommended.length).toBeLessThanOrEqual(8);
    });

    it('GET /api/products/:id returns the single product for a valid ID', async () => {
      const res = await request(app).get(`/api/products/${sampleProduct._id}`);
      expect(res.status).toBe(200);
      expect(res.body.product._id).toBe(sampleProduct._id.toString());
      expect(res.body.product.name).toBe(sampleProduct.name);
    });

    it('GET /api/products/:id returns 404 for bad or unknown ID without leaking CastError', async () => {
      const invalidRes = await request(app).get('/api/products/invalid-mongo-id');
      expect(invalidRes.status).toBe(404);
      expect(invalidRes.body.message).toBe('Product not found.');

      const nonExistentId = '660000000000000000000000';
      const nonExistentRes = await request(app).get(`/api/products/${nonExistentId}`);
      expect(nonExistentRes.status).toBe(404);
      expect(nonExistentRes.body.message).toBe('Product not found.');
    });
  });

  describe('Customer Auth API', () => {
    it('POST /api/auth/register creates a customer account and sets user cookie', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Cookie', csrfCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Jane Customer',
          email: testCustomerEmail,
          password: 'CustomerPass2026!',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testCustomerEmail);
      expect(res.body.user.name).toBe('Jane Customer');
      expect(res.body.user.passwordHash).toBeUndefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const userCookieEntry = cookies.find((c) => c.startsWith('raj_user_token='));
      expect(userCookieEntry).toBeDefined();
      expect(userCookieEntry).toContain('HttpOnly');

      userCookie = userCookieEntry;
    });

    it('POST /api/auth/register rejects duplicate email with 409', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Cookie', csrfCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Jane Duplicate',
          email: testCustomerEmail,
          password: 'AnotherPassword!',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already exists');
    });

    it('POST /api/auth/login succeeds with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Cookie', csrfCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: testCustomerEmail,
          password: 'CustomerPass2026!',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testCustomerEmail);
    });

    it('POST /api/auth/login says "Invalid email or password" for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Cookie', csrfCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: testCustomerEmail,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password.');
    });

    it('POST /api/auth/login says "Invalid email or password" for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Cookie', csrfCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: 'nonexistent_customer_xyz@rajappliences.com',
          password: 'SomePassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password.');
    });

    it('GET /api/auth/me returns the logged in user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [csrfCookie[0], userCookie]);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testCustomerEmail);
      expect(res.body.user.name).toBe('Jane Customer');
    });

    it('GET /api/auth/me returns 401 when not logged in', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('POST /api/auth/logout clears user cookie', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [csrfCookie[0], userCookie])
        .set('X-CSRF-Token', csrfToken);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const cookies = res.headers['set-cookie'];
      const userCookieEntry = cookies.find((c) => c.startsWith('raj_user_token='));
      expect(userCookieEntry).toContain('raj_user_token=;');
    });
  });
});
