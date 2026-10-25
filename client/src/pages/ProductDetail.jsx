import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { productService } from '../services';
import { useCart, availableStock } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { MAX_QTY_PER_LINE, IMAGE_ANGLES } from '../constants';
import { formatCurrency, onImageError, PLACEHOLDER_IMG } from '../utils/format';
import Stars from '../components/Stars';
import Badges from '../components/Badges';
import useTitle from '../hooks/useTitle';

const angleLabel = (key) => IMAGE_ANGLES.find((a) => a.key === key)?.label || key;

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const { has, toggle } = useWishlist();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [size, setSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);

  useTitle(product ? `${product.name} - RajAppliences` : 'Product - RajAppliences');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setImageIndex(0);
    setSize(null);
    setQty(1);
    productService
      .get(id)
      .then((p) => !cancelled && setProduct(p))
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="product-detail-page">
        <div className="loading-block" style={{ width: '100%' }}>
          <i className="fas fa-spinner fa-spin"></i>
        </div>
      </main>
    );
  }

  if (notFound || !product) {
    return (
      <main className="product-detail-page">
        <div className="empty-state" style={{ width: '100%' }}>
          <h2>Product Not Found</h2>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 15 }}>
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  const images = product.images || [];
  const current = images[imageIndex] || images[0];
  const stock = product.hasSizes && size ? availableStock(product, size) : product.stock;
  const soldOut = product.stock < 1;
  const maxQty = Math.max(1, Math.min(stock, MAX_QTY_PER_LINE));
  const wishlisted = has(product._id);

  const chooseSize = (label) => {
    setSize(label);
    setSizeError(false);
    setQty(1);
  };

  const handleAdd = () => {
    if (product.hasSizes && !size) {
      setSizeError(true);
      return false;
    }
    return add(product, size, qty);
  };

  const stockText = soldOut
    ? 'Out of Stock'
    : stock <= 5
      ? `Only ${stock} left in stock`
      : 'In Stock';

  return (
    <main className="product-detail-page">
      {/* Image Section */}
      <div className="detail-image-sec" style={{ flexDirection: 'column', alignItems: 'center' }}>
        <Badges badges={product.badges} />
        <img
          key={current?.url}
          id="detail-img"
          src={current?.url || PLACEHOLDER_IMG}
          alt={`${product.name} - ${angleLabel(current?.angle)} view`}
          onError={onImageError}
        />
        {images.length > 1 && (
          <div className="gallery-thumbs">
            {images.map((img, i) => (
              <button
                key={img.angle}
                type="button"
                className={`gallery-thumb ${i === imageIndex ? 'active' : ''}`}
                onClick={() => setImageIndex(i)}
                aria-label={`Show ${angleLabel(img.angle)} view`}
                title={angleLabel(img.angle)}
              >
                <img src={img.url} alt="" onError={onImageError} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="detail-info-sec">
        <h1 className="detail-title">{product.name}</h1>
        {product.brand && (
          <Link to={`/products?search=${encodeURIComponent(product.brand)}`} className="detail-brand">
            Brand: {product.brand}
          </Link>
        )}

        {product.reviews > 0 && (
          <div className="detail-rating">
            <span className="stars">
              <Stars rating={product.rating} />
            </span>
            <span className="reviews-count"> {product.reviews.toLocaleString()} ratings</span>
          </div>
        )}

        <div className="detail-price-sec">
          <div className="detail-price">{formatCurrency(product.price)}</div>
          {product.originalPrice > product.price && (
            <div className="original-price">M.R.P: {formatCurrency(product.originalPrice)}</div>
          )}
          <p style={{ fontSize: 14, marginTop: 10 }}>Inclusive of all taxes</p>
          <p className="text-success" style={{ fontSize: 14, marginTop: 4 }}>
            <i className="fas fa-truck"></i> FREE delivery
          </p>
        </div>

        <div className="detail-desc">
          <h3>About this item</h3>
          <p style={{ whiteSpace: 'pre-line' }}>{product.description}</p>
        </div>
      </div>

      {/* Action Section */}
      <div className="detail-action-sec">
        <div className={`stock-status ${soldOut ? 'text-danger' : ''}`}>{stockText}</div>

        {product.hasSizes && (
          <div className="size-picker">
            <div className="size-picker-label">
              Size: <strong>{size || 'Select'}</strong>
            </div>
            <div className="size-options" role="radiogroup" aria-label="Size">
              {product.sizes.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  role="radio"
                  aria-checked={size === s.label}
                  className={`size-option ${size === s.label ? 'active' : ''}`}
                  disabled={s.stock < 1}
                  onClick={() => chooseSize(s.label)}
                  title={s.stock < 1 ? 'Out of stock' : `${s.stock} available`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {sizeError && <div className="field-error">Please select a size.</div>}
          </div>
        )}

        <div className="quantity-selector">
          <label htmlFor="detail-qty">Quantity: </label>
          <select
            id="detail-qty"
            className="qty-select"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            disabled={soldOut}
          >
            {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <button className="btn btn-primary" disabled={soldOut} onClick={handleAdd}>
          Add to Cart
        </button>
        <button
          className="btn btn-secondary"
          disabled={soldOut}
          onClick={() => {
            if (handleAdd()) navigate('/cart');
          }}
        >
          Buy Now
        </button>

        <div style={{ marginTop: 15, borderTop: '1px solid var(--border-light)', paddingTop: 15 }}>
          <button className="btn btn-outline" style={{ width: '100%', borderRadius: 20 }} onClick={() => toggle(product)}>
            {wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          </button>
        </div>
      </div>
    </main>
  );
}
