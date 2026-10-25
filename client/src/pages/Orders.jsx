import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../services';
import { TIMELINE_STEPS } from '../constants';
import { formatCurrency, formatDate, formatDateTime } from '../utils/format';
import useTitle from '../hooks/useTitle';

function Timeline({ order }) {
  if (order.status === 'Cancelled') {
    const entry = [...order.statusHistory].reverse().find((h) => h.status === 'Cancelled');
    return (
      <div className="order-cancelled">
        <i className="fas fa-times-circle"></i> Cancelled{entry ? ` on ${formatDateTime(entry.at)}` : ''}
      </div>
    );
  }
  const reached = TIMELINE_STEPS.indexOf(order.status);
  return (
    <ol className="status-timeline" aria-label="Order progress">
      {TIMELINE_STEPS.map((step, i) => {
        const entry = order.statusHistory.find((h) => h.status === step);
        const cls = i < reached ? 'done' : i === reached ? 'current' : '';
        return (
          <li key={step} className={cls}>
            <span className="dot"></span>
            <span className="label">{step}</span>
            {entry && <span className="when">{formatDateTime(entry.at)}</span>}
          </li>
        );
      })}
    </ol>
  );
}

export default function Orders() {
  useTitle('Your Orders - RajAppliences');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    orderService
      .mine()
      .then((list) => !cancelled && setOrders(list))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="orders-page">
      <h1 style={{ marginBottom: 20, fontWeight: 400, fontSize: 28 }}>Your Orders</h1>

      <div id="orders-container">
        {loading ? (
          <div className="loading-block"><i className="fas fa-spinner fa-spin"></i></div>
        ) : error ? (
          <div className="empty-state">
            <i className="fas fa-exclamation-circle"></i>
            <h2>We couldn't load your orders</h2>
            <p>{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-box-open"></i>
            <h2>You have no orders yet</h2>
            <Link to="/" className="btn btn-primary" style={{ marginTop: 15 }}>
              Start Shopping
            </Link>
          </div>
        ) : (
          orders.map((order) => (
            <div className="order-card" key={order._id}>
              <div className="order-header">
                <div className="order-header-info">
                  <div>
                    <span>Order Placed</span>
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                  <div>
                    <span>Total</span>
                    <span>{formatCurrency(order.total)}</span>
                  </div>
                  <div>
                    <span>Ship To</span>
                    <span>{order.shipping.fullName}</span>
                  </div>
                </div>
                <div>
                  <span>Order # {order.orderNumber}</span>
                </div>
              </div>
              <div className="order-body">
                <div className="order-status">{order.status}</div>
                <Timeline order={order} />
                <div className="order-item-list">
                  {order.items.map((item, i) => (
                    <div className="order-item" key={`${item.productId}-${item.size || ''}-${i}`}>
                      <img src={item.image} alt={item.name} />
                      <div className="order-item-details">
                        <Link to={`/product/${item.productId}`}>{item.name}</Link>
                        {item.size && <p className="text-muted">Size: {item.size}</p>}
                        <p className="text-muted">
                          Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                        </p>
                        <p className="text-muted">Payment: {order.paymentMethod}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
