import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { CATEGORIES } from '../constants';

// One header for every page (the original had slightly different copies on each page).
export default function Header() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, logout } = useAuth();
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { showToast } = useToast();

  const [query, setQuery] = useState(params.get('search') || '');
  const [category, setCategory] = useState('All');
  const [menuOpen, setMenuOpen] = useState(false);

  // Keep the search box in sync with the address bar (e.g. after clicking "Mobiles").
  useEffect(() => {
    setQuery(params.get('search') || '');
  }, [params]);

  const submitSearch = (e) => {
    e.preventDefault();
    const search = query.trim();
    const qs = new URLSearchParams();
    if (search) qs.set('search', search);
    if (category !== 'All') qs.set('category', category);
    navigate(`/products${qs.toString() ? `?${qs}` : ''}`);
  };

  const handleAccount = async (e) => {
    if (!user) return; // normal link to /login
    e.preventDefault();
    if (window.confirm('Are you sure you want to log out?')) {
      await logout();
      showToast('Logged out successfully');
      navigate('/');
    }
  };

  // Same inline styles the original hamburger applied.
  const mobileMenuStyle = menuOpen
    ? {
        display: 'flex',
        flexDirection: 'column',
        position: 'absolute',
        top: '100%',
        left: 0,
        width: '100%',
        zIndex: 999,
        padding: '10px 0',
      }
    : undefined;

  const closeMenu = () => setMenuOpen(false);

  return (
    <header>
      <div className="navbar-top">
        <div className="hamburger" onClick={() => setMenuOpen((o) => !o)}>
          <i className="fas fa-bars"></i>
        </div>

        <div className="logo-container">
          <Link to="/">
            RajAppliences
            <span>.in</span>
          </Link>
        </div>

        <div className="nav-location">
          <i className="fas fa-map-marker-alt"></i>
          <div className="nav-location-text">
            <span>Delivering to</span>
            <strong>Select location</strong>
          </div>
        </div>

        <form className="search-container" onSubmit={submitSearch}>
          <select className="search-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="search-input"
            placeholder="Search RajAppliences.in"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="search-btn" aria-label="Search">
            <i className="fas fa-search"></i>
          </button>
        </form>

        <div className="nav-actions">
          <Link to={user ? '#' : '/login'} className="nav-link nav-account" onClick={handleAccount}>
            <div className="nav-account-text">
              <span>{user ? `Hello, ${user.name.split(' ')[0]}` : 'Hello, sign in'}</span>{' '}
              <strong>{user ? 'Sign out' : 'Account & Lists'}</strong>
            </div>
          </Link>

          <Link to="/orders" className="nav-link nav-orders">
            <span>Returns</span>
            <strong>&amp; Orders</strong>
          </Link>

          <Link to="/wishlist" className="nav-link nav-wishlist">
            <i className="far fa-heart"></i>
            <span className="wishlist-count">{wishlistCount}</span>
            <strong>Wishlist</strong>
          </Link>

          <Link to="/cart" className="nav-link nav-cart">
            <i className="fas fa-shopping-cart"></i>
            <span className="cart-count">{cartCount}</span>
            <strong>Cart</strong>
          </Link>
        </div>
      </div>

      <div className="navbar-bottom" style={mobileMenuStyle} onClick={closeMenu}>
        <Link to="/products">
          <i className="fas fa-bars"></i> All
        </Link>
        <Link to="/products">Today's Deals</Link>
        <Link to="/products?search=mobiles">Mobiles</Link>
        <Link to="/products?search=electronics">Electronics</Link>
        <Link to="/products?search=fashion">Fashion</Link>
        <Link to="/products?search=home">Home &amp; Kitchen</Link>
        <Link to="/products?search=books">Books</Link>
      </div>
    </header>
  );
}
