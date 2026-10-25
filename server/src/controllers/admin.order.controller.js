import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { AppError } from '../utils/AppError.js';
import { updateOrderStatus } from '../services/orderService.js';

export async function getAdminOrders(req, res, next) {
  try {
    const { q, status } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (q) {
      const query = String(q).trim();
      filter.$or = [
        { orderNumber: { $regex: query, $options: 'i' } },
        { 'shipping.fullName': { $regex: query, $options: 'i' } },
        { 'shipping.mobile': { $regex: query, $options: 'i' } },
      ];
    }

    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

export async function getAdminOrder(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Order not found.', 404));
    }

    const order = await Order.findById(id).populate('user', 'name email');
    if (!order) {
      return next(new AppError('Order not found.', 404));
    }

    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status) {
      return next(new AppError('Next status is required.', 400));
    }

    const order = await updateOrderStatus(id, status, note, req.admin.email);
    res.json({ order });
  } catch (err) {
    next(err);
  }
}
