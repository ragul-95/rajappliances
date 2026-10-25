import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../services';
import { useToast } from '../context/ToastContext';
import { BADGES, CATEGORIES } from '../constants';
import { formatCurrency, mainImage } from '../utils/format';
import ConfirmDialog from './ConfirmDialog';
import useTitle from '../hooks/useTitle';

export default function ProductList() {
  useTitle('Products - Admin');
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // debounced copy of "search"
  const [category, setCategory] = useState('');
  const [badge, setBadge] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadTick, setReloadTick] = useState(0);

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    adminService
      .products({ search: query, category, badge })
      .then((list) => !cancelled && setProducts(list))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query, category, badge, reloadTick]);

  const confirmDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await adminService.deleteProduct(toDelete._id);
      showToast(`"${toDelete.name}" was deleted`);
      setToDelete(null);
      setReloadTick((n) => n + 1);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="admin-title-row">
        <h1 className="admin-title">Products</h1>
        <Link to="/admin/products/new" className="btn btn-primary">
          <i className="fas fa-plus"></i> Add Product
        </Link>
      </div>

      <div className="admin-card">
        <div className="admin-filters">
          <input type="search" placeholder="Search by name, brand or category" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={badge} onChange={(e) => setBadge(e.target.value)}>
            <option value="">All badges</option>
            {BADGES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {error && <div className="form-alert">{error}</div>}

        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Sizes</th>
                <th>Stock</th>
                <th>Badges</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8"><div className="loading-block"><i className="fas fa-spinner fa-spin"></i></div></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="8" className="text-muted" style={{ textAlign: 'center', padding: 30 }}>No products found.</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p._id}>
                    <td><img className="thumb" src={mainImage(p)} alt="" /></td>
                    <td>
                      <strong>{p.name}</strong>
                      {p.brand && <div className="text-muted">{p.brand}</div>}
                    </td>
                    <td>{p.category}</td>
                    <td>{formatCurrency(p.price)}</td>
                    <td>
                      {p.hasSizes ? (
                        <div className="chip-row">
                          {p.sizes.map((s) => (
                            <span key={s.label} className={`chip ${s.stock < 1 ? 'chip-off' : ''}`} title={`${s.stock} in stock`}>
                              {s.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className={p.stock < 1 ? 'text-danger' : p.stock <= 5 ? 'text-low' : ''}>
                      {p.stock < 1 ? 'Out of stock' : p.stock}
                    </td>
                    <td>
                      <div className="chip-row">
                        {p.badges.length === 0 ? <span className="text-muted">—</span> : p.badges.map((b) => <span key={b} className="chip chip-badge">{b}</span>)}
                      </div>
                    </td>
                    <td className="row-actions">
                      <Link to={`/admin/products/${p._id}/edit`} className="btn btn-outline">Edit</Link>
                      <button className="btn btn-danger" onClick={() => setToDelete(p)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toDelete && (
        <ConfirmDialog
          title="Delete this product?"
          message={`"${toDelete.name}" will be removed from the store. Past orders keep their own copy of the product details.`}
          confirmLabel="Delete"
          danger
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
