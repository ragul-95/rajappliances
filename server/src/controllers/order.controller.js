import { createOrder } from '../services/orderService.js';
import { Order } from '../models/Order.js';

export async function handleCreateOrder(req, res, next) {
  try {
    const { items, shipping, paymentMethod } = req.body;
    const order = await createOrder({
      user: req.user,
      items,
      shipping,
      paymentMethod,
    });

    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
}

export async function handleGetMyOrders(req, res, next) {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}
