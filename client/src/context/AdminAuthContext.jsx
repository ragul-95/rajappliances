import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { adminService } from '../services';

const AdminAuthContext = createContext(null);

// Completely separate from customer login: different endpoint, different cookie.
export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    adminService
      .me()
      .then((a) => !cancelled && setAdmin(a))
      .catch(() => !cancelled && setAdmin(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const a = await adminService.login({ email, password });
    setAdmin(a);
    return a;
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminService.logout();
    } finally {
      setAdmin(null);
    }
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>{children}</AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => useContext(AdminAuthContext);
