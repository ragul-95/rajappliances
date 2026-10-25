import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { productService } from '../services';
import { MAX_QTY_PER_LINE } from '../constants';
import { useToast } from './ToastContext';

const CartContext = createContext(null);
const STORAGE_KEY = 'rajappliences_cart';

// A cart line is only { productId, size, quantity }. Prices are NEVER stored
// in the browser: they are looked up from the server, and the server
// recalculates everything again when the order is placed.
function loadLines() {
  try {
    const lines = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(lines) ? lines : [];
  } catch {
    return [];
  }
}

const sameLine = (a, b) => a.productId === b.productId && (a.size || null) === (b.size || null);

// How many units of this product (and size) can be bought right now.
export function availableStock(product, size) {
  if (!product) return 0;
  if (product.hasSizes) {
    const s = (product.sizes || []).find((x) => x.label === size);
    return s ? s.stock : 0;
  }
  return product.stock;
}

export function CartProvider({ children }) {
  const { showToast } = useToast();
  const [lines, setLines] = useState(loadLines);
  const [products, setProducts] = useState({}); // productId -> product (fresh from server)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines]);

  // Fetch current product details whenever the set of products in the cart changes.
  const idKey = [...new Set(lines.map((l) => l.productId))].sort().join(',');
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const ids = idKey ? idKey.split(',') : [];
    setLoading(true);
    productService
      .byIds(ids)
      .then((list) => !cancelled && setProducts(Object.fromEntries(list.map((p) => [p._id, p]))))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [idKey, refreshTick]);

  // Lines joined with live product data. "problem" explains why a line can't be bought.
  const items = useMemo(
    () =>
      lines.map((line) => {
        const product = products[line.productId] || null;
        let problem = null;
        if (!loading && !product) problem = 'This product is no longer available.';
        else if (product) {
          const stock = availableStock(product, line.size);
          if (product.hasSizes && !line.size) problem = 'Please choose a size.';
          else if (stock === 0) problem = 'Out of stock.';
          else if (line.quantity > stock) problem = `Only ${stock} left.`;
        }
        return { ...line, product, problem };
      }),
    [lines, products, loading]
  );

  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + (i.product ? i.product.price * i.quantity : 0), 0);
  const deliveryFee = 0; // free delivery on every order
  const total = subtotal + deliveryFee;
  const hasProblems = items.some((i) => i.problem);

  const add = useCallback(
    (product, size = null, quantity = 1) => {
      if (product.hasSizes && !size) {
        showToast('Please select a size', 'error');
        return false;
      }
      const stock = availableStock(product, size);
      if (stock < 1) {
        showToast('Sorry, this item is out of stock', 'error');
        return false;
      }
      const line = { productId: product._id, size: product.hasSizes ? size : null };
      const existing = lines.find((l) => sameLine(l, line));
      const wanted = (existing ? existing.quantity : 0) + quantity;
      const capped = Math.min(wanted, stock, MAX_QTY_PER_LINE);
      if (capped < wanted) showToast(`Only ${capped} available for this item`, 'error');
      setProducts((p) => ({ ...p, [product._id]: product }));
      setLines((list) =>
        existing
          ? list.map((l) => (sameLine(l, line) ? { ...l, quantity: capped } : l))
          : [...list, { ...line, quantity: capped }]
      );
      showToast(`${product.name} added to cart`);
      return true;
    },
    [lines, showToast]
  );

  const setQuantity = useCallback((line, quantity) => {
    if (quantity < 1) return;
    setLines((list) => list.map((l) => (sameLine(l, line) ? { ...l, quantity: Math.min(quantity, MAX_QTY_PER_LINE) } : l)));
  }, []);

  const remove = useCallback((line) => setLines((list) => list.filter((l) => !sameLine(l, line))), []);
  const clear = useCallback(() => setLines([]), []);
  const refresh = useCallback(() => setRefreshTick((n) => n + 1), []);

  return (
    <CartContext.Provider
      value={{ lines, items, loading, count, subtotal, deliveryFee, total, hasProblems, add, setQuantity, remove, clear, refresh }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
