import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productService } from '../services';
import { CATEGORIES } from '../constants';
import ProductCard from '../components/ProductCard';
import useTitle from '../hooks/useTitle';

// Price radio value -> API range (inclusive on both ends, same as the original filters).
const PRICE_RANGES = {
  all: {},
  under1000: { maxPrice: 999 },
  '1000-5000': { minPrice: 1000, maxPrice: 5000 },
  '5000-10000': { minPrice: 5000, maxPrice: 10000 },
  over10000: { minPrice: 10001 },
};

export default function Products() {
  useTitle('Products - RajAppliences');
  const [searchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const categoryParam = searchParams.get('category') || '';

  const [categories, setCategories] = useState(categoryParam ? [categoryParam] : []);
  const [price, setPrice] = useState('all');
  const [rating, setRating] = useState('');
  const [sort, setSort] = useState('relevance');

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const categoryKey = categories.join(',');

  // When the header's category dropdown changes the address, follow it.
  useEffect(() => {
    setCategories(categoryParam ? [categoryParam] : []);
  }, [categoryParam]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    productService
      .list({
        search,
        category: categoryKey,
        ...PRICE_RANGES[price],
        rating,
        sort: sort === 'relevance' ? '' : sort,
      })
      .then((list) => !cancelled && setProducts(list))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [search, categoryKey, price, rating, sort]);

  const toggleCategory = (value) =>
    setCategories((list) => (list.includes(value) ? list.filter((c) => c !== value) : [...list, value]));

  return (
    <main className="products-page">
      {/* Sidebar Filters */}
      <aside className="sidebar">
        <div className="filter-section">
          <h4>Category</h4>
          <div className="filter-list">
            {CATEGORIES.map((c) => (
              <label key={c}>
                <input type="checkbox" name="category" value={c} checked={categories.includes(c)} onChange={() => toggleCategory(c)} /> {c}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <h4>Price</h4>
          <div className="filter-list">
            {[
              ['all', 'All Prices'],
              ['under1000', 'Under ₹1,000'],
              ['1000-5000', '₹1,000 - ₹5,000'],
              ['5000-10000', '₹5,000 - ₹10,000'],
              ['over10000', 'Over ₹10,000'],
            ].map(([value, label]) => (
              <label key={value}>
                <input type="radio" name="price" value={value} checked={price === value} onChange={() => setPrice(value)} /> {label}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <h4>Customer Review</h4>
          <div className="filter-list">
            {[
              ['4', '4 Stars & Up'],
              ['3', '3 Stars & Up'],
              ['2', '2 Stars & Up'],
              ['1', '1 Star & Up'],
            ].map(([value, label]) => (
              <label key={value}>
                <input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} /> {label}
              </label>
            ))}
          </div>
        </div>
      </aside>

      {/* Products List */}
      <div className="main-content">
        <div className="listing-header">
          <h2 id="results-heading">{search ? `Results for "${search}"` : 'All Products'}</h2>
          <div>
            <label htmlFor="sort-select">Sort by: </label>
            <select id="sort-select" className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="relevance">Relevance</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Customer Rating</option>
            </select>
          </div>
        </div>

        <div className="products-grid">
          {loading ? (
            <div className="loading-block" style={{ gridColumn: '1/-1' }}>
              <i className="fas fa-spinner fa-spin"></i>
            </div>
          ) : error ? (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <i className="fas fa-exclamation-circle"></i>
              <h2>Something went wrong</h2>
              <p>{error}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <i className="fas fa-search"></i>
              <h2>No results found</h2>
              <p>Try adjusting your filters or search query.</p>
            </div>
          ) : (
            products.map((p) => <ProductCard key={p._id} product={p} />)
          )}
        </div>
      </div>
    </main>
  );
}
