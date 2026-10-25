import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Product } from '../src/models/Product.js';
import { User } from '../src/models/User.js';
import { Order } from '../src/models/Order.js';

let csrfToken;
let csrfCookie;
let customer1;
let customer1Cookie;
let customer2;
let customer2Cookie;

const dummyShipping = {
  fullName: 'Arun Kumar',
  mobile: '9876543210',
  line1: '123 Anna Salai',
  line2: 'T Nagar',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600017',
};

beforeAll(async () => {
  await connectDB();

  // Obtain CSRF token
  const csrfRes = await request(app).get('/api/csrf-token');
  csrfToken = csrfRes.body.csrfToken;
  csrfCookie = csrfRes.headers['set-cookie'];

  // Setup Customer 1
  const email1 = `stageD_cust1_${Date.now()}@rajappliences.com`;
  const hash = await bcrypt.hash('CustPass123!', 12);
  customer1 = await User.create({ name: 'Customer One', email: email1, passwordHash: hash });
  const login1Res = await request(app)
    .post('/api/auth/login')
    .set('Cookie', csrfCookie)
    .set('X-CSRF-Token', csrfToken)
    .send({ email: email1, password: 'CustPass123!' });
  customer1Cookie = login1Res.headers['set-cookie'].find((c) => c.startsWith('raj_user_token='));

  // Setup Customer 2
  const email2 = `stageD_cust2_${Date.now()}@rajappliences.com`;
  customer2 = await User.create({ name: 'Customer Two', email: email2, passwordHash: hash });
  const login2Res = await request(app)
    .post('/api/auth/login')
    .set('Cookie', csrfCookie)
    .set('X-CSRF-Token', csrfToken)
    .send({ email: email2, password: 'CustPass123!' });
  customer2Cookie = login2Res.headers['set-cookie'].find((c) => c.startsWith('raj_user_token='));
});

afterAll(async () => {
  if (customer1?._id) await User.deleteOne({ _id: customer1._id });
  if (customer2?._id) await User.deleteOne({ _id: customer2._id });
  await disconnectDB();
});

describe('Stage D: Orders and Stock Management', () => {
  it('Creates order with DB-computed pricing, free delivery, COD and merges duplicates', async () => {
    // Create test product
    const product = await Product.create({
      name: 'Stage D Sized Shirt',
      category: 'Fashion',
      description: 'A stylish test shirt with multiple sizes.',
      price: 1200,
      hasSizes: true,
      sizes: [
        { label: 'M', stock: 10 },
        { label: 'L', stock: 10 },
      ],
      stock: 20,
      images: [{ angle: 'front', url: 'https://example.com/shirt.jpg' }],
    });

    // Send order with duplicate line for size 'M' and client price tampering attempt
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', [csrfCookie[0], customer1Cookie])
      .set('X-CSRF-Token', csrfToken)
      .send({
        items: [
          { productId: product._id.toString(), size: 'M', quantity: 2, unitPrice: 10 }, // fake price 10
          { productId: product._id.toString(), size: 'M', quantity: 1, unitPrice: 5 },  // fake price 5
        ],
        shipping: dummyShipping,
        paymentMethod: 'Cash on Delivery',
      });

    expect(res.status).toBe(201);
    expect(res.body.order).toBeDefined();

    const order = res.body.order;
    expect(order.orderNumber).toMatch(/^RA-\d{4}-\d{6}$/);
    expect(order.items.length).toBe(1); // merged into 1 line
    expect(order.items[0].quantity).toBe(3);
    expect(order.items[0].unitPrice).toBe(1200); // real DB price
    expect(order.subtotal).toBe(3600); // 3 * 1200
    expect(order.deliveryFee).toBe(0);
    expect(order.total).toBe(3600);
    expect(order.paymentMethod).toBe('Cash on Delivery');
    expect(order.status).toBe('Order Placed');

    // Verify stock decremented in DB
    const updatedProduct = await Product.findById(product._id);
    const mSize = updatedProduct.sizes.find((s) => s.label === 'M');
    expect(mSize.stock).toBe(7); // 10 - 3
    expect(updatedProduct.stock).toBe(17); // 20 - 3

    // Clean up
    await Product.deleteOne({ _id: product._id });
    await Order.deleteOne({ _id: order._id });
  });

  it('Rolls back reserved stock when a subsequent line in the order is out of stock', async () => {
    // Product 1: In stock (5 units)
    const productInStock = await Product.create({
      name: 'Stage D In Stock Product',
      category: 'Electronics',
      description: 'Product that is available in stock.',
      price: 1000,
      stock: 5,
      hasSizes: false,
      images: [{ angle: 'front', url: 'https://example.com/item1.jpg' }],
    });

    // Product 2: Out of stock (0 units)
    const productOutOfStock = await Product.create({
      name: 'Stage D Out of Stock Product',
      category: 'Electronics',
      description: 'Product that is out of stock.',
      price: 2000,
      stock: 0,
      hasSizes: false,
      images: [{ angle: 'front', url: 'https://example.com/item2.jpg' }],
    });

    // Attempt to order 2 units of item 1 and 1 unit of item 2
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', [csrfCookie[0], customer1Cookie])
      .set('X-CSRF-Token', csrfToken)
      .send({
        items: [
          { productId: productInStock._id.toString(), quantity: 2 },
          { productId: productOutOfStock._id.toString(), quantity: 1 },
        ],
        shipping: dummyShipping,
        paymentMethod: 'Cash on Delivery',
      });

    // Should fail with 409 naming the out-of-stock item
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Stage D Out of Stock Product');

    // Verify Product 1 stock was rolled back to original 5
    const checkProduct1 = await Product.findById(productInStock._id);
    expect(checkProduct1.stock).toBe(5);

    // Clean up
    await Product.deleteMany({ _id: { $in: [productInStock._id, productOutOfStock._id] } });
  });

  it('Concurrent race condition: two customers buying the last unit -> exactly ONE succeeds', async () => {
    // Create product with exactly 1 unit left
    const lastUnitProduct = await Product.create({
      name: 'Stage D Exclusive Last Unit Item',
      category: 'Electronics',
      description: 'Only 1 unit in stock. High concurrency contest item.',
      price: 15000,
      stock: 1,
      hasSizes: false,
      images: [{ angle: 'front', url: 'https://example.com/last.jpg' }],
    });

    // Fire two order requests simultaneously
    const req1 = request(app)
      .post('/api/orders')
      .set('Cookie', [csrfCookie[0], customer1Cookie])
      .set('X-CSRF-Token', csrfToken)
      .send({
        items: [{ productId: lastUnitProduct._id.toString(), quantity: 1 }],
        shipping: dummyShipping,
        paymentMethod: 'Cash on Delivery',
      });

    const req2 = request(app)
      .post('/api/orders')
      .set('Cookie', [csrfCookie[0], customer2Cookie])
      .set('X-CSRF-Token', csrfToken)
      .send({
        items: [{ productId: lastUnitProduct._id.toString(), quantity: 1 }],
        shipping: dummyShipping,
        paymentMethod: 'Cash on Delivery',
      });

    const [res1, res2] = await Promise.all([req1, req2]);

    const statuses = [res1.status, res2.status].sort();
    // Exactly one 201 (success) and one 409 (out of stock conflict)
    expect(statuses).toEqual([201, 409]);

    // Verify final stock is exactly 0 (never negative)
    const finalProduct = await Product.findById(lastUnitProduct._id);
    expect(finalProduct.stock).toBe(0);

    // Clean up
    await Product.deleteOne({ _id: lastUnitProduct._id });
  });

  it('GET /api/orders/mine returns only the logged-in customer’s orders, newest first', async () => {
    const res1 = await request(app)
      .get('/api/orders/mine')
      .set('Cookie', [csrfCookie[0], customer1Cookie]);

    expect(res1.status).toBe(200);
    expect(Array.isArray(res1.body.orders)).toBe(true);

    // Ensure all returned orders belong to customer 1
    res1.body.orders.forEach((o) => {
      expect(o.user.toString()).toBe(customer1._id.toString());
    });

    // Check chronological order (newest first)
    const dates = res1.body.orders.map((o) => new Date(o.createdAt).getTime());
    for (let i = 0; i < dates.length - 1; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
    }
  });
});
