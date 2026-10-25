import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminService } from '../services';
import { ORDER_STATUSES } from '../constants';
import { formatCurrency, formatDateTime } from '../utils/format';
import StatusPill from './StatusPill';
import useTitle from '../hooks/useTitle';

export default function OrderList() {
  useTitle('Orders - Admin');
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    adminService
      .orders({ q: query, status })
      .then((list) => !cancelled && setOrders(list))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query, status]);

  const changeStatus = (value) => {
    const next = new URLSearchParams(params);
    if (value) next.set('status', value);
    else next.delete('status');
    setParams(next);
  };

  return (
    <>
      <h1 className="admin-title">Orders</h1>

      <div className="admin-card">
        <div className="admin-filters">
          <input
            type="search"
            placeholder="Search by order number, customer name or mobile"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={status} onChange={(e) => changeStatus(e.target.value)}>
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {error && <div className="form-alert">{error}</div>}

        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Placed</th>
                <th>Customer</th>
                <th>Mobile</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8"><div className="loading-block"><i className="fas fa-spinner fa-spin"></i></div></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan="8" className="text-muted" style={{ textAlign: 'center', padding: 30 }}>No orders found.</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o._id}>
                    <td><strong>{o.orderNumber}</strong></td>
                    <td>{formatDateTime(o.createdAt)}</td>
                    <td>{o.shipping.fullName}</td>
                    <td>{o.shipping.mobile}</td>
                    <td>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                    <td>{formatCurrency(o.total)}</td>
                    <td><StatusPill status={o.status} /></td>
                    <td className="row-actions">
                      <Link to={`/admin/orders/${o._id}`} className="btn btn-outline">View</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
