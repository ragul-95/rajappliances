import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminService } from '../services';
import { useToast } from '../context/ToastContext';
import {
  ALLOWED_IMAGE_TYPES, BADGES, CATEGORIES, IMAGE_ANGLES, MAX_IMAGE_BYTES, SIZE_PRESETS,
} from '../constants';
import useTitle from '../hooks/useTitle';

const emptyImages = () =>
  Object.fromEntries(IMAGE_ANGLES.map((a) => [a.key, { file: null, preview: '', url: '' }]));

const EMPTY_FORM = {
  name: '', price: '', originalPrice: '', brand: '', category: '', description: '', stock: '', hasSizes: false, badges: [],
};

const isWholeNumber = (v) => /^\d+$/.test(String(v).trim());

export default function ProductForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  useTitle(editing ? 'Edit Product - Admin' : 'Add Product - Admin');

  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [sizes, setSizes] = useState([]); // [{ label, stock }]
  const [images, setImages] = useState(emptyImages);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [preset, setPreset] = useState('Clothing');
  const [customSize, setCustomSize] = useState('');

  // Remember every preview URL we create so we can free the memory later.
  const previews = useRef(new Set());
  useEffect(() => {
    const set = previews.current;
    return () => set.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  // Editing: load the existing product.
  useEffect(() => {
    if (!editing) return undefined;
    let cancelled = false;
    adminService
      .product(id)
      .then((p) => {
        if (cancelled) return;
        setForm({
          name: p.name,
          price: String(p.price),
          originalPrice: p.originalPrice ? String(p.originalPrice) : '',
          brand: p.brand || '',
          category: p.category,
          description: p.description,
          stock: p.hasSizes ? '' : String(p.stock),
          hasSizes: p.hasSizes,
          badges: p.badges || [],
        });
        setSizes((p.sizes || []).map((s) => ({ label: s.label, stock: String(s.stock) })));
        const imgs = emptyImages();
        (p.images || []).forEach((i) => {
          if (imgs[i.angle]) imgs[i.angle].url = i.url;
        });
        setImages(imgs);
      })
      .catch((e) => !cancelled && setLoadError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [editing, id]);

  const setField = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  // ---- images ----
  const pickImage = (angle, file) => {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrors((er) => ({ ...er, [`image_${angle}`]: 'Use a JPG, PNG or WebP image.' }));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrors((er) => ({ ...er, [`image_${angle}`]: 'This image is larger than 5 MB.' }));
      return;
    }
    const preview = URL.createObjectURL(file);
    previews.current.add(preview);
    setImages((imgs) => {
      if (imgs[angle].preview) URL.revokeObjectURL(imgs[angle].preview);
      return { ...imgs, [angle]: { ...imgs[angle], file, preview } };
    });
    setErrors((er) => ({ ...er, [`image_${angle}`]: undefined }));
  };

  // ---- sizes ----
  const hasSize = (label) => sizes.some((s) => s.label === label);
  const toggleSize = (label) => {
    setSizes((list) => (hasSize(label) ? list.filter((s) => s.label !== label) : [...list, { label, stock: '0' }]));
    setErrors((er) => ({ ...er, sizes: undefined }));
  };
  const addCustomSize = () => {
    const label = customSize.trim().toUpperCase();
    if (!label) return;
    if (label.length > 10) {
      setErrors((er) => ({ ...er, sizes: 'A size name can be at most 10 characters.' }));
      return;
    }
    if (!hasSize(label)) setSizes((list) => [...list, { label, stock: '0' }]);
    setCustomSize('');
    setErrors((er) => ({ ...er, sizes: undefined }));
  };
  const setSizeStock = (label, value) =>
    setSizes((list) => list.map((s) => (s.label === label ? { ...s, stock: value } : s)));

  const toggleBadge = (badge) =>
    setForm((f) => ({
      ...f,
      badges: f.badges.includes(badge) ? f.badges.filter((b) => b !== badge) : [...f.badges, badge],
    }));

  const totalSizeStock = sizes.reduce((sum, s) => sum + (isWholeNumber(s.stock) ? Number(s.stock) : 0), 0);

  // ---- validation + submit ----
  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Enter the product name.';
    if (!(Number(form.price) > 0)) e.price = 'Enter a price greater than 0.';
    if (form.originalPrice !== '' && !(Number(form.originalPrice) > Number(form.price))) {
      e.originalPrice = 'M.R.P. must be higher than the price (or leave it empty).';
    }
    if (!form.category) e.category = 'Choose a category.';
    if (form.description.trim().length < 10) e.description = 'Write a description (at least 10 characters).';

    if (form.hasSizes) {
      if (sizes.length === 0) e.sizes = 'Select at least one size.';
      else if (sizes.some((s) => !isWholeNumber(s.stock))) e.sizes = 'Enter a whole-number stock for every size.';
    } else if (!isWholeNumber(form.stock)) {
      e.stock = 'Enter the stock quantity (0 or more).';
    }

    IMAGE_ANGLES.forEach(({ key, label }) => {
      if (!images[key].file && !images[key].url) e[`image_${key}`] = `Add the ${label.toLowerCase()} photo.`;
    });
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (saving) return; // no duplicate submissions
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      showToast('Please fix the highlighted fields', 'error');
      return;
    }

    const data = new FormData();
    data.append('name', form.name.trim());
    data.append('price', form.price);
    if (form.originalPrice !== '') data.append('originalPrice', form.originalPrice);
    data.append('brand', form.brand.trim());
    data.append('category', form.category);
    data.append('description', form.description.trim());
    data.append('hasSizes', String(form.hasSizes));
    if (form.hasSizes) {
      data.append('sizes', JSON.stringify(sizes.map((s) => ({ label: s.label, stock: Number(s.stock) }))));
    } else {
      data.append('stock', form.stock);
    }
    data.append('badges', JSON.stringify(form.badges));
    IMAGE_ANGLES.forEach(({ key }) => {
      if (images[key].file) data.append(key, images[key].file);
    });

    setSaving(true);
    try {
      if (editing) await adminService.updateProduct(id, data);
      else await adminService.createProduct(data);
      showToast(editing ? 'Product updated' : 'Product added');
      navigate('/admin/products');
    } catch (err) {
      if (Array.isArray(err.details)) {
        const map = {};
        err.details.forEach((d) => {
          map[d.field] = d.message;
        });
        setErrors(map);
      }
      showToast(err.message, 'error');
      setSaving(false);
    }
  };

  const err = (name) => (errors[name] ? <div className="field-error">{errors[name]}</div> : null);
  const bad = (name) => (errors[name] ? 'has-error' : '');

  if (loading) {
    return <div className="loading-block"><i className="fas fa-spinner fa-spin"></i></div>;
  }
  if (loadError) {
    return (
      <div className="admin-card">
        <div className="form-alert">{loadError}</div>
        <Link to="/admin/products" className="btn btn-outline">Back to products</Link>
      </div>
    );
  }

  return (
    <>
      <div className="admin-title-row">
        <h1 className="admin-title">{editing ? 'Edit Product' : 'Add Product'}</h1>
        <Link to="/admin/products" className="btn btn-outline">Cancel</Link>
      </div>

      <form onSubmit={submit} noValidate>
        <fieldset disabled={saving} className="admin-fieldset">
          <div className="admin-card">
            <h2 className="admin-h2">Basic details</h2>
            <div className="form-group">
              <label htmlFor="pf-name">Product name *</label>
              <input id="pf-name" className={bad('name')} type="text" maxLength={150} value={form.name} onChange={setField('name')} />
              {err('name')}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pf-price">Price (₹) *</label>
                <input id="pf-price" className={bad('price')} type="number" min="1" step="1" value={form.price} onChange={setField('price')} />
                {err('price')}
              </div>
              <div className="form-group">
                <label htmlFor="pf-mrp">M.R.P. (₹) <span className="text-muted">optional, shown struck through</span></label>
                <input id="pf-mrp" className={bad('originalPrice')} type="number" min="1" step="1" value={form.originalPrice} onChange={setField('originalPrice')} />
                {err('originalPrice')}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pf-category">Category *</label>
                <select id="pf-category" className={bad('category')} value={form.category} onChange={setField('category')}>
                  <option value="">Choose a category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                {err('category')}
              </div>
              <div className="form-group">
                <label htmlFor="pf-brand">Brand <span className="text-muted">optional</span></label>
                <input id="pf-brand" type="text" maxLength={60} value={form.brand} onChange={setField('brand')} />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="pf-desc">Description *</label>
              <textarea id="pf-desc" className={bad('description')} rows="5" maxLength={4000} value={form.description} onChange={setField('description')} />
              {err('description')}
            </div>
          </div>

          <div className="admin-card">
            <h2 className="admin-h2">Photos (four angles) *</h2>
            <p className="text-muted">JPG, PNG or WebP, up to 5 MB each. The front photo is the main image on product cards.</p>
            <div className="image-slots">
              {IMAGE_ANGLES.map(({ key, label }) => {
                const slot = images[key];
                const src = slot.preview || slot.url;
                return (
                  <div className="image-slot" key={key}>
                    <div className="image-slot-label">{label}</div>
                    <div className={`image-slot-box ${errors[`image_${key}`] ? 'has-error' : ''}`}>
                      {src ? <img src={src} alt={`${label} preview`} /> : <i className="fas fa-image"></i>}
                    </div>
                    <label className="btn btn-outline image-slot-btn">
                      {src ? 'Replace image' : 'Choose image'}
                      <input
                        type="file"
                        accept={ALLOWED_IMAGE_TYPES.join(',')}
                        hidden
                        onChange={(e) => {
                          pickImage(key, e.target.files[0]);
                          e.target.value = ''; // allow re-picking the same file
                        }}
                      />
                    </label>
                    {slot.file && <div className="text-muted image-slot-name">{slot.file.name}</div>}
                    {err(`image_${key}`)}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="admin-card">
            <h2 className="admin-h2">Sizes and stock</h2>
            <label className="check-row">
              <input
                type="checkbox"
                checked={form.hasSizes}
                onChange={(e) => setForm((f) => ({ ...f, hasSizes: e.target.checked }))}
              />
              This product comes in multiple sizes
            </label>

            {!form.hasSizes ? (
              <div className="form-group" style={{ maxWidth: 240, marginTop: 15 }}>
                <label htmlFor="pf-stock">Stock quantity *</label>
                <input id="pf-stock" className={bad('stock')} type="number" min="0" step="1" value={form.stock} onChange={setField('stock')} />
                {err('stock')}
              </div>
            ) : (
              <div className="sizes-editor">
                <div className="form-row" style={{ alignItems: 'flex-end' }}>
                  <div className="form-group">
                    <label htmlFor="pf-preset">Size type</label>
                    <select id="pf-preset" value={preset} onChange={(e) => setPreset(e.target.value)}>
                      {Object.keys(SIZE_PRESETS).map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="pf-custom">Add a custom size</label>
                    <div className="inline-add">
                      <input
                        id="pf-custom"
                        type="text"
                        maxLength={10}
                        value={customSize}
                        placeholder="e.g. 3XL or Free"
                        onChange={(e) => setCustomSize(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomSize();
                          }
                        }}
                      />
                      <button type="button" className="btn btn-outline" onClick={addCustomSize}>Add</button>
                    </div>
                  </div>
                </div>

                <div className="chip-row chip-row-lg">
                  {SIZE_PRESETS[preset].map((label) => (
                    <button
                      key={label}
                      type="button"
                      className={`size-option ${hasSize(label) ? 'active' : ''}`}
                      onClick={() => toggleSize(label)}
                      aria-pressed={hasSize(label)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {err('sizes')}

                {sizes.length > 0 && (
                  <table className="admin-table size-stock-table">
                    <thead>
                      <tr><th>Size</th><th>Stock</th><th></th></tr>
                    </thead>
                    <tbody>
                      {sizes.map((s) => (
                        <tr key={s.label}>
                          <td><strong>{s.label}</strong></td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              aria-label={`Stock for size ${s.label}`}
                              value={s.stock}
                              onChange={(e) => setSizeStock(s.label, e.target.value)}
                            />
                          </td>
                          <td>
                            <button type="button" className="btn btn-outline" onClick={() => toggleSize(s.label)}>Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr><td>Total</td><td colSpan="2"><strong>{totalSizeStock}</strong></td></tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}
          </div>

          <div className="admin-card">
            <h2 className="admin-h2">Badges</h2>
            <p className="text-muted">Optional. Shown on the product card and product page.</p>
            <div className="chip-row chip-row-lg">
              {BADGES.map((b) => (
                <label key={b} className={`badge-check ${form.badges.includes(b) ? 'active' : ''}`}>
                  <input type="checkbox" checked={form.badges.includes(b)} onChange={() => toggleBadge(b)} hidden />
                  {b}
                </label>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <><i className="fas fa-spinner fa-spin"></i> Saving…</>
              ) : editing ? 'Save changes' : 'Add product'}
            </button>
            <Link to="/admin/products" className="btn btn-outline">Cancel</Link>
          </div>
        </fieldset>
      </form>
    </>
  );
}
