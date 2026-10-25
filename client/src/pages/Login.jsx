import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useBodyStyle from '../hooks/useBodyStyle';
import useTitle from '../hooks/useTitle';

// Only allow redirects to pages inside our own site.
function safeRedirect(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export default function Login() {
  useTitle('Sign In - RajAppliences');
  useBodyStyle('white');

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'));
  const { user, login, register } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '' });

  if (user) return <Navigate to={redirect} replace />;

  const switchMode = (next) => (e) => {
    e.preventDefault();
    setError('');
    setMode(next);
  };

  const run = async (action) => {
    if (busy) return; // prevent double submit
    setBusy(true);
    setError('');
    try {
      await action();
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const submitLogin = (e) => {
    e.preventDefault();
    run(() => login(loginForm.email.trim(), loginForm.password));
  };

  const submitRegister = (e) => {
    e.preventDefault();
    run(() => register(regForm.name.trim(), regForm.email.trim(), regForm.password));
  };

  return (
    <>
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <Link to="/" className="logo-container" style={{ display: 'inline-block', color: 'var(--navy)', textDecoration: 'none' }}>
          <span style={{ fontSize: 28, fontWeight: 'bold' }}>
            RajAppliences<span style={{ color: 'var(--orange)', fontSize: 14 }}>.in</span>
          </span>
        </Link>
      </div>

      <main className="auth-page">
        {mode === 'login' ? (
          <div className="auth-container" id="login-section">
            <h1>Sign in</h1>
            {error && <div className="form-alert" role="alert">{error}</div>}
            <form onSubmit={submitLogin}>
              <div className="form-group">
                <label htmlFor="login-email">Email</label>
                <input
                  type="email"
                  id="login-email"
                  autoComplete="email"
                  required
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <input
                  type="password"
                  id="login-password"
                  autoComplete="current-password"
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Signing in…' : 'Continue'}
              </button>
            </form>

            <p style={{ fontSize: 12, marginTop: 15 }}>
              By continuing, you agree to RajAppliences's{' '}
              <a href="#conditions" style={{ color: '#0066c0' }}>Conditions of Use</a> and{' '}
              <a href="#privacy" style={{ color: '#0066c0' }}>Privacy Notice</a>.
            </p>

            <div className="auth-divider"><span>New to RajAppliences?</span></div>

            <button type="button" className="btn btn-outline" style={{ width: '100%' }} onClick={switchMode('register')}>
              Create your RajAppliences account
            </button>
          </div>
        ) : (
          <div className="auth-container" id="register-section">
            <h1>Create Account</h1>
            {error && <div className="form-alert" role="alert">{error}</div>}
            <form onSubmit={submitRegister}>
              <div className="form-group">
                <label htmlFor="reg-name">Your name</label>
                <input
                  type="text"
                  id="reg-name"
                  autoComplete="name"
                  required
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="reg-email">Email</label>
                <input
                  type="email"
                  id="reg-email"
                  autoComplete="email"
                  required
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="reg-password">Password</label>
                <input
                  type="password"
                  id="reg-password"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                />
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Passwords must be at least 6 characters.</p>
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <p style={{ fontSize: 12, marginTop: 15 }}>
              By creating an account, you agree to RajAppliences's{' '}
              <a href="#conditions" style={{ color: '#0066c0' }}>Conditions of Use</a> and{' '}
              <a href="#privacy" style={{ color: '#0066c0' }}>Privacy Notice</a>.
            </p>

            <div style={{ marginTop: 20, fontSize: 13, borderTop: '1px solid var(--border-light)', paddingTop: 15 }}>
              Already have an account?{' '}
              <a href="#login" onClick={switchMode('login')} style={{ color: '#0066c0' }}>
                Sign in <i className="fas fa-caret-right"></i>
              </a>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
