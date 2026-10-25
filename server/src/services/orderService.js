import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { AppError } from '../utils/AppError.js';
import { generateOrderNumber } from '../utils/orderNumber.js';
import { MAX_QTY_PER_LINE, STATUS_FLOW } from '../constants.js';

export async function rollbackStock(lines) {
  for (const line of lines) {
    try {
      const pId = line.productId || line.product;
      if (line.size) {
        await Product.updateOne(
          { _id: pId, 'sizes.label': line.size },
          {
            $inc: {
              'sizes.$.stock': line.quantity,
              stock: line.quantity,
            },
          }
        );
      } else {
        await Product.updateOne(
          { _id: pId },
          {
            $inc: { stock: line.quantity },
          }
        );
      }
    } catch (err) {
      console.error(`Failed to rollback stock for line ${line.productId}:`, err);
    }
  }
}

export async function createOrder({ user, items, shipping, paymentMethod }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Your cart is empty.', 400);
  }

  if (paymentMethod !== 'Cash on Delivery') {
    throw new AppError('Only Cash on Delivery is available.', 400);
  }

  // Validate shipping details
  if (!shipping || typeof shipping !== 'object') {
    throw new AppError('Shipping details are required.', 400);
  }

  const { fullName, mobile, line1, line2, city, state, pincode } = shipping;
  if (!fullName || fullName.trim().length < 2) {
    throw new AppError('Enter your full name.', 400, [{ field: 'fullName', message: 'Enter your full name.' }]);
  }
  if (!mobile || !/^[6-9]\d{9}$/.test(String(mobile).trim())) {
    throw new AppError('Enter a valid 10-digit mobile number.', 400, [{ field: 'mobile', message: 'Enter a valid 10-digit mobile number.' }]);
  }
  if (!line1 || !line1.trim()) {
    throw new AppError('Enter your flat, house no. or building.', 400, [{ field: 'line1', message: 'Enter your address.' }]);
  }
  if (!city || !city.trim()) {
    throw new AppError('Enter your city.', 400, [{ field: 'city', message: 'Enter your city.' }]);
  }
  if (!state || !state.trim()) {
    throw new AppError('Choose a state.', 400, [{ field: 'state', message: 'Choose a state.' }]);
  }
  if (!pincode || !/^[1-9]\d{5}$/.test(String(pincode).trim())) {
    throw new AppError('Enter a valid 6-digit pincode.', 400, [{ field: 'pincode', message: 'Enter a valid 6-digit pincode.' }]);
  }

  // Merge duplicate (productId, size) lines
  const mergedMap = new Map();
  for (const item of items) {
    const pId = String(item.productId);
    const size = item.size ? String(item.size).trim() : null;
    const key = `${pId}:::${size || ''}`;
    const qty = Number(item.quantity);

    if (!Number.isInteger(qty) || qty < 1) {
      throw new AppError('Invalid quantity.', 400);
    }

    if (mergedMap.has(key)) {
      mergedMap.get(key).quantity += qty;
    } else {
      mergedMap.set(key, { productId: pId, size, quantity: qty });
    }
  }

  const mergedLines = Array.from(mergedMap.values());
  for (const line of mergedLines) {
    if (line.quantity > MAX_QTY_PER_LINE) {
      throw new AppError(`Quantity cannot exceed ${MAX_QTY_PER_LINE} units per item.`, 400);
    }
  }

  // Load each product from DB to verify and get official prices
  const productDocs = new Map();
  for (const line of mergedLines) {
    if (!mongoose.Types.ObjectId.isValid(line.productId)) {
      throw new AppError('A product in your cart is no longer available.', 400);
    }

    const product = await Product.findById(line.productId);
    if (!product) {
      throw new AppError('A product in your cart is no longer available.', 400);
    }

    if (product.hasSizes) {
      if (!line.size) {
        throw new AppError(`Please choose a valid size for ${product.name}.`, 400);
      }
      const sizeEntry = product.sizes.find((s) => s.label === line.size);
      if (!sizeEntry) {
        throw new AppError(`Please choose a valid size for ${product.name}.`, 400);
      }
    } else {
      line.size = null;
    }

    productDocs.set(line.productId, product);
  }

  // Calculate subtotal from DB prices
  let subtotal = 0;
  for (const line of mergedLines) {
    const product = productDocs.get(line.productId);
    subtotal += product.price * line.quantity;
  }
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  // Reserve stock with atomic conditional update per line
  const reservedLines = [];

  for (const line of mergedLines) {
    const product = productDocs.get(line.productId);
    let updateResult;

    if (product.hasSizes) {
      updateResult = await Product.updateOne(
        {
          _id: product._id,
          sizes: { $elemMatch: { label: line.size, stock: { $gte: line.quantity } } },
        },
        {
          $inc: {
            'sizes.$.stock': -line.quantity,
            stock: -line.quantity,
          },
        }
      );
    } else {
      updateResult = await Product.updateOne(
        {
          _id: product._id,
          stock: { $gte: line.quantity },
        },
        {
          $inc: { stock: -line.quantity },
        }
      );
    }

    if (updateResult.modifiedCount === 0) {
      // Line out of stock! Roll back all previously reserved lines
      await rollbackStock(reservedLines);

      const freshProduct = await Product.findById(product._id);
      let available = freshProduct ? freshProduct.stock : 0;
      if (freshProduct?.hasSizes) {
        const s = freshProduct.sizes.find((sz) => sz.label === line.size);
        available = s ? s.stock : 0;
      }

      const itemDesc = `${product.name}${line.size ? ` (size ${line.size})` : ''}`;
      if (available <= 0) {
        throw new AppError(`${itemDesc} is out of stock.`, 409);
      }
      throw new AppError(`Only ${available} left of ${itemDesc}.`, 409);
    }

    reservedLines.push(line);
  }

  // Build order item snapshots
  const snapshots = mergedLines.map((line) => {
    const product = productDocs.get(line.productId);
    const frontImg = product.images.find((i) => i.angle === 'front') || product.images[0];
    return {
      productId: product._id,
      name: product.name,
      image: frontImg ? frontImg.url : '',
      size: line.size,
      quantity: line.quantity,
      unitPrice: product.price,
    };
  });

  const orderNumber = await generateOrderNumber();
  const now = new Date();

  try {
    const order = await Order.create({
      orderNumber,
      user: user._id,
      items: snapshots,
      shipping: {
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        line1: line1.trim(),
        line2: (line2 || '').trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
      },
      paymentMethod: 'Cash on Delivery',
      subtotal,
      deliveryFee,
      total,
      status: 'Order Placed',
      statusHistory: [
        {
          status: 'Order Placed',
          note: 'Order placed by customer',
          at: now,
          by: user.email || 'customer',
        },
      ],
      stockRestored: false,
    });

    return order;
  } catch (err) {
    // If order creation fails, roll back the stock
    await rollbackStock(reservedLines);
    throw err;
  }
}

export async function updateOrderStatus(orderId, nextStatus, note = '', adminEmail = 'admin') {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError('Order not found.', 404);
  }

  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found.', 404);
  }

  const allowedNext = STATUS_FLOW[order.status] || [];
  if (!allowedNext.includes(nextStatus)) {
    throw new AppError(
      `Cannot transition order status from '${order.status}' to '${nextStatus}'.`,
      400
    );
  }

  // If moving to Cancelled, atomically restore stock exactly once
  if (nextStatus === 'Cancelled') {
    const guarded = await Order.findOneAndUpdate(
      { _id: orderId, stockRestored: false },
      { $set: { stockRestored: true } }
    );
    if (guarded) {
      await rollbackStock(order.items);
      order.stockRestored = true;
    }
  }

  order.status = nextStatus;
  order.statusHistory.push({
    status: nextStatus,
    note: note || '',
    at: new Date(),
    by: adminEmail,
  });

  await order.save();
  return order;
}

export default {
  createOrder,
  updateOrderStatus,
  rollbackStock,
};
