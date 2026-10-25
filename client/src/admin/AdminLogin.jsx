import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import useBodyStyle from '../hooks/useBodyStyle';
import useTitle from '../hooks/useTitle';

export default function AdminLogin() {
  useTitle('Admin Sign In - RajAppliences');
  useBodyStyle('white');

  const { admin, login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (admin) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.status === 429 ? 'Too many attempts. Please wait a few minutes and try again.' : err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <span style={{ fontSize: 28, fontWeight: 'bold', color: 'var(--navy)' }}>
          RajAppliences<span style={{ color: 'var(--orange)', fontSize: 14 }}>.in</span>
        </span>
      </div>
      <main className="auth-page">
        <div className="auth-container">
          <h1>Admin sign in</h1>
          {error && <div className="form-alert" role="alert">{error}</div>}
          <form onSubmit={submit}>
            <div className="form-group">
              <label htmlFor="admin-email">Email</label>
              <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="admin-password">Password</label>
              <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
