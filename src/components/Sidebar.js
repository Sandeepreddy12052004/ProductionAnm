import React, { useState, useEffect } from 'react'; // ✅ added useEffect
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    "/roles",
    "/shed",
    "/animals",
    "/farms"
  ].includes(router.pathname) && !router.query.tab;

  const isNormalRoute = 
    ["/animals", "/shed", "/crossing", "/purchase", "/sale", "/treatment", "/vaccination"].includes(router.pathname) || 
    (isFarmRoute && router.query.tab);

  const isHealthActive = ["/treatment", "/vaccination"].includes(router.pathname) || (isFarmRoute && ["health", "vaccine"].includes(router.query.tab));
  const isInventoryActive = isFarmRoute && ["feed_inv", "med_inv", "medicine"].includes(router.query.tab);
  const isMilkActive = isFarmRoute && ["milk_prod", "components"].includes(router.query.tab);

  // Dynamic Farms State
  const [farmsList, setFarmsList] = useState([]);
  const [userRole, setUserRole] = useState(null);
  /** @type {Record<string, any> | null} */
  const [userObj, setUserObj] = useState(null);
  
  // Collapse states
  const [shedOpen, setShedOpen] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        /** @type {Record<string, any>} */
        const parsed = JSON.parse(storedUser);
        setUserRole(parsed.role || null);
        setUserObj(parsed);
      }
    } catch (e) {
      console.error("[Sidebar Error] Failed to parse user session:", e);
      localStorage.removeItem("user");
    }
  }, []);

  /**
   * Safe check function to determine if a module should render in the sidebar.
   * Guaranteed never to throw a rendering or hydration error.
   * Supports both string arrays and object arrays defensively.
   * @param {string} moduleKey - Target module name to verify.
   * @returns {boolean}
   */
  const hasAccess = (moduleKey) => {
    if (!userObj) {
      return false;
    }

    // Safely retrieve the role and permissions array from the session
    const role = userObj.role || '';
    const permissions = userObj.permissions;

    // Failsafe for SUPER_ADMIN
    if (role.trim().toUpperCase() === 'SUPER_ADMIN') {
      return true;
    }

    if (!Array.isArray(permissions)) {
      return false;
    }

    // Failsafe check if the permissions array has the global 'ALL' permission
    const hasAllAccess = permissions.some(p => typeof p === 'string' && p.trim().toUpperCase() === 'ALL');
    if (hasAllAccess) {
      return true;
    }

    // Safely find the target permission matching the key
    const permission = permissions.find((p) => {
      if (!p) return false;
      // Case 1: permission is an object with a module_key
      if (typeof p === 'object') {
        return String(p.module_key || '').trim().toLowerCase() === moduleKey.trim().toLowerCase();
      }
      // Case 2: permission is a string (e.g. 'USERS', 'USER_MANAGEMENT_VIEW')
      if (typeof p === 'string') {
        const lowerP = p.trim().toLowerCase();
        const lowerModKey = moduleKey.trim().toLowerCase();
        return lowerP === lowerModKey || 
               lowerP.startsWith(lowerModKey + '_') || 
               lowerP.includes(lowerModKey);
      }
      return false;
    });

    if (!permission) {
      return false;
    }

    // If it's an object, return can_view. If it's a string, it matched, so return true
    if (typeof permission === 'object') {
      return !!permission.can_view;
    }
    return true;
  };

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
          flex-shrink-0 fixed top-0 left-0 h-screen flex flex-col ${isCollapsed ? 'w-20' : 'w-64'} bg-white text-gray-800 shadow-xl border-r border-gray-200
          z-[110] transform transition-all duration-300 ease-in-out
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
            <div className="flex-shrink-0 px-4 pt-6">
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
              <div className={`flex items-center gap-3 mb-6 pb-5 border-b border-slate-100 ${isCollapsed ? 'justify-center' : 'px-2'}`}>
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
      </div>

      {/* SCROLLABLE LINKS */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden whitespace-nowrap px-4 pb-6 custom-scrollbar">
              <ul className="space-y-1.5 px-1">
                {/* Dashboard Link */}
          {hasAccess('dashboard') && (
            <li>
              <motion.div whileHover={{ scale: 1.02, x: 3 }}>
                <Link href="/dashboard" onClick={handleCloseSidebar}
                  className={`block p-2 rounded border-l-4 ${isLinkActive("/dashboard") ? activeStyle : normalStyle}`}>
                  📊 Dashboard
                </Link>
              </motion.div>
            </li>
          )}

          {/* CORE MODULES GROUP */}
          {userRole && (hasAccess('USER_MANAGEMENT') || hasAccess('DEPARTMENT') || hasAccess('ROLES') || hasAccess('FARM_MANAGEMENT') || hasAccess('SHED_MANAGEMENT') || hasAccess('CATTLE_MANAGEMENT')) && (
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

                  {hasAccess('USER_MANAGEMENT') && (
                    <li>
                      <Link href="/users" onClick={handleCloseSidebar}
                        className={`block p-2 rounded border-l-4 ${isLinkActive("/users") ? activeStyle : normalStyle}`}>
                        👥 User Management
                      </Link>
                    </li>
                  )}

                  {hasAccess('DEPARTMENT') && (
                    <li>
                      <Link href="/department" onClick={handleCloseSidebar}
                        className={`block p-2 rounded border-l-4 ${isLinkActive("/department") ? activeStyle : normalStyle}`}>
                        🏢 Department
                      </Link>
                    </li>
                  )}

                  {hasAccess('ROLES') && (
                    <li>
                      <Link href="/roles" onClick={handleCloseSidebar}
                        className={`block p-2 rounded border-l-4 ${isLinkActive("/roles") ? activeStyle : normalStyle}`}>
                        🛡️ Role & Permissions
                      </Link>
                    </li>
                  )}

                  {/* Farm Management Navigation */}
                  {hasAccess('FARM_MANAGEMENT') && (
                    <li>
                      <Link href="/farms" onClick={handleCloseSidebar}
                        className={`block p-2 rounded border-l-4 ${router.pathname.startsWith("/farm") ? activeStyle : normalStyle}`}>
                        🏠 Farm Management
                      </Link>
                    </li>
                  )}

                  {/* SHED MANAGEMENT Navigation */}
                  {hasAccess('SHED_MANAGEMENT') && (
                    <li>
                      <Link href="/shed-management" onClick={handleCloseSidebar}
                        className={`block p-2 rounded border-l-4 ${router.pathname === "/shed-management" ? activeStyle : normalStyle}`}>
                        ⚙️ Shed Management
                      </Link>
                    </li>
                  )}

                  {hasAccess('CATTLE_MANAGEMENT') && (
                    <li>
                      <Link href="/animals" onClick={handleCloseSidebar}
                        className={`block p-2 rounded border-l-4 ${isLinkActive("/animals") ? activeStyle : normalStyle}`}>
                        🐄 Cattle Management
                      </Link>
                    </li>
                  )}
                </motion.ul>
              )}
            </AnimatePresence>
          </li>
          )}

          {/* NORMAL MODULES GROUP */}
          {(hasAccess('LIVESTOCK') || hasAccess('SHED_LOG') || hasAccess('CROSSING_LOG') || hasAccess('PURCHASE_LOG') || hasAccess('SALE_LOG') || hasAccess('HEALTH') || hasAccess('INVENTORY') || hasAccess('GRASS') || hasAccess('FEEDING') || hasAccess('MILK')) && (
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
                  {hasAccess('LIVESTOCK') && (
                    <li>
                      <Link href="/animals" onClick={handleCloseSidebar}
                        className={`block p-2 rounded border-l-4 ${isLinkActive("/animals") ? activeStyle : normalStyle}`}>
                        🐄 Live Stock
                      </Link>
                    </li>
                  )}
 
                  {/* Shed Log */}
                  {hasAccess('SHED_LOG') && (
                    <li>
                      <Link href="/shed" onClick={handleCloseSidebar}
                        className={`block p-2 rounded border-l-4 ${isLinkActive("/shed") ? activeStyle : normalStyle}`}>
                        📝 Shed Log
                      </Link>
                    </li>
                  )}
 
                  {/* Crossing Log */}
                  {hasAccess('CROSSING_LOG') && (
                    <li>
                      <Link href="/crossing" onClick={handleCloseSidebar}
                        className={`block p-2 rounded border-l-4 ${isLinkActive("/crossing") ? activeStyle : normalStyle}`}>
                        🧬 Crossing Log
                      </Link>
                    </li>
                  )}
 
                  {/* Purchase Log */}
                  {hasAccess('PURCHASE_LOG') && (
                    <li>
                      <Link href="/purchase" onClick={handleCloseSidebar}
                        className={`block p-2 rounded border-l-4 ${isLinkActive("/purchase") ? activeStyle : normalStyle}`}>
                        📥 Purchase Log
                      </Link>
                    </li>
                  )}
 
                  {/* Sale Log */}
                  {hasAccess('SALE_LOG') && (
                    <li>
                      <Link href="/sale" onClick={handleCloseSidebar}
                        className={`block p-2 rounded border-l-4 ${isLinkActive("/sale") ? activeStyle : normalStyle}`}>
                        📤 Sale Log
                      </Link>
                    </li>
                  )}
 
 
                  {/* Health Dropdown */}
                  {hasAccess('HEALTH') && (
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
                              <Link href="/treatment" onClick={handleCloseSidebar}
                                className={`block p-1.5 text-sm rounded border-l-4 ${
                                  isLinkActive("/treatment") ? activeStyle : normalStyle
                                }`}>
                                📋 Treatment Log
                              </Link>
                            </li>
                            <li>
                              <Link href="/vaccination" onClick={handleCloseSidebar}
                                className={`block p-1.5 text-sm rounded border-l-4 ${
                                  isLinkActive("/vaccination") ? activeStyle : normalStyle
                                }`}>
                                💉 Vaccination Log
                              </Link>
                            </li>
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </li>
                  )}
 
                  {/* Inventory Dropdown */}
                  {hasAccess('INVENTORY') && (
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
                  )}
 
                  {/* Grass Collection */}
                  {hasAccess('GRASS') && (
                    <li>
                      <Link href={getTabPath("grass")} onClick={handleCloseSidebar}
                        className={`block p-2 rounded border-l-4 ${
                          isLinkActive("/farm", "grass") ? activeStyle : normalStyle
                        }`}>
                        🌿 Grass Collection
                      </Link>
                    </li>
                  )}
 
                  {/* Daily Feeding */}
                  {hasAccess('FEEDING') && (
                    <li>
                      <Link href={getTabPath("feeding")} onClick={handleCloseSidebar}
                        className={`block p-2 rounded border-l-4 ${
                          isLinkActive("/farm", "feeding") ? activeStyle : normalStyle
                        }`}>
                        🌾 Daily Feeding
                      </Link>
                    </li>
                  )}
 
                  {/* Milk Production Dropdown */}
                  {hasAccess('MILK') && (
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
                  )}
                </motion.ul>
              )}
            </AnimatePresence>
          </li>
          )}
        </ul>
            </div>
          </>
        )}
        
        {/* DESKTOP TOGGLE BUTTON (Absolute on the right edge) */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute top-10 -right-3.5 bg-white border border-gray-200 rounded-full p-1 shadow-md text-gray-500 hover:text-[#16223F] hover:bg-gray-50 z-[120] transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </nav>
    </>
  );
};

export default Sidebar;