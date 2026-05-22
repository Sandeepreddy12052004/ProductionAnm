// import Sidebar from '@/components/Sidebar';
// import Header from '@/components/Header';
// import Footer from '@/components/Footer';
// import { useState } from 'react';

// const Layout = ({ children }) => {
//   const [sidebarOpen, setSidebarOpen] = useState(false);

//   return (
//     <div className="flex min-h-screen bg-white">

//       {/* SIDEBAR */}
//       <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

//       {/* MAIN */}
//       <main className="flex-1 md:ml-64 w-full">

//         {/* HEADER */}
//         <div className="fixed top-0 right-0 left-0 md:left-64 z-[40]">
//           <Header toggleSidebar={() => setSidebarOpen(true)} />
//         </div>

//         {/* CONTENT */}
//         {/* <div className="pt-16 pb-16 px-3 sm:px-4 md:px-4 flex flex-col min-h-screen"> */}
//         <div className="pt-16 pb-16 px-0 md:px-4 flex flex-col min-h-screen">
//           <div className="flex-grow">
//             {children}
//           </div>
//           <Footer />
//         </div>

//       </main>
//     </div>
//   );
// };

// export default Layout;


import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useState, useEffect } from 'react';

// Secure state hydration helper to prevent dynamic SSR vs Client mismatch
const ClientOnly = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
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
    <div className="flex min-h-screen bg-transparent">

      {/* SIDEBAR */}
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* MAIN */}
      <main className="flex-1 md:ml-64 w-full">

        {/* HEADER */}
        <div className="fixed top-0 right-0 left-0 md:left-64 z-[40]">
          <Header
            toggleSidebar={() => setSidebarOpen(true)}
          />
        </div>

        {/* CONTENT */}
        <div className="pt-16 pb-16 px-0 md:px-4 flex flex-col min-h-screen">

          <div className="flex-grow">
            <ErrorBoundary>
              <ClientOnly>
                {children}
              </ClientOnly>
            </ErrorBoundary>
          </div>

          {/* FOOTER */}
          {!hideFooter && <Footer />}

        </div>

      </main>
    </div>
  );
};

export default Layout;