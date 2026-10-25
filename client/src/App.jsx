import { Outlet, Route, Routes } from 'react-router-dom';
import StoreLayout from './components/StoreLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { AdminAuthProvider } from './context/AdminAuthContext';

import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import Orders from './pages/Orders';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

import AdminRoute from './admin/AdminRoute';
import AdminLayout from './admin/AdminLayout';
import AdminLogin from './admin/AdminLogin';
import Dashboard from './admin/Dashboard';
import ProductList from './admin/ProductList';
import ProductForm from './admin/ProductForm';
import OrderList from './admin/OrderList';
import OrderDetail from './admin/OrderDetail';

// The admin session is only looked up when someone opens an /admin page.
function AdminProviders() {
  return (
    <AdminAuthProvider>
      <Outlet />
    </AdminAuthProvider>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Storefront pages: header + footer */}
      <Route element={<StoreLayout />}>
        <Route index element={<Home />} />
        <Route path="products" element={<Products />} />
        <Route path="product/:id" element={<ProductDetail />} />
        <Route path="cart" element={<Cart />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route
          path="orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Pages with their own layout (same as the original login/checkout pages) */}
      <Route path="login" element={<Login />} />
      <Route
        path="checkout"
        element={
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        }
      />

      {/* Admin */}
      <Route path="admin" element={<AdminProviders />}>
        <Route path="login" element={<AdminLogin />} />
        <Route
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id/edit" element={<ProductForm />} />
          <Route path="orders" element={<OrderList />} />
          <Route path="orders/:id" element={<OrderDetail />} />
        </Route>
      </Route>
    </Routes>
  );
}
