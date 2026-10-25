// A tiny in-browser stand-in for the Express backend, used ONLY when
// VITE_API_MODE=mock. It lets you see and click through the storefront before
// the real server exists. It speaks the same "API contract" the real server will,
// so no page code changes when you switch to VITE_API_MODE=real.
//
// NOT secure and NOT shared between browsers: never use it in production.
import legacy from '../data/legacyProducts';
import { ApiError } from './apiError';

const KEYS = {
  users: 'mock_users',
  session: 'mock_session',
  orders: 'mock_orders',
  sold: 'mock_sold',
};

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

// ---- Catalogue (built from the original data.js) --------------------------

const BADGE_MAP = {
  'Best Seller': 'Best Seller',
  'New Release': 'New Arrival',
  'Top Rated': 'Trending',
  'Limited Stock': 'Limited Edition',
  'Deal of the Day': 'Trending',
};

const baseCatalogue = legacy.map((p) => {
  const hasSizes = p.category === 'Fashion';
  const labels = ['S', 'M', 'L', 'XL'];
  const sizes = hasSizes
    ? labels.map((label, i) => ({
        label,
        stock: Math.floor(p.stock / labels.length) + (i === 0 ? p.stock % labels.length : 0),
      }))
    : [];
  return {
    _id: String(p.id),
    name: p.title,
    category: p.category,
    description: p.description,
    price: p.price,
    originalPrice: p.originalPrice,
    brand: p.brand,
    rating: p.rating,
    reviews: p.reviews,
    baseStock: p.stock,
    hasSizes,
    sizes,
    badges: p.badge ? [BADGE_MAP[p.badge] || 'Trending'] : [],
    // The demo only has one photo per product, so the other angles are
    // visual variations of it. Real products get four real photos.
    images: [
      { angle: 'front', url: p.image },
      { angle: 'back', url: `${p.image}&flip=h` },
      { angle: 'left', url: `${p.image}&sat=-100` },
      { angle: 'right', url: `${p.image}&bri=-30` },
    ],
  };
});

function withStock(p) {
  const sold = read(KEYS.sold, {});
  if (p.hasSizes) {
    const sizes = p.sizes.map((s) => ({
      label: s.label,
      stock: Math.max(0, s.stock - (sold[`${p._id}:${s.label}`] || 0)),
    }));
    return { ...p, sizes, stock: sizes.reduce((sum, s) => sum + s.stock, 0) };
  }
  return { ...p, sizes: [], stock: Math.max(0, p.baseStock - (sold[`${p._id}:`] || 0)) };
}

const catalogue = () => baseCatalogue.map(withStock);

function filterProducts(params = {}) {
  let list = catalogue();
  if (params.ids) {
    const ids = String(params.ids).split(',');
    list = list.filter((p) => ids.includes(p._id));
  }
  if (params.search) {
    const q = String(params.search).toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q)
    );
  }
  if (params.category) {
    const cats = String(params.category).split(',');
    list = list.filter((p) => cats.includes(p.category));
  }
  if (params.minPrice) list = list.filter((p) => p.price >= Number(params.minPrice));
  if (params.maxPrice) list = list.filter((p) => p.price <= Number(params.maxPrice));
  if (params.rating) list = list.filter((p) => p.rating >= Number(params.rating));
  if (params.sort === 'price-low') list.sort((a, b) => a.price - b.price);
  if (params.sort === 'price-high') list.sort((a, b) => b.price - a.price);
  if (params.sort === 'rating') list.sort((a, b) => b.rating - a.rating);
  if (params.limit) list = list.slice(0, Number(params.limit));
  return list;
}

const discountOf = (p) =>
  p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;

function homeSections() {
  const all = catalogue();
  return {
    deals: all.filter((p) => discountOf(p) > 20).slice(0, 8),
    bestSellers: all.filter((p) => p.badges.includes('Best Seller') || p.reviews > 10000).slice(0, 8),
    recommended: [...all].sort(() => 0.5 - Math.random()).slice(0, 8),
  };
}

// ---- Accounts -------------------------------------------------------------

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const publicUser = (u) => ({ _id: u._id, name: u.name, email: u.email });

function currentUser() {
  const id = read(KEYS.session, null);
  if (!id) return null;
  return read(KEYS.users, []).find((u) => u._id === id) || null;
}

function requireUser() {
  const user = currentUser();
  if (!user) throw new ApiError('Please sign in to continue.', 401);
  return user;
}

// ---- Orders ---------------------------------------------------------------

function createOrder(body) {
  const user = requireUser();
  const { items, shipping, paymentMethod } = body || {};
  if (!Array.isArray(items) || items.length === 0) throw new ApiError('Your cart is empty.', 400);
  if (paymentMethod !== 'Cash on Delivery') throw new ApiError('Only Cash on Delivery is available.', 400);

  const lines = items.map((item) => {
    const product = catalogue().find((p) => p._id === String(item.productId));
    if (!product) throw new ApiError('A product in your cart is no longer available.', 400);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) throw new ApiError('Invalid quantity.', 400);
    let available = product.stock;
    if (product.hasSizes) {
      const size = product.sizes.find((s) => s.label === item.size);
      if (!size) throw new ApiError(`Please choose a valid size for ${product.name}.`, 400);
      available = size.stock;
    }
    if (quantity > available) {
      throw new ApiError(`Only ${available} left of ${product.name}${item.size ? ` (size ${item.size})` : ''}.`, 409);
    }
    return {
      productId: product._id,
      name: product.name,
      image: product.images[0].url,
      size: product.hasSizes ? item.size : null,
      quantity,
      unitPrice: product.price,
    };
  });

  const sold = read(KEYS.sold, {});
  lines.forEach((l) => {
    const key = `${l.productId}:${l.size || ''}`;
    sold[key] = (sold[key] || 0) + l.quantity;
  });
  write(KEYS.sold, sold);

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const now = new Date().toISOString();
  const order = {
    _id: `mock-${Date.now()}`,
    userId: user._id,
    orderNumber: `RA${Date.now().toString().slice(-9)}`,
    createdAt: now,
    items: lines,
    shipping,
    paymentMethod,
    subtotal,
    deliveryFee: 0,
    total: subtotal,
    status: 'Order Placed',
    statusHistory: [{ status: 'Order Placed', note: '', at: now }],
  };
  write(KEYS.orders, [...read(KEYS.orders, []), order]);
  return order;
}

// ---- The router -----------------------------------------------------------

export async function mockRequest(method, path, { body, params } = {}) {
  await new Promise((r) => setTimeout(r, 120)); // feel like a network call

  if (path.startsWith('/admin')) {
    throw new ApiError('The admin panel needs the real backend. Set VITE_API_MODE=real once the server is running.', 501);
  }

  if (method === 'GET' && path === '/products') return { products: filterProducts(params) };
  if (method === 'GET' && path === '/products/home') return homeSections();
  if (method === 'GET' && path.startsWith('/products/')) {
    const id = decodeURIComponent(path.split('/')[2]);
    const product = catalogue().find((p) => p._id === id);
    if (!product) throw new ApiError('Product not found.', 404);
    return { product };
  }

  if (method === 'GET' && path === '/auth/me') {
    const user = currentUser();
    if (!user) throw new ApiError('Not signed in.', 401);
    return { user: publicUser(user) };
  }
  if (method === 'POST' && path === '/auth/register') {
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    if (!name || !email || password.length < 6) throw new ApiError('Enter your name, email and a password of at least 6 characters.', 400);
    const users = read(KEYS.users, []);
    if (users.some((u) => u.email === email)) throw new ApiError('An account with this email already exists. Please sign in.', 409);
    const user = { _id: `u${Date.now()}`, name, email, passwordHash: await sha256(password) };
    write(KEYS.users, [...users, user]);
    write(KEYS.session, user._id);
    return { user: publicUser(user) };
  }
  if (method === 'POST' && path === '/auth/login') {
    const email = String(body?.email || '').trim().toLowerCase();
    const user = read(KEYS.users, []).find((u) => u.email === email);
    if (!user || user.passwordHash !== (await sha256(String(body?.password || '')))) {
      throw new ApiError('Incorrect email or password.', 401);
    }
    write(KEYS.session, user._id);
    return { user: publicUser(user) };
  }
  if (method === 'POST' && path === '/auth/logout') {
    localStorage.removeItem(KEYS.session);
    return { ok: true };
  }

  if (method === 'POST' && path === '/orders') return { order: createOrder(body) };
  if (method === 'GET' && path === '/orders/mine') {
    const user = requireUser();
    const orders = read(KEYS.orders, []).filter((o) => o.userId === user._id).reverse();
    return { orders };
  }

  throw new ApiError('Not found.', 404);
}
