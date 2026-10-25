import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from '../components/ProductCard';
import useTitle from '../hooks/useTitle';

export default function Wishlist() {
  useTitle('Wishlist - RajAppliences');
  const { products, loading, count } = useWishlist();

  return (
    <main style={{ padding: 20, maxWidth: 1500, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 20, fontWeight: 400 }}>Your Wishlist</h1>

      <div className="products-grid" id="wishlist-container">
        {loading && count > 0 ? (
          <div className="loading-block" style={{ gridColumn: '1/-1' }}>
            <i className="fas fa-spinner fa-spin"></i>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <i className="far fa-heart"></i>
            <h2>Your wishlist is empty</h2>
            <Link to="/" className="btn btn-primary" style={{ marginTop: 15 }}>
              Explore Products
            </Link>
          </div>
        ) : (
          products.map((p) => <ProductCard key={p._id} product={p} />)
        )}
      </div>
    </main>
  );
}
