import '@/styles/globals.css';
import Layout from '@/components/Layout';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { clearAuthSession } from '@/utils/api';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // Pages WITHOUT layout
  const noLayoutRoutes = ['/login'];
  const isNoLayout = noLayoutRoutes.includes(router.pathname);

  useEffect(() => {
    if (isNoLayout) return;

    // Check if session token cookie is still present in browser
    const hasTokenCookie = typeof document !== 'undefined' && document.cookie
      .split(';')
      .some((item) => {
        const [name, val] = item.trim().split('=');
        return name === 'token' && Boolean(val);
      });

    const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('isLoggedIn') === 'true';

    // If session cookie is missing (e.g. browser was closed and reopened) or login flag is missing:
    if (!hasTokenCookie || !isLoggedIn) {
      clearAuthSession(true);
    }
  }, [router.pathname, isNoLayout]);

  // Use the layout defined at the page level, if available
  // Otherwise, fallback to the global persistent Layout
  const getLayout = Component.getLayout ?? ((page) => {
    if (isNoLayout) {
      return (
        <div className="bg-white text-black min-h-screen">
          {page}
        </div>
      );
    }
    return (
      <div className="bg-[#f8fafc] text-black min-h-screen">
        <Layout>{page}</Layout>
      </div>
    );
  });

  return getLayout(<Component {...pageProps} />);
}