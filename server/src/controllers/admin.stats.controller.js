import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';

export async function getAdminStats(req, res, next) {
  try {
    const [totalProducts, totalOrders, orderStatusCounts] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statusMap = {
      'Order Placed': 0,
      Processing: 0,
      Shipped: 0,
      'Out for Delivery': 0,
      Delivered: 0,
      Cancelled: 0,
    };

    orderStatusCounts.forEach((entry) => {
      if (entry._id && statusMap[entry._id] !== undefined) {
        statusMap[entry._id] = entry.count;
      }
    });

    res.json({
      totalProducts,
      totalOrders,
      placed: statusMap['Order Placed'],
      processing: statusMap['Processing'],
      shipped: statusMap['Shipped'],
      outForDelivery: statusMap['Out for Delivery'],
      delivered: statusMap['Delivered'],
      cancelled: statusMap['Cancelled'],
    });
  } catch (err) {
    next(err);
  }
}
