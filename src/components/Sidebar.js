import React, { useState, useEffect } from 'react'; // ✅ added useEffect
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DEFAULT_MODULE_GROUPS = {
  CORE: {
    title: 'Core Modules',
    modules: [
      { name: 'User Management', baseToken: 'USERS', prefix: 'USER_MANAGEMENT', icon: '👥', path: '/users' },
      { name: 'Department', baseToken: 'DEPARTMENTS', prefix: 'DEPARTMENT', icon: '🏢', path: '/department' },
      { name: 'Role & Permissions', baseToken: 'ROLES', prefix: 'ROLES', icon: '🛡️', path: '/roles' },
      { name: 'Farm Management', baseToken: 'FARMS', prefix: 'FARM_MANAGEMENT', icon: '🏠', path: '/farms' },
      { name: 'Land Management', baseToken: 'LAND', prefix: 'LAND_MANAGEMENT', icon: '🗺️', path: '/land-management' },
      { name: 'BMC Management', baseToken: 'BMC', prefix: 'BMC', icon: '❄️', path: '/bmc-management' },
      { name: 'Shed Management', baseToken: 'SHEDS', prefix: 'SHED_MANAGEMENT', icon: '⚙️', path: '/shed-management' },
      { name: 'Line Management', baseToken: 'SHEDS', prefix: 'LINE_MANAGEMENT', icon: '📏', path: '/line-management' },
      { name: 'Cattle Management', baseToken: 'CATTLE', prefix: 'CATTLE_MANAGEMENT', icon: '🐄', path: '/cattle-management' },
      { name: 'Health Management', baseToken: 'HEALTH', prefix: 'HEALTH_MANAGEMENT', icon: '🩺', path: '/health-management' },
      { name: 'Feed Items', baseToken: 'INVENTORY', prefix: 'FEED_ITEMS', icon: '🌾', path: '/feed-items' },
      { name: 'Tag Management', baseToken: 'CATTLE', prefix: 'TAG_MANAGEMENT', icon: '🏷️', path: '/tag-management' },
      { name: 'Breed Management', baseToken: 'CATTLE', prefix: 'BREED_MANAGEMENT', icon: '🧬', path: '/breed-management' },
      { name: 'Animal Management', baseToken: 'CATTLE', prefix: 'ANIMAL_MANAGEMENT', icon: '🐏', path: '/animal-management' },
      { name: 'Insemination Management', baseToken: 'CROSSING_LOG', prefix: 'INSEMINATION_MANAGEMENT', icon: '🧬', path: '/insemination' },
      { name: 'Procurement Management', baseToken: 'PROCUREMENT_MANAGEMENT', prefix: 'PROCUREMENT_MANAGEMENT', icon: '🛒', path: '/procurement-management' }
    ]
  },
  MODULES: {
    title: 'modules',
    modules: [
      { name: 'Live Stock', baseToken: 'CATTLE', prefix: 'LIVESTOCK', icon: '🐄', path: '/animals' },
      { name: 'Shed Log', baseToken: 'SHED_LOG', prefix: 'SHED_LOG', icon: '📝', path: '/shed' },
      { name: 'Crossing Log', baseToken: 'CROSSING_LOG', prefix: 'CROSSING_LOG', icon: '🧬', path: '/crossing' },
      { name: 'Purchase Log', baseToken: 'PURCHASE_LOG', prefix: 'PURCHASE_LOG', icon: '📥', path: '/purchase' },
      { name: 'Sale Log', baseToken: 'SALE_LOG', prefix: 'SALE_LOG', icon: '📤', path: '/sale' },
      { name: 'Treatment Log', baseToken: 'HEALTH', prefix: 'TREATMENT_LOG', icon: '📋', path: '/treatment' },
      { name: 'Vaccination Log', baseToken: 'HEALTH', prefix: 'VACCINATION_LOG', icon: '💉', path: '/vaccination' },
      { name: 'Feed Inventory', baseToken: 'INVENTORY', prefix: 'FEED_INVENTORY', icon: '📦', path: '/feed-inventory' },
      { name: 'Medicine Inventory', baseToken: 'INVENTORY', prefix: 'MEDICINE_INVENTORY', icon: '💊', path: '/medicine-inventory' },
      { name: 'Grass Collection', baseToken: 'GRASS', prefix: 'GRASS', icon: '🌿', path: '/grass' },
      { name: 'Daily Feeding', baseToken: 'FEEDING', prefix: 'FEEDING', icon: '🌾', path: '/feeding' },
      { name: 'Daily Milk Collection', baseToken: 'MILK', prefix: 'MILK_COLLECTION', icon: '🥛', path: '/milk' },
      { name: 'Milk QA', baseToken: 'MILK', prefix: 'MILK_QA', icon: '🔬', path: '/milk-quality' },
      { name: 'Milk Procurement', baseToken: 'MILK', prefix: 'MILK_PROCUREMENT', icon: '🥛', path: '/milk-procurement' },
      { name: 'Milking Performance', baseToken: 'MILK_PERFORMANCE', prefix: 'MILK_PERFORMANCE', icon: '🥛', path: '/milking-performance' }
    ]
  }
};

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
    "/users",
    "/department",
    "/roles",
    "/shed",
    "/animals",
    "/farms",
    "/shed-management",
    "/line-management",
    "/cattle-management",
    "/health-management",
    "/feed-items",
    "/tag-management",
    "/breed-management",
    "/bmc-management",
    "/procurement-management"
  ].includes(router.pathname) && !router.query.tab;

  const isNormalRoute =
    ["/animals", "/shed", "/crossing", "/purchase", "/sale", "/treatment", "/vaccination"].includes(router.pathname) ||
    (isFarmRoute && router.query.tab);

  const isHealthActive = ["/treatment", "/vaccination"].includes(router.pathname) || (isFarmRoute && ["vaccine"].includes(router.query.tab));
  const isInventoryActive = ["/feed-inventory", "/medicine-inventory"].includes(router.pathname) || (isFarmRoute && ["feed_inv", "med_inv", "medicine"].includes(router.query.tab));
  const isMilkActive = ["/milk", "/milk-quality", "/milking-performance", "/milk-procurement"].includes(router.pathname) || (isFarmRoute && ["milk_prod", "components"].includes(router.query.tab));

  // Dynamic Farms State
  const [farmsList, setFarmsList] = useState([]);
  const [userRole, setUserRole] = useState(null);
  /** @type {Record<string, any> | null} */
  const [userObj, setUserObj] = useState(null);
  const [moduleGroups, setModuleGroups] = useState(DEFAULT_MODULE_GROUPS);

  // Fetch dynamic modules list from backend
  useEffect(() => {
    let isMounted = true;
    const fetchModules = async () => {
      try {
        const { api } = await import('../utils/api');
        const res = await api.roles.getModules();
        const data = res?.data || res;
        if (isMounted && data && typeof data === 'object' && (data.CORE || data.MODULES)) {
          setModuleGroups(data);
        }
      } catch (err) {
        console.error("[Sidebar] Failed to load dynamic modules:", err);
      }
    };
    fetchModules();
    return () => { isMounted = false; };
  }, []);

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
  const hasAccess = (moduleKey, exact = false) => {
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
        const upperP = p.trim().toUpperCase();
        const upperModKey = moduleKey.trim().toUpperCase();
        
        if (exact) {
          return upperP === upperModKey;
        }
        
        const getBaseModule = (perm) => {
          const upper = perm.toUpperCase();
          const suffixes = ['_VIEW', '_CREATE', '_EDIT', '_DELETE'];
          for (const s of suffixes) {
            if (upper.endsWith(s)) {
              return upper.substring(0, upper.length - s.length);
            }
          }
          return upper;
        };

        const userModule = getBaseModule(upperP);
        return userModule === upperModKey;
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
        if (!isMounted) return;
        const clean = Array.isArray(res) ? res : (res?.data ?? []);
        if (Array.isArray(clean) && clean.length > 0) {
          setFarmsList(clean);
        } else {
          triggerFallback();
        }
      }).catch(err => {
        console.error("Error fetching farms in Sidebar:", err);
        triggerFallback();
      });
    });

    function triggerFallback() {
      if (isMounted) {
        try {
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            const user = JSON.parse(storedUser);
            const userFarmId = user.farmId && typeof user.farmId === 'object'
              ? (user.farmId._id || user.farmId.id)
              : user.farmId;
            if (userFarmId && userFarmId !== 'ALL') {
              setFarmsList([{ _id: userFarmId, id: userFarmId, name: user.farm || "My Assigned Farm", code: user.farm || "My Assigned Farm" }]);
            }
          }
        } catch (e) {}
      }
    }
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
                {/* CORE MODULES GROUP */}
                {(() => {
                  const allowedModules = (moduleGroups.CORE?.modules || []).filter(mod => 
                    mod.path && (hasAccess(mod.prefix) || hasAccess(mod.baseToken, true))
                  );
                  if (allowedModules.length === 0) return null;
                  
                  return (
                    <li className="mt-4">
                      <button
                        onClick={() => toggleState(setCoreOpen, 'coreOpen', coreOpen)}
                        className="w-full flex justify-between items-center text-gray-700 text-[13px] uppercase font-black px-2 py-2 cursor-pointer hover:bg-slate-50 rounded"
                      >
                        <span>{moduleGroups.CORE?.title || 'Core Modules'}</span>
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
                            {allowedModules.map((mod) => {
                              const isActive = mod.path === '/farms' 
                                ? router.pathname.startsWith("/farm") 
                                : isLinkActive(mod.path);
                              return (
                                <li key={mod.path}>
                                  <Link href={mod.path} onClick={handleCloseSidebar}
                                    className={`block p-2 rounded border-l-4 ${isActive ? activeStyle : normalStyle}`}>
                                    {mod.icon} {mod.name}
                                  </Link>
                                </li>
                              );
                            })}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </li>
                  );
                })()}

                {/* NORMAL MODULES GROUP */}
                {(() => {
                  const allowedModules = (moduleGroups.MODULES?.modules || []).filter(mod => 
                    mod.path && (hasAccess(mod.prefix) || hasAccess(mod.baseToken, true))
                  );
                  if (allowedModules.length === 0) return null;

                  return (
                    <li className="mt-4 border-t border-slate-100 pt-4">
                      <button
                        onClick={() => toggleState(setNormalOpen, 'normalOpen', normalOpen)}
                        className="w-full flex justify-between items-center text-gray-700 text-[13px] uppercase font-black px-2 py-2 cursor-pointer hover:bg-slate-50 rounded"
                      >
                        <span>{moduleGroups.MODULES?.title || 'Modules'}</span>
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
                            {allowedModules.map((mod) => {
                              const isActive = isLinkActive(mod.path);
                              return (
                                <li key={mod.path}>
                                  <Link href={mod.path} onClick={handleCloseSidebar}
                                    className={`block p-2 rounded border-l-4 ${isActive ? activeStyle : normalStyle}`}>
                                    {mod.icon} {mod.name}
                                  </Link>
                                </li>
                              );
                            })}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </li>
                  );
                })()}
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