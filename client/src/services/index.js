// Every call the frontend makes to the backend lives here.
// Pages never call fetch() directly.
import { api } from './api';

export const productService = {
  list: (params) => api.get('/products', { params }).then((d) => d.products),
  byIds: (ids) =>
    ids.length ? api.get('/products', { params: { ids: ids.join(',') } }).then((d) => d.products) : Promise.resolve([]),
  home: () => api.get('/products/home'),
  get: (id) => api.get(`/products/${encodeURIComponent(id)}`).then((d) => d.product),
};

export const authService = {
  me: () => api.get('/auth/me').then((d) => d.user),
  register: (payload) => api.post('/auth/register', payload).then((d) => d.user),
  login: (payload) => api.post('/auth/login', payload).then((d) => d.user),
  logout: () => api.post('/auth/logout', {}),
};

export const orderService = {
  create: (payload) => api.post('/orders', payload).then((d) => d.order),
  mine: () => api.get('/orders/mine').then((d) => d.orders),
};

export const adminService = {
  me: () => api.get('/admin/auth/me').then((d) => d.admin),
  login: (payload) => api.post('/admin/auth/login', payload).then((d) => d.admin),
  logout: () => api.post('/admin/auth/logout', {}),
  stats: () => api.get('/admin/stats'),

  products: (params) => api.get('/admin/products', { params }).then((d) => d.products),
  product: (id) => api.get(`/admin/products/${id}`).then((d) => d.product),
  createProduct: (form) => api.postForm('/admin/products', form).then((d) => d.product),
  updateProduct: (id, form) => api.putForm(`/admin/products/${id}`, form).then((d) => d.product),
  deleteProduct: (id) => api.del(`/admin/products/${id}`),

  orders: (params) => api.get('/admin/orders', { params }).then((d) => d.orders),
  order: (id) => api.get(`/admin/orders/${id}`).then((d) => d.order),
  updateOrderStatus: (id, payload) => api.patch(`/admin/orders/${id}/status`, payload).then((d) => d.order),
};
