import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminService } from '../services';
import { useToast } from '../context/ToastContext';
import { STATUS_FLOW } from '../constants';
import { formatCurrency, formatDateTime } from '../utils/format';
import StatusPill from './StatusPill';
import ConfirmDialog from './ConfirmDialog';
import useTitle from '../hooks/useTitle';

export default function OrderDetail() {
  const { id } = useParams();
  const { showToast } = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [nextStatus, setNextStatus] = useState('');
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  useTitle(order ? `Order ${order.orderNumber} - Admin` : 'Order - Admin');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminService
      .order(id)
      .then((o) => !cancelled && setOrder(o))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <div className="loading-block"><i className="fas fa-spinner fa-spin"></i></div>;
  if (error || !order) {
    return (
      <div className="admin-card">
        <div className="form-alert">{error || 'Order not found.'}</div>
        <Link to="/admin/orders" className="btn btn-outline">Back to orders</Link>
      </div>
    );
  }

  const allowed = STATUS_FLOW[order.status] || [];
  const isCancel = nextStatus === 'Cancelled';
  const a = order.shipping;

  const apply = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await adminService.updateOrderStatus(order._id, { status: nextStatus, note: note.trim() });
      setOrder(updated);
      setNextStatus('');
      setNote('');
      setConfirming(false);
      showToast(`Order marked as ${updated.status}`);
    } catch (err) {
      showToast(err.message, 'error');
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="admin-title-row">
        <h1 className="admin-title">Order {order.orderNumber}</h1>
        <Link to="/admin/orders" className="btn btn-outline">← All orders</Link>
      </div>

      <div className="detail-grid">
        <div className="admin-card">
          <h2 className="admin-h2">Customer and delivery</h2>
          <p><strong>{a.fullName}</strong></p>
          <p>Mobile: {a.mobile}</p>
          <address>
            {a.line1}<br />
            {a.line2}<br />
            {a.city}, {a.state} - {a.pincode}
          </address>
          <p className="text-muted">Placed on {formatDateTime(order.createdAt)}</p>
          <p className="text-muted">Payment: {order.paymentMethod}</p>
        </div>

        <div className="admin-card">
          <h2 className="admin-h2">Status</h2>
          <p>Current status: <StatusPill status={order.status} /></p>
          {allowed.length === 0 ? (
            <p className="text-muted">This order is {order.status.toLowerCase()} and can't be changed.</p>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="next-status">Move to</label>
                <select id="next-status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
                  <option value="">Choose the next status</option>
                  {allowed.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="status-note">Note <span className="text-muted">optional, saved in the history</span></label>
                <input id="status-note" type="text" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <button className={`btn ${isCancel ? 'btn-danger' : 'btn-primary'}`} disabled={!nextStatus} onClick={() => setConfirming(true)}>
                Update status
              </button>
            </>
          )}
        </div>
      </div>

      <div className="admin-card">
        <h2 className="admin-h2">Items</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Image</th><th>Product</th><th>Size</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr>
            </thead>
            <tbody>
              {order.items.map((i, idx) => (
                <tr key={idx}>
                  <td><img className="thumb" src={i.image} alt="" /></td>
                  <td>{i.name}</td>
                  <td>{i.size || '—'}</td>
                  <td>{i.quantity}</td>
                  <td>{formatCurrency(i.unitPrice)}</td>
                  <td>{formatCurrency(i.unitPrice * i.quantity)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan="5" style={{ textAlign: 'right' }}>Delivery</td><td>FREE</td></tr>
              <tr><td colSpan="5" style={{ textAlign: 'right' }}><strong>Order total</strong></td><td><strong>{formatCurrency(order.total)}</strong></td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="admin-card">
        <h2 className="admin-h2">Status history</h2>
        <ol className="history-list">
          {[...order.statusHistory].reverse().map((h, i) => (
            <li key={i}>
              <StatusPill status={h.status} />
              <span className="text-muted"> {formatDateTime(h.at)}{h.by ? ` · by ${h.by}` : ''}</span>
              {h.note && <div>{h.note}</div>}
            </li>
          ))}
        </ol>
      </div>

      {confirming && (
        <ConfirmDialog
          title={isCancel ? 'Cancel this order?' : 'Update order status?'}
          message={
            isCancel
              ? 'The order will be cancelled and its items returned to stock. This cannot be undone.'
              : `Change the status from "${order.status}" to "${nextStatus}"?`
          }
          confirmLabel={isCancel ? 'Cancel order' : 'Update'}
          danger={isCancel}
          busy={saving}
          onConfirm={apply}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
