import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const link = ({ isActive }) => (isActive ? 'active' : '');

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          RajAppliences<span>.in</span>
          <small>Admin</small>
        </div>
        <nav>
          <NavLink to="/admin" end className={link}>
            <i className="fas fa-chart-line"></i> Dashboard
          </NavLink>
          <NavLink to="/admin/products" className={link}>
            <i className="fas fa-box"></i> Products
          </NavLink>
          <NavLink to="/admin/orders" className={link}>
            <i className="fas fa-receipt"></i> Orders
          </NavLink>
        </nav>
        <a className="admin-storefront-link" href="/" target="_blank" rel="noreferrer">
          <i className="fas fa-store"></i> View store
        </a>
      </aside>

      <div className="admin-main">
        <div className="admin-topbar">
          <span className="text-muted">{admin?.email}</span>
          <button className="btn btn-outline" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i> Log out
          </button>
        </div>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
