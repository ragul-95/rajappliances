import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

// Header + page + footer, used by every normal storefront page.
export default function StoreLayout() {
  const { pathname } = useLocation();

  // Start each new page at the top (like a normal multi-page site).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  );
}
