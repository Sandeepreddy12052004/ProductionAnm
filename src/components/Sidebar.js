import React, { useState, useEffect } from 'react'; // ✅ added useEffect
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const router = useRouter();

  const isFarmRoute = ["/tkp", "/tdr"].includes(router.pathname);

  const getTabPath = (tabId) => {
    const isCurrentlyTdr = router.pathname === "/tdr";
    
    if (isCurrentlyTdr) {
      if (tabId === "health") return "/tdr?tab=health";
      if (tabId === "feeding") return "/tdr?tab=feeding";
      if (tabId === "med_inv") return "/tdr?tab=medicine";
    }
    
    // Default to TKP
    if (tabId === "health") return "/tkp?tab=health";
    if (tabId === "vaccine") return "/tkp?tab=vaccine";
    if (tabId === "feed_inv") return "/tkp?tab=feed_inv";
    if (tabId === "med_inv") return "/tkp?tab=med_inv";
    if (tabId === "grass") return "/tkp?tab=grass";
    if (tabId === "feeding") return "/tkp?tab=feeding";
    if (tabId === "milk_prod") return "/tkp?tab=milk_prod";
    if (tabId === "components") return "/tkp?tab=components";
    if (tabId === "pashudhan") return "/tkp?tab=pashudhan";
    
    return "/tkp";
  };

  const isLinkActive = (path, tabId = null) => {
    if (tabId) {
      if (tabId === "med_inv") {
        return (router.pathname === "/tkp" && router.query.tab === "med_inv") || 
               (router.pathname === "/tdr" && router.query.tab === "medicine");
      }
      const targetTab = (tabId === "health" && router.pathname === "/tdr") ? "health" : tabId;
      return router.pathname === path && router.query.tab === targetTab;
    }
    return router.pathname === path && !router.query.tab;
  };

  const isCoreRoute = [
    "/profile",
    "/users",
    "/department",
    "/tkp",
    "/tdr",
    "/shed",
    "/animals"
  ].includes(router.pathname) && !router.query.tab;

  const isNormalRoute = ["/animals"].includes(router.pathname) || (isFarmRoute && router.query.tab);

  const isHealthActive = isFarmRoute && ["health", "vaccine"].includes(router.query.tab);
  const isInventoryActive = isFarmRoute && ["feed_inv", "med_inv", "medicine"].includes(router.query.tab);
  const isMilkActive = isFarmRoute && ["milk_prod", "components"].includes(router.query.tab);

  // States
  const [coreOpen, setCoreOpen] = useState(isCoreRoute || true);
  const [farmOpen, setFarmOpen] = useState(isFarmRoute && !router.query.tab);
  const [normalOpen, setNormalOpen] = useState(isNormalRoute || false);
  const [healthOpen, setHealthOpen] = useState(isHealthActive);
  const [inventoryOpen, setInventoryOpen] = useState(isInventoryActive);
  const [milkOpen, setMilkOpen] = useState(isMilkActive);

  // 1. Hydrate state safely from localStorage on mount
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
    } catch (err) {}
  }, []);

  // 2. Auto-expand based on active route
  useEffect(() => {
    if (isCoreRoute) setCoreOpen(true);
    if (isFarmRoute && !router.query.tab) {
      setCoreOpen(true);
      setFarmOpen(true);
    }
    if (isNormalRoute) setNormalOpen(true);
    if (isHealthActive) {
      setNormalOpen(true);
      setHealthOpen(true);
    }
    if (isInventoryActive) {
      setNormalOpen(true);
      setInventoryOpen(true);
    }
    if (isMilkActive) {
      setNormalOpen(true);
      setMilkOpen(true);
    }
  }, [router.pathname, router.query.tab]);

  // 3. Helper to toggle and save
  const toggleState = (setter, key, currentVal) => {
    const newVal = !currentVal;
    setter(newVal);
    try {
      const existing = JSON.parse(localStorage.getItem("sidebar_dropdown_state") || "{}");
      existing[key] = newVal;
      localStorage.setItem("sidebar_dropdown_state", JSON.stringify(existing));
    } catch (e) {}
  };

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
          transform transition-transform duration-300 ease-in-out
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
          {/* Dashboard Link */}
          <li>
            <motion.div whileHover={{ scale: 1.02, x: 3 }}>
              <Link href="/dashboard" onClick={() => setIsOpen(false)}
                className={`block p-2 rounded border-l-4 ${isLinkActive("/dashboard") ? activeStyle : normalStyle}`}>
                📊 Dashboard
              </Link>
            </motion.div>
          </li>

          {/* CORE MODULES GROUP */}
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


                  <li>
                    <Link href="/users" onClick={() => setIsOpen(false)}
                      className={`block p-2 rounded border-l-4 ${isLinkActive("/users") ? activeStyle : normalStyle}`}>
                      👥 User Management
                    </Link>
                  </li>

                  <li>
                    <Link href="/department" onClick={() => setIsOpen(false)}
                      className={`block p-2 rounded border-l-4 ${isLinkActive("/department") ? activeStyle : normalStyle}`}>
                      🏢 Department
                    </Link>
                  </li>

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
                          <li>
                            <Link href="/tkp" onClick={() => setIsOpen(false)}
                              className={`block p-1.5 text-sm rounded border-l-4 ${
                                router.pathname === "/tkp" && !router.query.tab ? activeStyle : normalStyle
                              }`}>
                              🏠 TKP Farm
                            </Link>
                          </li>

                          <li>
                            <Link href="/tdr" onClick={() => setIsOpen(false)}
                              className={`block p-1.5 text-sm rounded border-l-4 ${
                                router.pathname === "/tdr" && !router.query.tab ? activeStyle : normalStyle
                              }`}>
                              🏡 TDR Farm
                            </Link>
                          </li>
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </li>

                  <li>
                    <Link href="/shed" onClick={() => setIsOpen(false)}
                      className={`block p-2 rounded border-l-4 ${isLinkActive("/shed") ? activeStyle : normalStyle}`}>
                      🪵 Shed Management
                    </Link>
                  </li>

                  <li>
                    <Link href={getTabPath("pashudhan")} onClick={() => setIsOpen(false)}
                      className={`block p-2 rounded border-l-4 ${
                        (router.pathname === "/tkp" && router.query.tab === "pashudhan") ? activeStyle : normalStyle
                      }`}>
                      🏷️ Tag Management
                    </Link>
                  </li>

                  <li>
                    <Link href="/animals" onClick={() => setIsOpen(false)}
                      className={`block p-2 rounded border-l-4 ${isLinkActive("/animals") ? activeStyle : normalStyle}`}>
                      🐄 Cattle Management
                    </Link>
                  </li>
                </motion.ul>
              )}
            </AnimatePresence>
          </li>

          {/* NORMAL MODULES GROUP */}
          <li className="mt-4 border-t border-slate-100 pt-4">
            <button
              onClick={() => toggleState(setNormalOpen, 'normalOpen', normalOpen)}
              className="w-full flex justify-between items-center text-gray-700 text-[13px] uppercase font-black px-2 py-2 cursor-pointer hover:bg-slate-50 rounded"
            >
              <span>Normal Modules</span>
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
                    <Link href="/animals" onClick={() => setIsOpen(false)}
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
                            <Link href={getTabPath("health")} onClick={() => setIsOpen(false)}
                              className={`block p-1.5 text-sm rounded border-l-4 ${
                                isLinkActive("/tkp", "health") || isLinkActive("/tdr", "health") ? activeStyle : normalStyle
                              }`}>
                              📋 Treatment Log
                            </Link>
                          </li>
                          <li>
                            <Link href={getTabPath("vaccine")} onClick={() => setIsOpen(false)}
                              className={`block p-1.5 text-sm rounded border-l-4 ${
                                isLinkActive("/tkp", "vaccine") ? activeStyle : normalStyle
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
                            <Link href={getTabPath("feed_inv")} onClick={() => setIsOpen(false)}
                              className={`block p-1.5 text-sm rounded border-l-4 ${
                                isLinkActive("/tkp", "feed_inv") ? activeStyle : normalStyle
                              }`}>
                              🌾 Feed Inventory
                            </Link>
                          </li>
                          <li>
                            <Link href={getTabPath("med_inv")} onClick={() => setIsOpen(false)}
                              className={`block p-1.5 text-sm rounded border-l-4 ${
                                isLinkActive("/tkp", "med_inv") || isLinkActive("/tdr", "medicine") ? activeStyle : normalStyle
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
                    <Link href={getTabPath("grass")} onClick={() => setIsOpen(false)}
                      className={`block p-2 rounded border-l-4 ${
                        isLinkActive("/tkp", "grass") ? activeStyle : normalStyle
                      }`}>
                      🌿 Grass Collection
                    </Link>
                  </li>

                  {/* Daily Feeding */}
                  <li>
                    <Link href={getTabPath("feeding")} onClick={() => setIsOpen(false)}
                      className={`block p-2 rounded border-l-4 ${
                        isLinkActive("/tkp", "feeding") || isLinkActive("/tdr", "feeding") ? activeStyle : normalStyle
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
                            <Link href={getTabPath("milk_prod")} onClick={() => setIsOpen(false)}
                              className={`block p-1.5 text-sm rounded border-l-4 ${
                                isLinkActive("/tkp", "milk_prod") ? activeStyle : normalStyle
                              }`}>
                              🥛 Daily Milk Collection
                            </Link>
                          </li>
                          <li>
                            <Link href={getTabPath("components")} onClick={() => setIsOpen(false)}
                              className={`block p-1.5 text-sm rounded border-l-4 ${
                                isLinkActive("/tkp", "components") ? activeStyle : normalStyle
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
      </nav>
    </>
  );
};

export default Sidebar;