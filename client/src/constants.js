// Single place for lists the UI uses. Easy to extend.

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

// To add a badge: add its name here (the server will get the same list in Stage 2).
export const BADGES = [
  'Best Seller',
  "Raj's Choice",
  'New Arrival',
  'Trending',
  'Limited Edition',
];

export const SIZE_PRESETS = {
  Clothing: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  Footwear: ['6', '7', '8', '9', '10', '11', '12'],
};

export const ORDER_STATUSES = [
  'Order Placed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

// Steps shown on the customer timeline (Cancelled is shown separately).
export const TIMELINE_STEPS = [
  'Order Placed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
];

// Which statuses an order may move to next. The server enforces the same rules.
export const STATUS_FLOW = {
  'Order Placed': ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Out for Delivery'],
  'Out for Delivery': ['Delivered'],
  Delivered: [],
  Cancelled: [],
};

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export const IMAGE_ANGLES = [
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
  { key: 'left', label: 'Left side' },
  { key: 'right', label: 'Right side' },
];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_QTY_PER_LINE = 10;
