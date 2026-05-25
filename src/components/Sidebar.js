import React, { useState, useEffect } from 'react'; // ✅ added useEffect
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }) => {
  const router = useRouter();

  const isFarmRoute = router.pathname.startsWith("/farm/[code]");
  const activeFarmCode = router.query.code || "tkp";

  const getTabPath = (tabId) => {
    return `/farm/${activeFarmCode}?tab=${tabId}`;
  };

  const isLinkActive = (path, tabId = null) => {
    if (tabId) {
      // Dynamic route matching
      return router.pathname.startsWith("/farm/[code]") && router.query.tab === tabId;
    }
    // Strict match for standard routes
    return router.pathname === path && !router.query.tab;
  };

  const isCoreRoute = [
    "/profile",
    "/users",
    "/department",
    "/shed",
    "/animals",
    "/farms"
  ].includes(router.pathname) && !router.query.tab;

  const isNormalRoute = ["/animals"].includes(router.pathname) || (isFarmRoute && router.query.tab);

  const isHealthActive = isFarmRoute && ["health", "vaccine"].includes(router.query.tab);
  const isInventoryActive = isFarmRoute && ["feed_inv", "med_inv", "medicine"].includes(router.query.tab);
  const isMilkActive = isFarmRoute && ["milk_prod", "components"].includes(router.query.tab);

  // Dynamic Farms State
  const [farmsList, setFarmsList] = useState([]);
  const [userRole, setUserRole] = useState(null);
  
  // Collapse states
  const [shedOpen, setShedOpen] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUserRole(parsed.role || null);
      }
    } catch (e) {
      console.error("[Sidebar Error] Failed to parse user session:", e);
      localStorage.removeItem("user");
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    import('../utils/api').then(({ api }) => {
      api.farms.getAll().then(res => {
        if (isMounted && res && Array.isArray(res)) setFarmsList(res);
      }).catch(err => console.error("Error fetching farms:", err));
    });
    return () => { isMounted = false; };
  }, []);

  // 1. Initialize dropdowns based on the server-side route to prevent hydration slide-down flicker
  const [coreOpen, setCoreOpen] = useState(isCoreRoute || true);
  const [farmOpen, setFarmOpen] = useState(isFarmRoute && !router.query.tab);
  const [normalOpen, setNormalOpen] = useState(isNormalRoute || false);
  const [healthOpen, setHealthOpen] = useState(isHealthActive);
  const [inventoryOpen, setInventoryOpen] = useState(isInventoryActive);
  const [milkOpen, setMilkOpen] = useState(isMilkActive);

  // 2. Hydrate user preferences from localStorage safely (ONCE on mount)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar_dropdown_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.coreOpen !== undefined) setCoreOpen(parsed.coreOpen);
        if (parsed.farmOpen !== undefined) setFarmOpen(parsed.farmOpen);
        if (parsed.normalOpen !== undefined) setNormalOpen(parsed.normalOpen);
        if (parsed.healthOpen !== undefined) setHealthOpen(parsed.healthOpen);
        if (parsed.inventoryOpen !== undefined) setInventoryOpen(parsed.inventoryOpen);
        if (parsed.milkOpen !== undefined) setMilkOpen(parsed.milkOpen);
      }
    } catch (err) {
      console.error("[Sidebar Error] Failed to parse dropdown state:", err);
      localStorage.removeItem("sidebar_dropdown_state");
    }
  }, []);

  // 2.5 Auto-expand active sections on route change, without collapsing others
  useEffect(() => {
    if (isCoreRoute) setCoreOpen(true);
    if (isFarmRoute && !router.query.tab) setFarmOpen(true);
    if (isNormalRoute) setNormalOpen(true);
    if (isHealthActive) setHealthOpen(true);
    if (isInventoryActive) setInventoryOpen(true);
    if (isMilkActive) setMilkOpen(true);
  }, [router.pathname, router.query.tab, isCoreRoute, isFarmRoute, isNormalRoute, isHealthActive, isInventoryActive, isMilkActive]);

  // 3. Helper to toggle and save
  const toggleState = (setter, key, currentVal) => {
    const newVal = !currentVal;
    setter(newVal);
    try {
      const existing = JSON.parse(localStorage.getItem("sidebar_dropdown_state") || "{}");
      existing[key] = newVal;
      localStorage.setItem("sidebar_dropdown_state", JSON.stringify(existing));
    } catch (e) {
      console.error("[Sidebar Error] Failed to save dropdown state:", e);
    }
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const activeStyle = "bg-[#D1867D]/10 border-[#D1867D] text-[#16223F] font-extrabold transition-all duration-200";
  const normalStyle = "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:shadow-sm hover:translate-x-1 transition-all duration-200 cursor-pointer";

  // Scroll lock for mobile
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

  const handleCloseSidebar = () => {
    if (typeof setIsOpen === 'function') {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* OVERLAY (MOBILE) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[100] md:hidden"
          onClick={handleCloseSidebar}
        />
      )}

      {/* SIDEBAR */}
      <nav
        className={`
          flex-shrink-0 fixed top-0 left-0 h-screen ${isCollapsed ? 'w-20 px-3' : 'w-64 px-6'} bg-white text-gray-800 py-6 shadow-xl border-r border-gray-200
          overflow-y-auto overflow-x-hidden whitespace-nowrap z-[110]
          transform transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        {!mounted ? (
          <div className="flex h-full items-center justify-center opacity-50">
            <span className="text-xs font-bold text-gray-400">Loading...</span>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6 md:hidden">
              <span className="text-lg font-bold text-[#16223F]">Menu</span>
              <button
                onClick={handleCloseSidebar}
                className="text-gray-800 text-xl font-bold"
              >
                ✕
              </button>
            </div>

        {/* BRAND LOGO HEADER */}
        <div className={`flex items-center gap-3.5 mb-8 pb-5 border-b border-slate-100 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-14 h-14 bg-white rounded-2xl flex-shrink-0 flex items-center justify-center p-1.5 border border-slate-100 shadow-sm">
            <img
              src="/LOGO.png"
              alt="logo"
              className="w-full h-full object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-black text-[#16223F] text-[20px] leading-none mb-1 tracking-tight">AGASTHYA</span>
              <span className="font-black text-[11px] text-[#D1867D] uppercase tracking-[0.2em] leading-none">Nutro Milk</span>
            </div>
          )}
        </div>

        {/* DESKTOP TOGGLE BUTTON */}
        <div className="hidden md:flex justify-end mb-4 pr-2">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="bg-gray-50 border border-gray-200 rounded-full p-1.5 shadow-sm text-gray-500 hover:text-[#16223F] hover:bg-gray-100 transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path></svg>
            )}
          </button>
        </div>

        <ul className="space-y-2">
          {/* Dashboard Link */}
          <li>
            <motion.div whileHover={{ scale: 1.02, x: 3 }}>
              <Link href="/dashboard" onClick={handleCloseSidebar}
                className={`block p-2 rounded border-l-4 ${isLinkActive("/dashboard") ? activeStyle : normalStyle}`}>
                📊 Dashboard
              </Link>
            </motion.div>
          </li>

          {/* CORE MODULES GROUP */}
          {userRole && ['SUPER_ADMIN', 'FARM_ADMIN'].includes(userRole) && (
          <li className="mt-4">
            <button
              onClick={() => toggleState(setCoreOpen, 'coreOpen', coreOpen)}
              className="w-full flex justify-between items-center text-gray-700 text-[13px] uppercase font-black px-2 py-2 cursor-pointer hover:bg-slate-50 rounded"
            >
              <span>Core Modules</span>
              <motion.span animate={{ rotate: coreOpen ? 180 : 0 }}>
                ▼
              </motion.span>
            </button>

            <AnimatePresence>
              {coreOpen && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="mt-2 space-y-2 pl-2 overflow-hidden"
                >

                  {userRole === 'SUPER_ADMIN' && (
                    <>
                      <li>
                        <Link href="/users" onClick={handleCloseSidebar}
                          className={`block p-2 rounded border-l-4 ${isLinkActive("/users") ? activeStyle : normalStyle}`}>
                          👥 User Management
                        </Link>
                      </li>

                      <li>
                        <Link href="/department" onClick={handleCloseSidebar}
                          className={`block p-2 rounded border-l-4 ${isLinkActive("/department") ? activeStyle : normalStyle}`}>
                          🏢 Department
                        </Link>
                      </li>
                    </>
                  )}

                  {/* Farm Management Collapsible Dropdown */}
                  <li>
                    <button
                      onClick={() => toggleState(setFarmOpen, 'farmOpen', farmOpen)}
                      className="w-full flex justify-between items-center text-gray-600 text-[11px] uppercase font-bold px-2 py-2 cursor-pointer hover:bg-slate-50 rounded"
                    >
                      <span>🏠 Farm Management</span>
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
                          className="mt-1 space-y-1 pl-3 overflow-hidden"
                        >
                          {farmsList.map((farm) => (
                            <li key={farm.code}>
                              <Link href={`/farm/${farm.code.toLowerCase()}`} onClick={handleCloseSidebar}
                                className={`block p-1.5 text-sm rounded border-l-4 ${
                                  router.asPath.includes(`/farm/${farm.code.toLowerCase()}`) && !router.query.tab ? activeStyle : normalStyle
                                }`}>
                                🏠 {farm.name}
                              </Link>
                            </li>
                          ))}
                          
                          <li className="mt-2 border-t border-slate-200 pt-2">
                            <Link href="/farms" onClick={handleCloseSidebar}
                              className={`block p-1.5 text-sm rounded border-l-4 ${
                                router.pathname === "/farms" ? activeStyle : normalStyle
                              }`}>
                              ⚙️ Manage Farms
                            </Link>
                          </li>
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </li>

                  {/* SHED OPERATIONS DROPDOWN */}
                  <li className="mt-2 border-t border-slate-200 pt-2">
                    <button
                      onClick={() => toggleState(setShedOpen, 'shedOpen', shedOpen)}
                      className="w-full flex justify-between items-center text-gray-600 text-[11px] uppercase font-bold px-2 py-2 cursor-pointer hover:bg-slate-50 rounded"
                    >
                      <span>🪵 Shed Operations</span>
                      <motion.span animate={{ rotate: shedOpen ? 180 : 0 }}>
                        ▼
                      </motion.span>
                    </button>

                    <AnimatePresence>
                      {shedOpen && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="mt-1 space-y-1 pl-3 overflow-hidden"
                        >
                          <li>
                            <Link href="/shed" onClick={handleCloseSidebar}
                              className={`block p-1.5 text-sm rounded border-l-4 ${
                                router.pathname === "/shed" ? activeStyle : normalStyle
                              }`}>
                              📝 Shed Log
                            </Link>
                          </li>
                          <li>
                            <Link href="/shed-management" onClick={handleCloseSidebar}
                              className={`block p-1.5 text-sm rounded border-l-4 ${
                                router.pathname === "/shed-management" ? activeStyle : normalStyle
                              }`}>
                              ⚙️ Shed Management
                            </Link>
                          </li>
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </li>

                  <li>
                    <Link href="/animals" onClick={handleCloseSidebar}
                      className={`block p-2 rounded border-l-4 ${isLinkActive("/animals") ? activeStyle : normalStyle}`}>
                      🐄 Cattle Management
                    </Link>
                  </li>
                </motion.ul>
              )}
            </AnimatePresence>
          </li>
          )}

          {/* NORMAL MODULES GROUP */}
          <li className="mt-4 border-t border-slate-100 pt-4">
            <button
              onClick={() => toggleState(setNormalOpen, 'normalOpen', normalOpen)}
              className="w-full flex justify-between items-center text-gray-700 text-[13px] uppercase font-black px-2 py-2 cursor-pointer hover:bg-slate-50 rounded"
            >
              <span>Modules</span>
              <motion.span animate={{ rotate: normalOpen ? 180 : 0 }}>
                ▼
              </motion.span>
            </button>

            <AnimatePresence>
              {normalOpen && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="mt-2 space-y-2 pl-2 overflow-hidden"
                >
                  {/* Live Stock */}
                  <li>
                    <Link href="/animals" onClick={handleCloseSidebar}
                      className={`block p-2 rounded border-l-4 ${isLinkActive("/animals") ? activeStyle : normalStyle}`}>
                      🐄 Live Stock
                    </Link>
                  </li>

                  {/* Health Dropdown */}
                  <li>
                    <button
                      onClick={() => toggleState(setHealthOpen, 'healthOpen', healthOpen)}
                      className="w-full flex justify-between items-center text-gray-600 text-[11px] uppercase font-bold px-2 py-2 cursor-pointer hover:bg-slate-50 rounded"
                    >
                      <span>🩺 Health</span>
                      <motion.span animate={{ rotate: healthOpen ? 180 : 0 }}>
                        ▼
                      </motion.span>
                    </button>

                    <AnimatePresence>
                      {healthOpen && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="mt-1 space-y-1 pl-3 overflow-hidden"
                        >
                          <li>
                            <Link href={getTabPath("health")} onClick={handleCloseSidebar}
                              className={`block p-1.5 text-sm rounded border-l-4 ${
                                isLinkActive("/farm", "health") ? activeStyle : normalStyle
                              }`}>
                              📋 Treatment Log
                            </Link>
                          </li>
                          <li>
                            <Link href={getTabPath("vaccine")} onClick={handleCloseSidebar}
                              className={`block p-1.5 text-sm rounded border-l-4 ${
                                isLinkActive("/farm", "vaccine") ? activeStyle : normalStyle
                              }`}>
                              💉 Vaccination Log
                            </Link>
                          </li>
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </li>

                  {/* Inventory Dropdown */}
                  <li>
                    <button
                      onClick={() => toggleState(setInventoryOpen, 'inventoryOpen', inventoryOpen)}
                      className="w-full flex justify-between items-center text-gray-600 text-[11px] uppercase font-bold px-2 py-2 cursor-pointer hover:bg-slate-50 rounded"
                    >
                      <span>📦 Inventory</span>
                      <motion.span animate={{ rotate: inventoryOpen ? 180 : 0 }}>
                        ▼
                      </motion.span>
                    </button>

                    <AnimatePresence>
                      {inventoryOpen && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="mt-1 space-y-1 pl-3 overflow-hidden"
                        >
                          <li>
                            <Link href={getTabPath("feed_inv")} onClick={handleCloseSidebar}
                              className={`block p-1.5 text-sm rounded border-l-4 ${
                                isLinkActive("/farm", "feed_inv") ? activeStyle : normalStyle
                              }`}>
                              🌾 Feed Inventory
                            </Link>
                          </li>
                          <li>
                            <Link href={getTabPath("med_inv")} onClick={handleCloseSidebar}
                              className={`block p-1.5 text-sm rounded border-l-4 ${
                                isLinkActive("/farm", "med_inv") ? activeStyle : normalStyle
                              }`}>
                              💊 Medicine Inventory
                            </Link>
                          </li>
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </li>

                  {/* Grass Collection */}
                  <li>
                    <Link href={getTabPath("grass")} onClick={handleCloseSidebar}
                      className={`block p-2 rounded border-l-4 ${
                        isLinkActive("/farm", "grass") ? activeStyle : normalStyle
                      }`}>
                      🌿 Grass Collection
                    </Link>
                  </li>

                  {/* Daily Feeding */}
                  <li>
                    <Link href={getTabPath("feeding")} onClick={handleCloseSidebar}
                      className={`block p-2 rounded border-l-4 ${
                        isLinkActive("/farm", "feeding") ? activeStyle : normalStyle
                      }`}>
                      🌾 Daily Feeding
                    </Link>
                  </li>

                  {/* Milk Production Dropdown */}
                  <li>
                    <button
                      onClick={() => toggleState(setMilkOpen, 'milkOpen', milkOpen)}
                      className="w-full flex justify-between items-center text-gray-600 text-[11px] uppercase font-bold px-2 py-2 cursor-pointer hover:bg-slate-50 rounded"
                    >
                      <span>🥛 Milk Production</span>
                      <motion.span animate={{ rotate: milkOpen ? 180 : 0 }}>
                        ▼
                      </motion.span>
                    </button>

                    <AnimatePresence>
                      {milkOpen && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="mt-1 space-y-1 pl-3 overflow-hidden"
                        >
                          <li>
                            <Link href={getTabPath("milk_prod")} onClick={handleCloseSidebar}
                              className={`block p-1.5 text-sm rounded border-l-4 ${
                                isLinkActive("/farm", "milk_prod") ? activeStyle : normalStyle
                              }`}>
                              🥛 Daily Milk Collection
                            </Link>
                          </li>
                          <li>
                            <Link href={getTabPath("components")} onClick={handleCloseSidebar}
                              className={`block p-1.5 text-sm rounded border-l-4 ${
                                isLinkActive("/farm", "components") ? activeStyle : normalStyle
                              }`}>
                              🔬 Milk Q and A
                            </Link>
                          </li>
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </li>
                </motion.ul>
              )}
            </AnimatePresence>
          </li>
        </ul>
        </>
        )}
      </nav>
    </>
  );
};

export default Sidebar;