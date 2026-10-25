import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Admin } from '../src/models/Admin.js';
import { Product } from '../src/models/Product.js';
import { cloudinary } from '../src/config/cloudinary.js';

let csrfToken;
let csrfCookie;
let adminCookie;
let testAdmin;

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

beforeAll(async () => {
  await connectDB();

  // Obtain CSRF token and cookie
  const csrfRes = await request(app).get('/api/csrf-token');
  csrfToken = csrfRes.body.csrfToken;
  csrfCookie = csrfRes.headers['set-cookie'];

  // Create a unique test admin if not already present
  const email = 'testadmin_stageb@rajappliences.com';
  await Admin.deleteOne({ email });
  const passwordHash = await bcrypt.hash('TestAdminPass123!', 12);
  testAdmin = await Admin.create({
    name: 'StageB Test Admin',
    email,
    passwordHash,
  });
});

afterAll(async () => {
  if (testAdmin?._id) {
    await Admin.deleteOne({ _id: testAdmin._id });
  }
  await disconnectDB();
});

describe('Stage B: Admin Auth and Product Management', () => {
  it('Admin login with incorrect password returns 401', async () => {
    const res = await request(app)
      .post('/api/admin/auth/login')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        email: testAdmin.email,
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password.');
  });

  it('Admin login with correct password returns admin object and sets cookie', async () => {
    const res = await request(app)
      .post('/api/admin/auth/login')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        email: testAdmin.email,
        password: 'TestAdminPass123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.admin).toBeDefined();
    expect(res.body.admin.email).toBe(testAdmin.email);
    expect(res.body.admin.passwordHash).toBeUndefined();

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const adminCookieEntry = cookies.find((c) => c.startsWith('raj_admin_token='));
    expect(adminCookieEntry).toBeDefined();
    expect(adminCookieEntry).toContain('HttpOnly');

    // Save admin cookie for subsequent authenticated admin requests
    adminCookie = adminCookieEntry;
  });

  it('GET /api/admin/auth/me returns currently authenticated admin', async () => {
    const res = await request(app)
      .get('/api/admin/auth/me')
      .set('Cookie', [csrfCookie[0], adminCookie]);

    expect(res.status).toBe(200);
    expect(res.body.admin.email).toBe(testAdmin.email);
  });

  it('GET /api/admin/auth/me without admin cookie returns 401', async () => {
    const res = await request(app).get('/api/admin/auth/me');
    expect(res.status).toBe(401);
  });

  it('Admin can list products via GET /api/admin/products', async () => {
    const res = await request(app)
      .get('/api/admin/products')
      .set('Cookie', [csrfCookie[0], adminCookie]);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products.length).toBeGreaterThanOrEqual(40);
  });

  let createdProductId;
  let uploadedPublicId;

  it('Admin can create a product with image upload to Cloudinary', async () => {
    const res = await request(app)
      .post('/api/admin/products')
      .set('Cookie', [csrfCookie[0], adminCookie])
      .set('X-CSRF-Token', csrfToken)
      .field('name', 'Stage B Automated Test Product')
      .field('price', 4999)
      .field('originalPrice', 6999)
      .field('brand', 'RajAppliences Pro')
      .field('category', 'Electronics')
      .field('description', 'This is a test product created by the automated Stage B test suite.')
      .field('hasSizes', 'false')
      .field('stock', 25)
      .field('badges', JSON.stringify(['Best Seller']))
      .attach('front', TINY_PNG, 'test-front.png');

    expect(res.status).toBe(201);
    expect(res.body.product).toBeDefined();
    expect(res.body.product.name).toBe('Stage B Automated Test Product');
    expect(res.body.product.images.length).toBe(1);
    expect(res.body.product.images[0].angle).toBe('front');
    expect(res.body.product.images[0].url).toContain('cloudinary.com');

    createdProductId = res.body.product._id;

    // Verify Cloudinary has the image by fetching the product directly from DB
    const dbProduct = await Product.findById(createdProductId);
    uploadedPublicId = dbProduct.images[0].publicId;
    expect(uploadedPublicId).toBeDefined();
    expect(uploadedPublicId.length).toBeGreaterThan(0);

    // Verify the image exists in Cloudinary
    const cRes = await cloudinary.api.resource(uploadedPublicId);
    expect(cRes.public_id).toBe(uploadedPublicId);
  });

  it('Admin can edit product and update image (replaces old Cloudinary asset)', async () => {
    const res = await request(app)
      .put(`/api/admin/products/${createdProductId}`)
      .set('Cookie', [csrfCookie[0], adminCookie])
      .set('X-CSRF-Token', csrfToken)
      .field('name', 'Stage B Automated Test Product (Updated)')
      .field('price', 4599)
      .attach('front', TINY_PNG, 'test-front-updated.png');

    expect(res.status).toBe(200);
    expect(res.body.product.name).toBe('Stage B Automated Test Product (Updated)');
    expect(res.body.product.price).toBe(4599);

    const dbProduct = await Product.findById(createdProductId);
    const newPublicId = dbProduct.images[0].publicId;
    expect(newPublicId).not.toBe(uploadedPublicId);

    // Verify old image was deleted from Cloudinary
    await expect(cloudinary.api.resource(uploadedPublicId)).rejects.toThrow();

    uploadedPublicId = newPublicId;
  });

  it('Admin can delete product and its Cloudinary assets are removed', async () => {
    const res = await request(app)
      .delete(`/api/admin/products/${createdProductId}`)
      .set('Cookie', [csrfCookie[0], adminCookie])
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // Check DB removal
    const dbProduct = await Product.findById(createdProductId);
    expect(dbProduct).toBeNull();

    // Verify Cloudinary asset is removed
    await expect(cloudinary.api.resource(uploadedPublicId)).rejects.toThrow();
  });

  it('Admin logout clears admin cookie', async () => {
    const res = await request(app)
      .post('/api/admin/auth/logout')
      .set('Cookie', [csrfCookie[0], adminCookie])
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const cookies = res.headers['set-cookie'];
    const adminCookieEntry = cookies.find((c) => c.startsWith('raj_admin_token='));
    expect(adminCookieEntry).toContain('raj_admin_token=;');
  });
});
