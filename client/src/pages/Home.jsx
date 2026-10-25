import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '../services';
import ProductCard from '../components/ProductCard';
import useTitle from '../hooks/useTitle';

const img = (id) =>
  `https://images.unsplash.com/photo-${id}?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80`;

function Section({ title, products, loading }) {
  return (
    <section className="product-section">
      <h2>{title}</h2>
      <div className="product-carousel">
        {loading ? (
          <div className="loading-block">
            <i className="fas fa-spinner fa-spin"></i>
          </div>
        ) : products.length === 0 ? (
          <p className="text-muted">Nothing to show yet.</p>
        ) : (
          products.map((p) => <ProductCard key={p._id} product={p} />)
        )}
      </div>
    </section>
  );
}

export default function Home() {
  useTitle('RajAppliences - Online Shopping for Electronics, Apparel, Computers, Books & more');
  const [data, setData] = useState({ deals: [], bestSellers: [], recommended: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    productService
      .home()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      {/* Hero Banner */}
      <section className="hero">
        <div className="hero-banner">
          <div style={{ textAlign: 'center', maxWidth: 600, padding: 20 }}>
            <h1 style={{ fontSize: 40, marginBottom: 20 }}>Welcome to RajAppliences</h1>
            <p style={{ fontSize: 18, marginBottom: 20 }}>
              Discover millions of products at unbeatable prices. Free delivery, pay on delivery.
            </p>
            <Link to="/products" className="btn btn-primary" style={{ fontSize: 18, padding: '15px 30px' }}>
              Shop Now
            </Link>
          </div>
        </div>

        <div className="category-cards">
          <div className="category-card">
            <h3>Up to 70% off | Electronics</h3>
            <div className="category-grid">
              <div className="category-item">
                <img src={img('1593359677879-a4bb92f829d1')} alt="TVs" />
                <span>Smart TVs</span>
              </div>
              <div className="category-item">
                <img src={img('1618366712010-f4ae9c647dcb')} alt="Audio" />
                <span>Audio</span>
              </div>
              <div className="category-item">
                <img src={img('1517336714731-489689fd1ca8')} alt="Laptops" />
                <span>Laptops</span>
              </div>
              <div className="category-item">
                <img src={img('1516035069371-29a1b244cc32')} alt="Cameras" />
                <span>Cameras</span>
              </div>
            </div>
            <Link to="/products?search=electronics" className="category-link">
              See all offers
            </Link>
          </div>

          <div className="category-card">
            <h3>Latest Smartphones</h3>
            <img src={img('1695048133142-1a20484d2569')} alt="Mobiles" />
            <Link to="/products?search=mobiles" className="category-link">
              Shop now
            </Link>
          </div>

          <div className="category-card">
            <h3>Home appliances clearance</h3>
            <div className="category-grid">
              <div className="category-item">
                <img src={img('1599813352723-690184457497')} alt="Air Fryer" />
                <span>Kitchen</span>
              </div>
              <div className="category-item">
                <img src={img('1558317374-067fb5f30001')} alt="Vacuum" />
                <span>Cleaning</span>
              </div>
              <div className="category-item">
                <img src={img('1584269600464-37b1b58a9fe7')} alt="Cookware" />
                <span>Cookware</span>
              </div>
              <div className="category-item">
                <img src={img('1505693416388-ac5ce068fe85')} alt="Furniture" />
                <span>Furniture</span>
              </div>
            </div>
            <Link to="/products?search=home" className="category-link">
              Explore all
            </Link>
          </div>

          <div className="category-card">
            <h3>Styles for Men &amp; Women</h3>
            <img src={img('1542272604-787c3835535d')} alt="Fashion" />
            <Link to="/products?search=fashion" className="category-link">
              Shop fashion
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <p className="text-danger" style={{ padding: 20 }}>
          {error}
        </p>
      )}
      <Section title="Today's Deals" products={data.deals} loading={loading} />
      <Section title="Best Sellers" products={data.bestSellers} loading={loading} />
      <Section title="Recommended for you" products={data.recommended} loading={loading} />
    </main>
  );
}
