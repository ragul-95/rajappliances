import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

// UI guard only. The REAL protection is on the server: every /api/admin/* route
// checks the admin cookie, so hiding this page would not matter to an attacker.
export default function AdminRoute({ children }) {
  const { admin, loading } = useAdminAuth();
  if (loading) {
    return (
      <div className="loading-block">
        <i className="fas fa-spinner fa-spin"></i>
      </div>
    );
  }
  if (!admin) return <Navigate to="/admin/login" replace />;
  return children;
}
