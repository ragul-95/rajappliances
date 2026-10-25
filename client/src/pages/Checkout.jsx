import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { orderService } from '../services';
import { INDIAN_STATES } from '../constants';
import { formatCurrency } from '../utils/format';
import useBodyStyle from '../hooks/useBodyStyle';
import useTitle from '../hooks/useTitle';

const EMPTY = { fullName: '', mobile: '', line1: '', line2: '', city: '', state: '', pincode: '' };

function validate(f) {
  const e = {};
  if (f.fullName.trim().length < 2) e.fullName = 'Enter your full name.';
  if (!/^[6-9]\d{9}$/.test(f.mobile.trim())) e.mobile = 'Enter a valid 10-digit mobile number.';
  if (!f.line1.trim()) e.line1 = 'Enter your flat, house no. or building.';
  if (!f.line2.trim()) e.line2 = 'Enter your area, street or village.';
  if (!f.city.trim()) e.city = 'Enter your city.';
  if (!f.state) e.state = 'Choose a state.';
  if (!/^[1-9]\d{5}$/.test(f.pincode.trim())) e.pincode = 'Enter a valid 6-digit pincode.';
  return e;
}

export default function Checkout() {
  useTitle('Checkout - RajAppliences');
  useBodyStyle('var(--background)');

  const { user } = useAuth();
  const { lines, items, loading, subtotal, deliveryFee, total, hasProblems, clear, refresh } = useCart();
  const { showToast } = useToast();

  const [form, setForm] = useState({ ...EMPTY, fullName: user?.name || '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  // Nothing to buy (and we haven't just placed an order): back to the cart.
  if (!placedOrder && lines.length === 0) return <Navigate to="/cart" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return; // block duplicate orders
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      showToast('Please fix the highlighted fields', 'error');
      return;
    }
    if (hasProblems) {
      showToast('Some items in your cart are unavailable. Please review your cart.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // Only IDs, sizes and quantities are sent. The server looks up prices itself.
      const order = await orderService.create({
        items: lines.map((l) => ({ productId: l.productId, size: l.size, quantity: l.quantity })),
        shipping: {
          fullName: form.fullName.trim(),
          mobile: form.mobile.trim(),
          line1: form.line1.trim(),
          line2: form.line2.trim(),
          city: form.city.trim(),
          state: form.state,
          pincode: form.pincode.trim(),
        },
        paymentMethod: 'Cash on Delivery',
      });
      clear();
      setPlacedOrder(order);
    } catch (err) {
      showToast(err.message, 'error');
      if (err.status === 409 || err.status === 400) refresh(); // stock changed: reload latest data
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (name) => (errors[name] ? <div className="field-error">{errors[name]}</div> : null);
  const invalid = (name) => (errors[name] ? { 'aria-invalid': true, className: 'has-error' } : {});

  return (
    <>
      {/* Simple Header for Checkout */}
      <header style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '15px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" className="logo-container" style={{ color: 'var(--navy)', textDecoration: 'none' }}>
            <span style={{ fontSize: 28, fontWeight: 'bold' }}>
              RajAppliences<span style={{ color: 'var(--orange)', fontSize: 14 }}>.in</span>
            </span>
          </Link>
          <h1 style={{ fontWeight: 400, fontSize: 24, color: 'var(--text)' }}>Checkout</h1>
          <i className="fas fa-lock" style={{ color: 'var(--muted)', fontSize: 24 }}></i>
        </div>
      </header>

      <main className="checkout-page">
        {placedOrder ? (
          <div className="empty-state" style={{ width: '100%' }}>
            <i className="fas fa-check-circle" style={{ color: 'var(--success)' }}></i>
            <h2>Order Placed Successfully!</h2>
            <p>
              Your order number is <strong>{placedOrder.orderNumber}</strong>
            </p>
            <p>Please keep {formatCurrency(placedOrder.total)} ready to pay in cash on delivery.</p>
            <Link to="/orders" className="btn btn-primary" style={{ marginTop: 20 }}>
              View Orders
            </Link>
          </div>
        ) : (
          <>
            <div className="checkout-main">
              <form id="checkout-form" onSubmit={submit} noValidate>
                {/* 1. Delivery Address */}
                <div className="checkout-section">
                  <h2>1. Delivery address</h2>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="co-name">Full name (First and Last name)</label>
                      <input id="co-name" type="text" autoComplete="name" value={form.fullName} onChange={set('fullName')} {...invalid('fullName')} />
                      {fieldError('fullName')}
                    </div>
                    <div className="form-group">
                      <label htmlFor="co-mobile">Mobile number</label>
                      <input id="co-mobile" type="tel" inputMode="numeric" maxLength={10} autoComplete="tel-national" value={form.mobile} onChange={set('mobile')} {...invalid('mobile')} />
                      {fieldError('mobile')}
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="co-line1">Flat, House no., Building, Company, Apartment</label>
                    <input id="co-line1" type="text" autoComplete="address-line1" value={form.line1} onChange={set('line1')} {...invalid('line1')} />
                    {fieldError('line1')}
                  </div>
                  <div className="form-group">
                    <label htmlFor="co-line2">Area, Street, Sector, Village</label>
                    <input id="co-line2" type="text" autoComplete="address-line2" value={form.line2} onChange={set('line2')} {...invalid('line2')} />
                    {fieldError('line2')}
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="co-city">City</label>
                      <input id="co-city" type="text" autoComplete="address-level2" value={form.city} onChange={set('city')} {...invalid('city')} />
                      {fieldError('city')}
                    </div>
                    <div className="form-group">
                      <label htmlFor="co-state">State</label>
                      <select id="co-state" autoComplete="address-level1" value={form.state} onChange={set('state')} {...invalid('state')}>
                        <option value="">Choose a state</option>
                        {INDIAN_STATES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      {fieldError('state')}
                    </div>
                    <div className="form-group">
                      <label htmlFor="co-pin">Pincode</label>
                      <input id="co-pin" type="text" inputMode="numeric" maxLength={6} autoComplete="postal-code" value={form.pincode} onChange={set('pincode')} {...invalid('pincode')} />
                      {fieldError('pincode')}
                    </div>
                  </div>
                </div>

                {/* 2. Payment Method */}
                <div className="checkout-section">
                  <h2>2. Payment method</h2>
                  <div className="payment-methods">
                    <label className="payment-method">
                      <input type="radio" name="payment" value="Cash on Delivery" checked readOnly />
                      <span>Cash on Delivery / Pay on Delivery</span>
                    </label>
                  </div>

                  <div style={{ marginTop: 15, background: '#f0f2f2', padding: 10, borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                    <i className="fas fa-info-circle text-muted"></i> Pay in cash when your order is delivered. No online payment is needed.
                  </div>
                </div>

                {/* 3. Review items and delivery */}
                <div className="checkout-section">
                  <h2>3. Review items and delivery</h2>
                  {loading ? (
                    <div className="loading-block"><i className="fas fa-spinner fa-spin"></i></div>
                  ) : (
                    <ul className="review-list">
                      {items.map((i) => (
                        <li key={`${i.productId}:${i.size || ''}`} className={i.problem ? 'text-danger' : ''}>
                          {i.product ? i.product.name : 'Unavailable product'}
                          {i.size ? ` (Size ${i.size})` : ''} × {i.quantity}
                          {i.problem ? ` — ${i.problem}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-muted" style={{ marginBottom: 15 }}>Delivery: FREE</p>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ fontSize: 16, padding: '12px 30px' }}
                    disabled={submitting || loading}
                  >
                    {submitting ? 'Placing your order…' : 'Place your order'}
                  </button>
                </div>
              </form>
            </div>

            {/* Order Summary Sidebar */}
            <aside className="checkout-sidebar">
              <div style={{ background: 'white', padding: 20, border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <button type="submit" form="checkout-form" className="btn btn-primary" style={{ width: '100%', marginBottom: 20 }} disabled={submitting || loading}>
                  {submitting ? 'Placing your order…' : 'Place your order'}
                </button>
                <p style={{ fontSize: 11, textAlign: 'center', color: 'var(--muted)', marginBottom: 15 }}>
                  By placing your order, you agree to RajAppliences's privacy notice and conditions of use.
                </p>

                <h3 style={{ fontSize: 16, marginBottom: 15, borderBottom: '1px solid var(--border-light)', paddingBottom: 10 }}>
                  Order Summary
                </h3>

                <div className="order-summary-item">
                  <span>Items:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="order-summary-item">
                  <span>Delivery:</span>
                  <span>{deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)}</span>
                </div>
                <div className="order-summary-item total">
                  <span>Order Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </aside>
          </>
        )}
      </main>

      <footer style={{ background: 'white', borderTop: '1px solid var(--border)', color: 'var(--text)', textAlign: 'center', padding: '30px 0', marginTop: 40 }}>
        <div className="container">
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>
            Conditions of Use | Privacy Notice © {new Date().getFullYear()}, RajAppliences.in
          </p>
        </div>
      </footer>
    </>
  );
}
