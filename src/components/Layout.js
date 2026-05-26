import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useState, useEffect } from 'react';

// Secure state hydration helper to prevent dynamic SSR vs Client mismatch
const ClientOnly = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 rounded-full border-4 border-[#16223F]/10 border-t-[#16223F] animate-spin"></div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Hydrating Workspace...
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

const Layout = ({ children }) => {

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hideFooter, setHideFooter] = useState(false);

  useEffect(() => {

    const checkFooterVisibility = () => {

      const shouldHide =
        document.body.classList.contains('hide-mobile-footer');

      setHideFooter(shouldHide);
    };

    checkFooterVisibility();

    const observer = new MutationObserver(checkFooterVisibility);

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();

  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">

      {/* SIDEBAR */}
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
      />

      {/* MAIN */}
      <main className={`flex-1 flex flex-col h-screen overflow-hidden w-full transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>

        {/* HEADER */}
        <div className={`fixed top-0 right-0 left-0 z-[40] transition-all duration-300 ${sidebarCollapsed ? 'md:left-20' : 'md:left-64'}`}>
          <Header
            toggleSidebar={() => setSidebarOpen(true)}
          />
        </div>

        {/* CONTENT */}
        <div className="pt-24 pb-4 px-4 md:px-8 flex flex-col flex-1 overflow-y-auto">

          <div className="flex-1 flex flex-col">
            <ErrorBoundary>
              <ClientOnly>
                {children}
              </ClientOnly>
            </ErrorBoundary>
          </div>

          {/* FOOTER */}
          {!hideFooter && (
            <div className="flex-none">
              <Footer />
            </div>
          )}

        </div>

      </main>
    </div>
  );
};

export default Layout;