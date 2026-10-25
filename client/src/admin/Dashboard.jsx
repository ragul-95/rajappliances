import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../services';
import useTitle from '../hooks/useTitle';

const CARDS = [
  { key: 'totalProducts', label: 'Total products', icon: 'fa-box', to: '/admin/products' },
  { key: 'totalOrders', label: 'Total orders', icon: 'fa-receipt', to: '/admin/orders' },
  { key: 'placed', label: 'Pending (Order Placed)', icon: 'fa-hourglass-half', to: '/admin/orders?status=Order Placed' },
  { key: 'processing', label: 'Processing', icon: 'fa-gears', to: '/admin/orders?status=Processing' },
  { key: 'shipped', label: 'Shipped', icon: 'fa-truck', to: '/admin/orders?status=Shipped' },
  { key: 'outForDelivery', label: 'Out for delivery', icon: 'fa-motorcycle', to: '/admin/orders?status=Out for Delivery' },
  { key: 'delivered', label: 'Delivered', icon: 'fa-circle-check', to: '/admin/orders?status=Delivered' },
  { key: 'cancelled', label: 'Cancelled', icon: 'fa-ban', to: '/admin/orders?status=Cancelled' },
];

export default function Dashboard() {
  useTitle('Dashboard - Admin');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    adminService
      .stats()
      .then((s) => !cancelled && setStats(s))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <h1 className="admin-title">Dashboard</h1>
      {error && <div className="form-alert">{error}</div>}
      {!stats && !error && (
        <div className="loading-block"><i className="fas fa-spinner fa-spin"></i></div>
      )}
      {stats && (
        <div className="stat-grid">
          {CARDS.map((c) => (
            <Link to={c.to} className="stat-card" key={c.key}>
              <i className={`fas ${c.icon}`}></i>
              <div className="stat-value">{stats[c.key] ?? 0}</div>
              <div className="stat-label">{c.label}</div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
