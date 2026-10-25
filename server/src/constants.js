export const STORE_NAME = 'RajAppliences';

export const CATEGORIES = [
  'Electronics',
  'Mobiles',
  'Laptops',
  'Fashion',
  'Home & Kitchen',
  'Books',
  'Beauty',
  'Sports',
];

export const BADGES = [
  'Best Seller',
  "Raj's Choice",
  'New Arrival',
  'Trending',
  'Limited Edition',
];

export const ORDER_STATUSES = [
  'Order Placed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

export const STATUS_FLOW = {
  'Order Placed': ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Out for Delivery'],
  'Out for Delivery': ['Delivered'],
  Delivered: [],
  Cancelled: [],
};

export const IMAGE_ANGLES = ['front', 'back', 'left', 'right'];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_QTY_PER_LINE = 10;
