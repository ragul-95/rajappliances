import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { productService } from '../services';
import { useToast } from './ToastContext';

const WishlistContext = createContext(null);
const STORAGE_KEY = 'rajappliences_wishlist';

function loadIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(ids) ? ids.map(String) : [];
  } catch {
    return [];
  }
}

// The wishlist stores only product IDs in the browser.
// Names, prices and images are always fetched fresh from the server.
export function WishlistProvider({ children }) {
  const { showToast } = useToast();
  const [ids, setIds] = useState(loadIds);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* storage unavailable: wishlist just won't persist */
    }
  }, [ids]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    productService
      .byIds(ids)
      .then((list) => {
        if (cancelled) return;
        // Keep the order the user added them in; drop products that no longer exist.
        const byId = new Map(list.map((p) => [p._id, p]));
        setProducts(ids.map((id) => byId.get(id)).filter(Boolean));
      })
      .catch(() => !cancelled && setProducts([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const has = useCallback((id) => ids.includes(String(id)), [ids]);

  const toggle = useCallback(
    (product) => {
      const id = String(product._id);
      if (ids.includes(id)) {
        setIds((list) => list.filter((x) => x !== id));
        showToast('Item removed from wishlist');
        return false;
      }
      setIds((list) => [...list, id]);
      showToast(`${product.name} added to wishlist`);
      return true;
    },
    [ids, showToast]
  );

  return (
    <WishlistContext.Provider value={{ ids, products, loading, count: ids.length, has, toggle }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
