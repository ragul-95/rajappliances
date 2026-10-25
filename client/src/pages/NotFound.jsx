import { Link } from 'react-router-dom';
import useTitle from '../hooks/useTitle';

export default function NotFound() {
  useTitle('Page not found - RajAppliences');
  return (
    <main style={{ padding: 20, maxWidth: 1500, margin: '0 auto' }}>
      <div className="empty-state">
        <i className="fas fa-compass"></i>
        <h2>We couldn't find that page</h2>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 15 }}>
          Go Home
        </Link>
      </div>
    </main>
  );
}
