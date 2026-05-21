// import React, { useState } from 'react';
// import Link from 'next/link';
// import { useRouter } from 'next/router';
// import { motion, AnimatePresence } from 'framer-motion';

// const Sidebar = ({ isOpen, setIsOpen }) => {
//   const router = useRouter();

//   const isFarmRoute = ["/tkp", "/tdr"].includes(router.pathname);

//   const isCoreRoute = [
//     "/profile",
//     "/users",
//     "/tkp",
//     "/tdr",
//     "/animals",
//     "/crossing",
//     "/purchase",
//     "/sale",
//     "/shed"
//   ].includes(router.pathname);

//   const [coreOpen, setCoreOpen] = useState(isCoreRoute);
//   const [farmOpen, setFarmOpen] = useState(isFarmRoute);

//   const activeStyle = "bg-[#f3f6fb] border-[#1e3a5f] text-[#1e3a5f]";
//   const normalStyle = "border-transparent hover:bg-gray-100";

//   return (
//     <>
//       {/* OVERLAY (MOBILE) */}
//       {isOpen && (
//         <div
//           className="fixed inset-0 bg-black/40 z-[100] md:hidden"
//           onClick={() => setIsOpen(false)}
//         />
//       )}

//       {/* SIDEBAR */}
//       <nav
//         className={`
//           fixed top-0 left-0 h-screen w-64 bg-white text-gray-800 p-6 shadow-xl border-r border-gray-200
//           overflow-y-auto z-[110] transform transition-transform duration-300
//           ${isOpen ? "translate-x-0" : "-translate-x-full"}
//           md:translate-x-0
//         `}
//       >
//         {/* MOBILE HEADER */}
//         <div className="flex justify-between items-center mb-6 md:hidden">
//           <span className="text-lg font-bold text-[#1e3a5f]">Menu</span>
//           <button
//             onClick={() => setIsOpen(false)}
//             className="text-gray-800 text-xl font-bold"
//           >
//             ✕
//           </button>
//         </div>

//         <h3 className="text-3xl font-extrabold mb-10 tracking-wide text-[#1e3a5f]">
//           AGASTHYA
//         </h3>

//         <ul className="space-y-2">

//           <li>
//             <motion.div whileHover={{ scale: 1.03, x: 5 }}>
//               <Link href="/dashboard" onClick={() => setIsOpen(false)}
//                 className={`block p-2 rounded border-l-4 ${router.pathname === "/dashboard" ? activeStyle : normalStyle}`}>
//                 📊 Dashboard
//               </Link>
//             </motion.div>
//           </li>

//           <li className="mt-6">
//             <button
//               onClick={() => setCoreOpen(!coreOpen)}
//               className="w-full flex justify-between items-center text-gray-700 text-[15px] uppercase font-black px-2 py-2"
//             >
//               <span>Core Modules</span>
//               <motion.span animate={{ rotate: coreOpen ? 180 : 0 }}>
//                 ▼
//               </motion.span>
//             </button>

//             <AnimatePresence>
//               {coreOpen && (
//                 <motion.ul
//                   initial={{ height: 0 }}
//                   animate={{ height: "auto" }}
//                   exit={{ height: 0 }}
//                   className="mt-2 space-y-2 pl-2 overflow-hidden"
//                 >
//                   <li>
//                     <Link href="/profile" onClick={() => setIsOpen(false)}
//                       className={`block p-2 rounded border-l-4 ${
//                         router.pathname === "/profile" ? activeStyle : normalStyle
//                       }`}>
//                       👤 Profile
//                     </Link>
//                   </li>

//                   <li>
//                     <Link href="/users" onClick={() => setIsOpen(false)}
//                       className={`block p-2 rounded border-l-4 ${
//                         router.pathname === "/users" ? activeStyle : normalStyle
//                       }`}>
//                       👥 User Management
//                     </Link>
//                   </li>

//                   <li>
                    // <button
                    //   onClick={() => setFarmOpen(!farmOpen)}
                    //   className="w-full flex justify-between items-center text-gray-600 text-[10px] uppercase font-black px-2 py-2"
                    // >
                    //   <span>Farm Management</span>
                    //   <motion.span animate={{ rotate: farmOpen ? 180 : 0 }}>
                    //     ▼
                    //   </motion.span>
                    // </button>

//                     <AnimatePresence>
//                       {farmOpen && (
//                         <motion.ul className="mt-2 space-y-2 pl-2">
//                           <li>
//                             <Link href="/tkp" onClick={() => setIsOpen(false)}
//                               className={`block p-2 rounded border-l-4 ${
//                                 router.pathname === "/tkp" ? activeStyle : normalStyle
//                               }`}>
//                               🏠 TKP Farm
//                             </Link>
//                           </li>

//                           <li>
//                             <Link href="/tdr" onClick={() => setIsOpen(false)}
//                               className={`block p-2 rounded border-l-4 ${
//                                 router.pathname === "/tdr" ? activeStyle : normalStyle
//                               }`}>
//                               🏡 TDR Farm
//                             </Link>
//                           </li>
//                         </motion.ul>
//                       )}
//                     </AnimatePresence>
//                   </li>

//                   <li className="mt-2 text-gray-500 text-[10px] uppercase font-black">
//                     Inventory
//                   </li>

//                   <li>
//                     <Link href="/animals" onClick={() => setIsOpen(false)}
//                       className={`block p-2 rounded border-l-4 ${
//                         ["/animals", "/crossing", "/purchase", "/sale", "/shed"].includes(router.pathname)
//                           ? activeStyle
//                           : normalStyle
//                       }`}>
//                       🐄 Animal Details
//                     </Link>
//                   </li>

//                 </motion.ul>
//               )}
//             </AnimatePresence>
//           </li>

//         </ul>
//       </nav>
//     </>
//   );
// };

// export default Sidebar;






import React, { useState, useEffect } from 'react'; // ✅ added useEffect
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const router = useRouter();

  const isFarmRoute = ["/tkp", "/tdr"].includes(router.pathname);

  const isCoreRoute = [
    "/profile",
    "/users",
    "/tkp",
    "/tdr",
    "/animals",
    "/crossing",
    "/purchase",
    "/sale",
    "/shed"
  ].includes(router.pathname);

  const [coreOpen, setCoreOpen] = useState(isCoreRoute);
  const [farmOpen, setFarmOpen] = useState(isFarmRoute);

  // const activeStyle = "bg-[#f3f6fb] border-[#1e3a5f] text-[#1e3a5f]";
  // const normalStyle = "border-transparent hover:bg-gray-100";

const activeStyle = "bg-[#D1867D]/10 border-[#D1867D] text-[#16223F] font-extrabold transition-all duration-200";

const normalStyle = "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:shadow-sm hover:translate-x-1 transition-all duration-200 cursor-pointer";


  // ✅ SCROLL LOCK ADDED
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  return (
    <>
      {/* OVERLAY (MOBILE) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[100] md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <nav
        className={`
          fixed top-0 left-0 h-screen w-64 bg-white text-gray-800 p-6 shadow-xl border-r border-gray-200
          overflow-y-auto z-[110]
          transform transition-transform duration-300 ease-in-out  /* ✅ smoother */
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {/* MOBILE HEADER */}
        <div className="flex justify-between items-center mb-6 md:hidden">
          <span className="text-lg font-bold text-[#16223F]">Menu</span>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-800 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* BRAND LOGO HEADER */}
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 border border-slate-100 shadow-sm">
            <img
              src="/LOGO.png"
              alt="logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-[#16223F] text-[16px] leading-none mb-0.5">AGASTHYA</span>
            <span className="font-black text-[9px] text-[#D1867D] uppercase tracking-widest leading-none">Nutro Milk</span>
          </div>
        </div>

        <ul className="space-y-2">

          <li>
            <motion.div whileHover={{ scale: 1.03, x: 5 }}>
              <Link href="/dashboard" onClick={() => setIsOpen(false)}
                className={`block p-2 rounded border-l-4 ${router.pathname === "/dashboard" ? activeStyle : normalStyle}`}>
                📊 Dashboard
              </Link>
            </motion.div>
          </li>

          <li className="mt-6">
            <button
              onClick={() => setCoreOpen(!coreOpen)}
              className="w-full flex justify-between items-center text-gray-700 text-[15px] uppercase font-black px-2 py-2"
            >
              <span>Core Modules</span>
              <motion.span animate={{ rotate: coreOpen ? 180 : 0 }}>
                ▼
              </motion.span>
            </button>

            <AnimatePresence>
              {coreOpen && (
                <motion.ul
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="mt-2 space-y-2 pl-2 overflow-hidden"
                >
                  <li>
                    <Link href="/profile" onClick={() => setIsOpen(false)}
                      className={`block p-2 rounded border-l-4 ${
                        router.pathname === "/profile" ? activeStyle : normalStyle
                      }`}>
                      👤 Profile
                    </Link>
                  </li>

                  <li>
                    <Link href="/users" onClick={() => setIsOpen(false)}
                      className={`block p-2 rounded border-l-4 ${
                        router.pathname === "/users" ? activeStyle : normalStyle
                      }`}>
                      👥 User Management
                    </Link>
                  </li>

                  <li>
                    <button
                      onClick={() => setFarmOpen(!farmOpen)}
                      className="w-full flex justify-between items-center text-gray-600 text-[10px] uppercase font-black px-2 py-2"
                    >
                      <span>Farm Management</span>
                      <motion.span animate={{ rotate: farmOpen ? 180 : 0 }}>
                        ▼
                      </motion.span>
                    </button>

                    <AnimatePresence>
  {farmOpen && (
    <motion.ul
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="mt-2 space-y-2 pl-2 overflow-hidden"
    >
      <li>
        <Link href="/tkp" onClick={() => setIsOpen(false)}
          className={`block p-2 rounded border-l-4 ${
            router.pathname === "/tkp" ? activeStyle : normalStyle
          }`}>
          🏠 TKP Farm
        </Link>
      </li>

      <li>
        <Link href="/tdr" onClick={() => setIsOpen(false)}
          className={`block p-2 rounded border-l-4 ${
            router.pathname === "/tdr" ? activeStyle : normalStyle
          }`}>
          🏡 TDR Farm
        </Link>
      </li>
    </motion.ul>
  )}
</AnimatePresence>
                  </li>

                  <li className="mt-2 text-gray-500 text-[10px] uppercase font-black">
                    Inventory
                  </li>

                  <li>
                    <Link href="/animals" onClick={() => setIsOpen(false)}
                      className={`block p-2 rounded border-l-4 ${
                        ["/animals", "/crossing", "/purchase", "/sale", "/shed"].includes(router.pathname)
                          ? activeStyle
                          : normalStyle
                      }`}>
                      🐄 Animal Details
                    </Link>
                  </li>

                </motion.ul>
              )}
            </AnimatePresence>
          </li>

        </ul>
      </nav>
    </>
  );
};

export default Sidebar;