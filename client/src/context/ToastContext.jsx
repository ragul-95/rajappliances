import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ToastContext = createContext(null);

// Uses the same .toast-container / .toast / .show classes as the original site.
function ToastItem({ toast, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 10);
    const hideTimer = setTimeout(() => setVisible(false), 3000);
    const removeTimer = setTimeout(() => onDone(toast.id), 3300);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onDone]);

  const icon = toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
  return (
    <div className={`toast ${toast.type} ${visible ? 'show' : ''}`} role="status">
      <i className={`fas ${icon}`}></i> <span>{toast.message}</span>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const showToast = useCallback((message, type = 'success') => {
    setToasts((list) => [...list, { id: `${Date.now()}-${Math.random()}`, message, type }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
