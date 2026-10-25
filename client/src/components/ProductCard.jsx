import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { formatCurrency, mainImage, onImageError } from '../utils/format';
import Stars from './Stars';
import Badges from './Badges';
import { useState } from 'react';

export default function ProductCard({ product }) {
  const { add } = useCart();
  const { has, toggle } = useWishlist();
  const [justAdded, setJustAdded] = useState(false);

  const wishlisted = has(product._id);
  const outOfStock = product.stock < 1;
  const needsSize = product.hasSizes;
  const link = `/product/${product._id}`;

  const handleAdd = () => {
    if (add(product, null, 1)) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1500);
    }
  };

  return (
    <div className="product-card">
      <Badges badges={product.badges} />
      <button
        className={`wishlist-btn-overlay ${wishlisted ? 'active' : ''}`}
        onClick={() => toggle(product)}
        aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <i className={`${wishlisted ? 'fas' : 'far'} fa-heart`}></i>
      </button>

      <Link to={link} className="product-image">
        <img src={mainImage(product)} alt={product.name} onError={onImageError} />
      </Link>

      <div className="product-details">
        <Link to={link} className="product-title">
          {product.name}
        </Link>

        {product.reviews > 0 && (
          <div className="product-rating">
            <div className="stars">
              <Stars rating={product.rating} />
            </div>
            <span className="reviews-count">{product.reviews.toLocaleString()}</span>
          </div>
        )}

        <div className="product-price-container">
          <span className="price">{formatCurrency(product.price)}</span>
          {product.originalPrice > product.price && (
            <span className="original-price">{formatCurrency(product.originalPrice)}</span>
          )}
        </div>

        {outOfStock ? (
          <button className="btn btn-primary add-to-cart-btn" disabled>
            Out of Stock
          </button>
        ) : needsSize ? (
          <Link to={link} className="btn btn-primary add-to-cart-btn">
            Select Size
          </Link>
        ) : (
          <button
            className="btn btn-primary add-to-cart-btn"
            onClick={handleAdd}
            style={justAdded ? { backgroundColor: 'var(--success)', color: 'white' } : undefined}
          >
            {justAdded ? (
              <>
                <i className="fas fa-check"></i> Added
              </>
            ) : (
              'Add to Cart'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
