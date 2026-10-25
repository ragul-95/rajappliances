import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Admin } from '../src/models/Admin.js';
import { User } from '../src/models/User.js';
import { Product } from '../src/models/Product.js';
import { Order } from '../src/models/Order.js';

let csrfToken;
let csrfCookie;
let adminCookie;
let testAdmin;
let testCustomer;
let customerCookie;

const dummyShipping = {
  fullName: 'Vikram Seth',
  mobile: '9876501234',
  line1: '45 Lake View Road',
  line2: 'Koramangala',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560034',
};

beforeAll(async () => {
  await connectDB();

  // Obtain CSRF token
  const csrfRes = await request(app).get('/api/csrf-token');
  csrfToken = csrfRes.body.csrfToken;
  csrfCookie = csrfRes.headers['set-cookie'];

  // Setup Test Admin
  const adminEmail = `stageE_admin_${Date.now()}@rajappliences.com`;
  const adminHash = await bcrypt.hash('AdminSecret2026!', 12);
  testAdmin = await Admin.create({ name: 'StageE Admin', email: adminEmail, passwordHash: adminHash });
  const adminLoginRes = await request(app)
    .post('/api/admin/auth/login')
    .set('Cookie', csrfCookie)
    .set('X-CSRF-Token', csrfToken)
    .send({ email: adminEmail, password: 'AdminSecret2026!' });
  adminCookie = adminLoginRes.headers['set-cookie'].find((c) => c.startsWith('raj_admin_token='));

  // Setup Test Customer
  const custEmail = `stageE_cust_${Date.now()}@rajappliences.com`;
  const custHash = await bcrypt.hash('CustPass123!', 12);
  testCustomer = await User.create({ name: 'Vikram Customer', email: custEmail, passwordHash: custHash });
  const custLoginRes = await request(app)
    .post('/api/auth/login')
    .set('Cookie', csrfCookie)
    .set('X-CSRF-Token', csrfToken)
    .send({ email: custEmail, password: 'CustPass123!' });
  customerCookie = custLoginRes.headers['set-cookie'].find((c) => c.startsWith('raj_user_token='));
});

afterAll(async () => {
  if (testAdmin?._id) await Admin.deleteOne({ _id: testAdmin._id });
  if (testCustomer?._id) await User.deleteOne({ _id: testCustomer._id });
  await disconnectDB();
});

describe('Stage E: Admin Dashboard and Order Management', () => {
  it('GET /api/admin/stats returns correct counts matching dashboard schema', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', [csrfCookie[0], adminCookie]);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalProducts');
    expect(res.body).toHaveProperty('totalOrders');
    expect(res.body).toHaveProperty('placed');
    expect(res.body).toHaveProperty('processing');
    expect(res.body).toHaveProperty('shipped');
    expect(res.body).toHaveProperty('outForDelivery');
    expect(res.body).toHaveProperty('delivered');
    expect(res.body).toHaveProperty('cancelled');

    expect(typeof res.body.totalProducts).toBe('number');
    expect(typeof res.body.totalOrders).toBe('number');
  });

  let createdOrder;
  let testProduct;

  it('Creates a test order for status transition testing', async () => {
    testProduct = await Product.create({
      name: 'Stage E Transition Test Item',
      category: 'Electronics',
      description: 'Used for testing status workflow transitions.',
      price: 3500,
      stock: 10,
      hasSizes: false,
      images: [{ angle: 'front', url: 'https://example.com/test.jpg' }],
    });

    const orderRes = await request(app)
      .post('/api/orders')
      .set('Cookie', [csrfCookie[0], customerCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({
        items: [{ productId: testProduct._id.toString(), quantity: 2 }],
        shipping: dummyShipping,
        paymentMethod: 'Cash on Delivery',
      });

    expect(orderRes.status).toBe(201);
    createdOrder = orderRes.body.order;
    expect(createdOrder.status).toBe('Order Placed');

    // Product stock should now be 8
    const checkProduct = await Product.findById(testProduct._id);
    expect(checkProduct.stock).toBe(8);
  });

  it('GET /api/admin/orders lists orders and filters by q and status', async () => {
    // List all
    const allRes = await request(app)
      .get('/api/admin/orders')
      .set('Cookie', [csrfCookie[0], adminCookie]);
    expect(allRes.status).toBe(200);
    expect(Array.isArray(allRes.body.orders)).toBe(true);

    // Filter by order number query q
    const qRes = await request(app)
      .get(`/api/admin/orders?q=${encodeURIComponent(createdOrder.orderNumber)}`)
      .set('Cookie', [csrfCookie[0], adminCookie]);
    expect(qRes.status).toBe(200);
    expect(qRes.body.orders.length).toBeGreaterThanOrEqual(1);
    expect(qRes.body.orders[0].orderNumber).toBe(createdOrder.orderNumber);

    // Filter by customer name query q
    const nameRes = await request(app)
      .get(`/api/admin/orders?q=${encodeURIComponent('Vikram Seth')}`)
      .set('Cookie', [csrfCookie[0], adminCookie]);
    expect(nameRes.status).toBe(200);
    expect(nameRes.body.orders.length).toBeGreaterThanOrEqual(1);

    // Filter by status
    const statusRes = await request(app)
      .get('/api/admin/orders?status=Order Placed')
      .set('Cookie', [csrfCookie[0], adminCookie]);
    expect(statusRes.status).toBe(200);
    statusRes.body.orders.forEach((o) => {
      expect(o.status).toBe('Order Placed');
    });
  });

  it('GET /api/admin/orders/:id returns order details with customer email and name', async () => {
    const res = await request(app)
      .get(`/api/admin/orders/${createdOrder._id}`)
      .set('Cookie', [csrfCookie[0], adminCookie]);

    expect(res.status).toBe(200);
    expect(res.body.order).toBeDefined();
    expect(res.body.order._id).toBe(createdOrder._id);
    expect(res.body.order.user).toBeDefined();
    expect(res.body.order.user.name).toBe('Vikram Customer');
    expect(res.body.order.user.email).toBe(testCustomer.email);
  });

  it('Rejects invalid status transitions (skipping forward, going backward, invalid cancels)', async () => {
    // 1. Cannot skip forward: 'Order Placed' -> 'Shipped' (must go through Processing)
    const skipRes = await request(app)
      .patch(`/api/admin/orders/${createdOrder._id}/status`)
      .set('Cookie', [csrfCookie[0], adminCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'Shipped', note: 'Attempting invalid forward skip' });
    expect(skipRes.status).toBe(400);
    expect(skipRes.body.message).toContain('Cannot transition order status');

    // 2. Valid move: 'Order Placed' -> 'Processing'
    const procRes = await request(app)
      .patch(`/api/admin/orders/${createdOrder._id}/status`)
      .set('Cookie', [csrfCookie[0], adminCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'Processing', note: 'Packing goods' });
    expect(procRes.status).toBe(200);
    expect(procRes.body.order.status).toBe('Processing');

    // 3. Cannot go backward: 'Processing' -> 'Order Placed'
    const backRes = await request(app)
      .patch(`/api/admin/orders/${createdOrder._id}/status`)
      .set('Cookie', [csrfCookie[0], adminCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'Order Placed' });
    expect(backRes.status).toBe(400);

    // 4. Valid move: 'Processing' -> 'Shipped'
    const shipRes = await request(app)
      .patch(`/api/admin/orders/${createdOrder._id}/status`)
      .set('Cookie', [csrfCookie[0], adminCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'Shipped', note: 'Handed to courier' });
    expect(shipRes.status).toBe(200);
    expect(shipRes.body.order.status).toBe('Shipped');

    // 5. Cannot cancel from 'Shipped' (cancel only allowed from Placed or Processing)
    const cancelShippedRes = await request(app)
      .patch(`/api/admin/orders/${createdOrder._id}/status`)
      .set('Cookie', [csrfCookie[0], adminCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'Cancelled', note: 'Attempt cancel after shipping' });
    expect(cancelShippedRes.status).toBe(400);

    // 6. Valid move: 'Shipped' -> 'Out for Delivery' -> 'Delivered'
    const ofdRes = await request(app)
      .patch(`/api/admin/orders/${createdOrder._id}/status`)
      .set('Cookie', [csrfCookie[0], adminCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'Out for Delivery' });
    expect(ofdRes.status).toBe(200);

    const delRes = await request(app)
      .patch(`/api/admin/orders/${createdOrder._id}/status`)
      .set('Cookie', [csrfCookie[0], adminCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'Delivered', note: 'Delivered and cash collected' });
    expect(delRes.status).toBe(200);
    expect(delRes.body.order.status).toBe('Delivered');

    // 7. Delivered is terminal: cannot move to any other status
    const postDelRes = await request(app)
      .patch(`/api/admin/orders/${createdOrder._id}/status`)
      .set('Cookie', [csrfCookie[0], adminCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'Cancelled' });
    expect(postDelRes.status).toBe(400);
  });

  it('Cancel restores stock exactly ONCE (guarded with stockRestored flag)', async () => {
    // Create new order to test cancellation
    const cancelOrderRes = await request(app)
      .post('/api/orders')
      .set('Cookie', [csrfCookie[0], customerCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({
        items: [{ productId: testProduct._id.toString(), quantity: 3 }],
        shipping: dummyShipping,
        paymentMethod: 'Cash on Delivery',
      });
    expect(cancelOrderRes.status).toBe(201);
    const orderToCancel = cancelOrderRes.body.order;

    // Stock before cancel: 8 - 3 = 5
    let prod = await Product.findById(testProduct._id);
    expect(prod.stock).toBe(5);

    // Cancel order from 'Order Placed'
    const cancelRes = await request(app)
      .patch(`/api/admin/orders/${orderToCancel._id}/status`)
      .set('Cookie', [csrfCookie[0], adminCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'Cancelled', note: 'Customer requested cancellation' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.order.status).toBe('Cancelled');
    expect(cancelRes.body.order.stockRestored).toBe(true);

    // Stock restored by +3 back to 8
    prod = await Product.findById(testProduct._id);
    expect(prod.stock).toBe(8);

    // Attempting to transition or cancel again is rejected with 400
    const cancelAgainRes = await request(app)
      .patch(`/api/admin/orders/${orderToCancel._id}/status`)
      .set('Cookie', [csrfCookie[0], adminCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'Cancelled' });
    expect(cancelAgainRes.status).toBe(400);

    // Verify stock was NOT restored a second time
    prod = await Product.findById(testProduct._id);
    expect(prod.stock).toBe(8);

    // Clean up
    await Product.deleteOne({ _id: testProduct._id });
    await Order.deleteMany({ _id: { $in: [createdOrder._id, orderToCancel._id] } });
  });
});
