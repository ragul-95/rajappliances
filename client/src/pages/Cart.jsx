import { Link, useNavigate } from 'react-router-dom';
import { useCart, availableStock } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/format';
import { mainImage } from '../utils/format';
import { MAX_QTY_PER_LINE } from '../constants';
import useTitle from '../hooks/useTitle';

export default function Cart() {
  useTitle('Shopping Cart - RajAppliences');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, loading, count, subtotal, deliveryFee, total, hasProblems, setQuantity, remove } = useCart();

  const proceed = () => {
    navigate(user ? '/checkout' : '/login?redirect=%2Fcheckout');
  };

  const empty = items.length === 0;

  return (
    <main className="cart-page">
      {/* Cart Items */}
      <div className="cart-main">
        <div className="cart-header">
          <h1>Shopping Cart</h1>
          <span className="cart-price-header">Price</span>
        </div>

        <div id="cart-items-container">
          {empty ? (
            <div className="empty-state">
              <i className="fas fa-shopping-cart"></i>
              <h2>Your cart is empty</h2>
              <Link to="/" className="btn btn-primary" style={{ marginTop: 15 }}>
                Continue Shopping
              </Link>
            </div>
          ) : (
            items.map((item) => {
              const p = item.product;
              const stock = availableStock(p, item.size);
              const canAddMore = p && item.quantity < Math.min(stock, MAX_QTY_PER_LINE);
              return (
                <div className="cart-item" key={`${item.productId}:${item.size || ''}`}>
                  {p ? (
                    <img src={mainImage(p)} alt={p.name} className="cart-item-img" />
                  ) : (
                    <div className="cart-item-img" aria-hidden="true"></div>
                  )}
                  <div className="cart-item-info">
                    {p ? (
                      <Link to={`/product/${p._id}`} className="cart-item-title">
                        {p.name}
                      </Link>
                    ) : (
                      <span className="cart-item-title">{loading ? 'Loading…' : 'Unavailable product'}</span>
                    )}
                    {item.size && <div className="cart-item-size">Size: {item.size}</div>}
                    {item.problem ? (
                      <div className="cart-item-stock text-danger">{item.problem}</div>
                    ) : (
                      <div className="cart-item-stock">In Stock</div>
                    )}
                    <div className="cart-item-actions">
                      <div className="cart-qty-wrapper">
                        <button
                          className="qty-btn dec-btn"
                          disabled={item.quantity <= 1}
                          onClick={() => setQuantity(item, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <input type="text" className="qty-input" value={item.quantity} readOnly />
                        <button
                          className="qty-btn inc-btn"
                          disabled={!canAddMore}
                          onClick={() => setQuantity(item, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <button className="remove-link" onClick={() => remove(item)}>
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="cart-item-price">{p ? formatCurrency(p.price) : ''}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Cart Summary */}
      <aside className="cart-sidebar" style={{ display: empty ? 'none' : 'block' }}>
        <div className="cart-summary">
          <h3 style={{ marginBottom: 15, fontWeight: 400 }}>
            Subtotal ({count} items): {formatCurrency(total)}
          </h3>
          <button className="btn btn-primary" onClick={proceed} disabled={loading || hasProblems}>
            Proceed to Buy
          </button>
          {hasProblems && (
            <p className="field-error" style={{ marginTop: 10 }}>
              Fix the highlighted items before continuing.
            </p>
          )}

          <div style={{ marginTop: 20, fontSize: 14 }}>
            <strong>Order Summary</strong>
            <div className="summary-row" style={{ marginTop: 10 }}>
              <span>Items ({count}):</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Delivery:</span>
              <span>{deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)}</span>
            </div>
            <div className="summary-row summary-total">
              <span>Order Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
