import React, { useState, useEffect, useMemo, useRef } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";
import SkeletonLoader from "./SkeletonLoader";
import ModulePageHeader from "./ModulePageHeader";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Home as HomeIcon, 
  Settings, 
  Save, 
  ChevronDown 
} from "lucide-react";

export default function DailyFeeding() {
  const [farms, setFarms] = useState([]);
  const [sheds, setSheds] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [feedItems, setFeedItems] = useState([]);
  const [logs, setLogs] = useState([]);

  // Filter / Page state
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [session, setSession] = useState("MORNING");
  const [activeShedId, setActiveShedId] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // User input states: tag -> feedName -> amount
  const [quantities, setQuantities] = useState({});

  // Settings / Reordering Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempFarmsOrder, setTempFarmsOrder] = useState([]);

  const initializedRef = useRef(false);
  const logsInitKey = useRef("");

  // Feed types configuration
  const feedTypes = [
    { name: "greenGrass",     label: "Green Grass (KG)" },
    { name: "dryGrass",       label: "Dry Grass (KG)" },
    { name: "cottonCake",     label: "C.Cake (KG)" },
    { name: "chunni",         label: "Chunni (KG)" },
    { name: "maize",          label: "Maize (KG)" },
    { name: "wheatBran",      label: "Wheat Bran (KG)" },
    { name: "salt",           label: "Salt (G)" },
    { name: "oralCalcium",    label: "Oral Calcium (ML)" },
    { name: "mineralMixture", label: "Mineral Mixture (G)" }
  ];

  // Apply farm ordering helper
  const sortFarms = (farmsList) => {
    if (!farmsList || farmsList.length === 0) return [];
    try {
      const savedOrder = localStorage.getItem("farm_display_order");
      if (savedOrder) {
        const orderIds = JSON.parse(savedOrder);
        if (Array.isArray(orderIds)) {
          return [...farmsList].sort((a, b) => {
            const indexA = orderIds.indexOf(a._id || a.id);
            const indexB = orderIds.indexOf(b._id || b.id);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });
        }
      }
    } catch (e) {
      console.error("Failed to load farm display order:", e);
    }
    return farmsList;
  };

  // 1. Initial Data Fetch
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const [farmsData, shedsData, animalsData, feedItemsData] = await Promise.all([
          api.farms.getAll().catch(() => []),
          api.sheds.getAll().catch(() => []),
          api.cattle.getAll().catch(() => []),
          api.feedItems.getAll().catch(() => []),
        ]);

        let finalFarms = Array.isArray(farmsData) ? farmsData : (farmsData?.data ?? []);
        if (!Array.isArray(finalFarms) || finalFarms.length === 0) {
          try {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
              const user = JSON.parse(storedUser);
              const userFarmId = user.farmId && typeof user.farmId === 'object'
                ? (user.farmId._id || user.farmId.id)
                : user.farmId;
              if (userFarmId && userFarmId !== 'ALL') {
                finalFarms = [{ _id: userFarmId, id: userFarmId, name: user.farm || "My Assigned Farm", code: user.farm || "My Assigned Farm" }];
              }
            }
          } catch (e) {}
        }

        const sorted = sortFarms(finalFarms);
        setFarms(sorted);
        setSheds(shedsData || []);
        setFeedItems(feedItemsData || []);
        
        const rawAnimals = Array.isArray(animalsData) ? animalsData : (animalsData?.data ?? []);
        setAnimals(rawAnimals);

        const storedActive = localStorage.getItem('__active_farm_id__');
        if (storedActive && storedActive !== 'ALL') {
          setSelectedFarmId(storedActive);
        } else if (sorted && sorted.length > 0) {
          setSelectedFarmId(sorted[0]._id || sorted[0].id);
        }
      } catch (err) {
        console.error(err);
        swalError("Error", "Failed to initialize daily feeding dashboard.");
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // 2. Fetch existing daily feeding logs
  const fetchLogs = async () => {
    const key = `${selectedDate}_${session}`;
    if (logsInitKey.current === key) return;
    logsInitKey.current = key;

    try {
      const records = await api.operations.dailyFeeding.getAll();
      const rawRecords = Array.isArray(records) ? records : (records?.data ?? []);
      setLogs(rawRecords);
    } catch (err) {
      console.error("Failed to load existing collections:", err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedDate, session]);

  // Filter sheds belonging to selected farm
  const farmSheds = useMemo(() => {
    if (!selectedFarmId) return [];
    return sheds.filter(
      (s) => String(s.farmId?._id || s.farmId?.id || s.farmId) === String(selectedFarmId)
    );
  }, [selectedFarmId, sheds]);

  // Set default active shed when farmSheds list changes
  useEffect(() => {
    if (farmSheds.length > 0) {
      const firstShedWithAnimals = farmSheds.find((s) => {
        const count = animals.filter(
          (a) =>
            (String(a.shed || a.shedId).trim().toUpperCase() === String(s.code || '').trim().toUpperCase() ||
             String(a.shed || a.shedId).trim().toUpperCase() === String(s.name || '').trim().toUpperCase() ||
             String(a.shed || a.shedId).trim().toUpperCase() === String(s._id || '').trim().toUpperCase()) &&
            String(a.farmId?._id || a.farmId?.id || a.farmId) === String(selectedFarmId) &&
            !["SOLD", "DECEASED", "DEAD"].includes(a.status)
        ).length;
        return count > 0;
      });

      if (firstShedWithAnimals) {
        setActiveShedId(firstShedWithAnimals.name || firstShedWithAnimals.code || String(firstShedWithAnimals._id));
      } else {
        setActiveShedId(farmSheds[0].name || farmSheds[0].code || String(farmSheds[0]._id));
      }
    } else {
      setActiveShedId("");
    }
  }, [farmSheds, animals, selectedFarmId]);

  // Find active shed object configuration
  const activeShed = useMemo(() => {
    return sheds.find(s => 
      String(s.name || s.code || s._id).trim().toUpperCase() === String(activeShedId).trim().toUpperCase()
    );
  }, [activeShedId, sheds]);

  // Helper to determine camelCase field key from feed item name, matching legacy fields precisely
  const getFeedFieldKey = (name) => {
    const clean = name.trim().toLowerCase();
    if (clean === 'green grass') return 'greenGrass';
    if (clean === 'dry grass') return 'dryGrass';
    if (clean === 'cotton cake' || clean === 'c.cake' || clean === 'c. cake') return 'cottonCake';
    if (clean === 'chunni') return 'chunni';
    if (clean === 'maize') return 'maize';
    if (clean === 'wheat bran') return 'wheatBran';
    if (clean === 'salt') return 'salt';
    if (clean === 'oral calcium') return 'oralCalcium';
    if (clean === 'mineral mixture') return 'mineralMixture';
    
    // Dynamic camelCase fallback for new custom items
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '') // remove special characters
      .split(/\s+/)
      .map((word, idx) => idx === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  };

  const activeFeedTypes = useMemo(() => {
    if (!feedItems || feedItems.length === 0) return [];

    return feedItems
      .filter(item => item.status !== false)
      .map(item => {
        const key = getFeedFieldKey(item.name);
        return {
          name: key,
          label: item.name,
          unit: item.type || "KG"
        };
      });
  }, [feedItems]);

  // 3. Populate existing quantities when logs change
  useEffect(() => {
    const newQuantities = {};
    const targetDateStr = new Date(selectedDate).toDateString();
    
    const activeDayLogs = logs.filter(
      (c) => new Date(c.date).toDateString() === targetDateStr && 
             c.session === session &&
             String(c.shedId || '').trim().toUpperCase() === String(activeShedId || '').trim().toUpperCase()
    );

    activeDayLogs.forEach((c) => {
      const tag = String(c.tag_id || c.animalId).toUpperCase();
      const rowQuantities = {};
      activeFeedTypes.forEach(feed => {
        rowQuantities[feed.name] = c[feed.name] || 0;
      });
      newQuantities[tag] = rowQuantities;
    });

    setQuantities(newQuantities);
  }, [logs, selectedDate, session, activeShedId, activeFeedTypes]);

  // Active Shed Totals calculation
  const activeShedTotals = useMemo(() => {
    const totals = {};
    activeFeedTypes.forEach(feed => {
      totals[feed.name] = 0;
    });

    if (!activeShed) return totals;

    const numRows = activeShed.lines || 1;
    for (let r = 1; r <= numRows; r++) {
      const rowKey = `ROW ${r}`;
      const q = quantities[rowKey] || {};
      Object.keys(totals).forEach((f) => {
        totals[f] += Number(q[f]) || 0;
      });
    }

    return totals;
  }, [activeShed, quantities, activeFeedTypes]);

  // Calculations for Side panel & overall stats
  const calculations = useMemo(() => {
    const targetDateStr = new Date(selectedDate).toDateString();
    
    // Logs for selected date and session
    const dayLogs = logs.filter(
      (c) => new Date(c.date).toDateString() === targetDateStr && c.session === session
    );

    // Summary of all sheds for active session
    const shedsSummary = farmSheds.map((s) => {
      const shedKey = s.name || s.code || String(s._id);
      
      const shedAnimals = animals.filter(
        (a) =>
          (String(a.shed || a.shedId).trim().toUpperCase() === String(s.code || '').trim().toUpperCase() ||
           String(a.shed || a.shedId).trim().toUpperCase() === String(s.name || '').trim().toUpperCase() ||
           String(a.shed || a.shedId).trim().toUpperCase() === String(s._id || '').trim().toUpperCase()) &&
          String(a.farmId?._id || a.farmId?.id || a.farmId) === String(selectedFarmId) &&
          !["SOLD", "DECEASED", "DEAD"].includes(a.status)
      );

      const totalShedQty = dayLogs
        .filter((c) => String(c.shedId).trim().toUpperCase() === String(shedKey).trim().toUpperCase())
        .reduce((sum, c) => {
          let rowSum = 0;
          activeFeedTypes.forEach(feed => {
            rowSum += c[feed.name] || 0;
          });
          return sum + rowSum;
        }, 0);

      return {
        name: shedKey,
        totalQty: totalShedQty,
        animalCount: shedAnimals.length
      };
    });

    const sessionTotal = dayLogs.reduce((sum, c) => {
      let rowSum = 0;
      activeFeedTypes.forEach(feed => {
        rowSum += c[feed.name] || 0;
      });
      return sum + rowSum;
    }, 0);

    return {
      shedsSummary,
      sessionTotal,
    };
  }, [logs, selectedDate, session, farmSheds, animals, selectedFarmId, activeFeedTypes]);

  // Handle Input Changes
  const handleQuantityChange = (tag, field, value) => {
    const val = value === "" ? "" : Number(value);
    setQuantities((prev) => ({
      ...prev,
      [tag]: {
        ...(prev[tag] || {}),
        [field]: val,
      },
    }));
  };

  // Handle keydown events for enter-key focus transition
  const handleKeyDown = (e, r, feedIndex) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const isLastFeedInRow = feedIndex === activeFeedTypes.length - 1;
      const numRows = activeShed?.lines || 1;
      
      if (!isLastFeedInRow) {
        const nextFeed = activeFeedTypes[feedIndex + 1];
        const nextInputId = `feed-input-${r}-${nextFeed.name}`;
        const el = document.getElementById(nextInputId);
        if (el) el.focus();
      } else if (r < numRows) {
        const firstFeed = activeFeedTypes[0];
        const nextInputId = `feed-input-${r + 1}-${firstFeed.name}`;
        const el = document.getElementById(nextInputId);
        if (el) el.focus();
      }
    }
  };

  // Save feeding records for active shed
  const handleSaveActiveShed = async () => {
    if (!selectedFarmId) {
      swalError("Error", "Please select a farm first.");
      return;
    }
    if (!activeShedId) {
      swalError("Error", "Please select an active shed first.");
      return;
    }
    setIsSaving(true);

    try {
      if (!activeShed) return;

      const numRows = activeShed.lines || 1;
      const feedingPayload = [];

      for (let r = 1; r <= numRows; r++) {
        const rowKey = `ROW ${r}`;
        const q = quantities[rowKey] || {};
        const rowPayload = {
          tagId: rowKey,
        };
        activeFeedTypes.forEach(feed => {
          rowPayload[feed.name] = Number(q[feed.name]) || 0;
        });
        feedingPayload.push(rowPayload);
      }

      const payload = {
        date: selectedDate,
        session,
        farmId: selectedFarmId,
        shedId: activeShedId,
        collections: feedingPayload,
      };

      await api.operations.dailyFeeding.bulkCreate(payload);
      
      // Auto transition popup logic
      const activeIndex = farmSheds.findIndex(s => 
        String(s.name || s.code || s._id).trim().toUpperCase() === String(activeShedId).trim().toUpperCase()
      );

      logsInitKey.current = ""; // Reset cache to force reload
      await fetchLogs();

      if (activeIndex !== -1 && activeIndex < farmSheds.length - 1) {
        const nextShed = farmSheds[activeIndex + 1];
        const nextShedKey = nextShed.name || nextShed.code || String(nextShed._id);

        const proceed = await swalConfirm(
          "Shed Log Saved Successfully!",
          `Daily feeding for ${activeShedId} (${session}) has been recorded. Would you like to proceed to ${nextShedKey}?`
        );

        if (proceed) {
          setActiveShedId(nextShedKey);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        swalSuccess("Success", `Daily feeding for ${activeShedId} (${session}) saved successfully. All sheds completed!`);
      }
    } catch (err) {
      console.error(err);
      swalError("Error", err || "Failed to save daily feeding records.");
    } finally {
      setIsSaving(false);
    }
  };

  // Open settings to reorder farms
  const openSettings = () => {
    setTempFarmsOrder([...farms]);
    setShowSettingsModal(true);
  };

  // Move farm up or down in sorting list
  const moveFarm = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= tempFarmsOrder.length) return;
    
    const updated = [...tempFarmsOrder];
    const temp = updated[index];
    updated[index] = updated[nextIndex];
    updated[nextIndex] = temp;
    setTempFarmsOrder(updated);
  };

  // Save new farm sorting order
  const saveFarmsOrder = () => {
    const ids = tempFarmsOrder.map(f => f._id || f.id);
    localStorage.setItem("farm_display_order", JSON.stringify(ids));
    setFarms(tempFarmsOrder);
    if (tempFarmsOrder.length > 0) {
      setSelectedFarmId(tempFarmsOrder[0]._id || tempFarmsOrder[0].id);
    }
    setShowSettingsModal(false);
    swalSuccess("Order Updated", "Farm display order has been saved successfully.");
  };

  return (
    <div className="p-6 md:p-10 w-full h-full flex flex-col bg-slate-50/50 text-slate-800 font-sans min-h-screen">
      
      {/* A. Header & Sub-Header Section */}
      <ModulePageHeader
        title="Daily Feeding Dashboard"
        description="Log, track, and monitor daily animal feed distribution across farm sheds."
      >
        <button
          onClick={openSettings}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white border border-slate-200 hover:border-emerald-600 hover:text-emerald-700 text-slate-700 font-bold rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.02)] active:scale-[0.98] transition-all duration-300 text-xs self-start sm:self-center"
        >
          <Settings className="w-4 h-4 text-slate-400 hover:text-emerald-600 transition-colors" />
          Set Farm Order
        </button>
      </ModulePageHeader>

      {isLoading ? (
        <SkeletonLoader type="table" columns={4} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Configuration Panel, Overall Stats, & Workspace */}
          <div className="xl:col-span-8 flex flex-col gap-6 w-full">
            
            {/* 1. Global Setup Filters */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                
                {/* Farm Selector */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                    Active Farm
                  </label>
                  <div className="relative">
                    <HomeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={selectedFarmId}
                      onChange={(e) => setSelectedFarmId(e.target.value)}
                      className="w-full h-12 bg-slate-50/50 border border-slate-200/80 rounded-2xl pl-11 pr-10 text-xs font-black text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 appearance-none transition-all duration-300"
                    >
                      {farms.map((f) => (
                        <option key={f._id || f.id} value={f._id || f.id}>
                          🏡 {f.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Date Selection */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                    Feeding Date
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full h-12 bg-slate-50/50 border border-slate-200/80 rounded-2xl pl-11 pr-4 text-xs font-black text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Session Periods */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                    Session Period
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={session}
                      onChange={(e) => setSession(e.target.value)}
                      className="w-full h-12 bg-slate-50/50 border border-slate-200/80 rounded-2xl pl-11 pr-10 text-xs font-black text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 appearance-none transition-all duration-300"
                    >
                      <option value="MORNING">☀️ Morning Session</option>
                      <option value="EVENING">🌙 Evening Session</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

              </div>
            </div>

            {/* 2. Shed Tab Selectors */}
            {farmSheds.length > 0 && (
              <div className="flex flex-wrap gap-2.5 mb-2">
                {farmSheds.map((s) => {
                  const shedKey = s.name || s.code || String(s._id);
                  const isCurrent = String(activeShedId).trim().toUpperCase() === String(shedKey).trim().toUpperCase();
                  
                  // Count total animals in this shed
                  const shedAnimalsCount = animals.filter(
                    (a) =>
                      (String(a.shed || a.shedId).trim().toUpperCase() === String(s.code || '').trim().toUpperCase() ||
                       String(a.shed || a.shedId).trim().toUpperCase() === String(s.name || '').trim().toUpperCase() ||
                       String(a.shed || a.shedId).trim().toUpperCase() === String(s._id || '').trim().toUpperCase()) &&
                      String(a.farmId?._id || a.farmId?.id || a.farmId) === String(selectedFarmId) &&
                      !["SOLD", "DECEASED", "DEAD"].includes(a.status)
                  ).length;

                  return (
                    <button
                      key={shedKey}
                      onClick={() => setActiveShedId(shedKey)}
                      className={`px-6 py-3.5 rounded-2xl text-xs font-black tracking-wide shadow-sm transition-all duration-300 border flex items-center gap-2 ${
                        isCurrent
                          ? "bg-slate-800 border-slate-800 text-white hover:bg-slate-900"
                          : "bg-white border-slate-200/60 hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                      }`}
                    >
                      <span>🏚️ {s.name || s.code}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${isCurrent ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                        {shedAnimalsCount} animals
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. Main Workspace / Selected Shed Log Area */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_12px_45px_rgba(0,0,0,0.015)] overflow-hidden">
              {activeShedId ? (
                <div>
                  
                  {/* Top Bar inside Active Shed Workspace */}
                  <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                    <div>
                      <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                        <span>📋 Daily Feed Registry</span>
                        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                          Shed: {activeShedId}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
                        Input quantities consumed by each Row. Values autosave in active tab memory.
                      </p>
                    </div>
                  </div>

                  {/* Row Cards List */}
                  <div className="p-8 space-y-8 max-h-[65vh] overflow-y-auto">
                    {activeFeedTypes.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs font-black">
                        ⚠️ No active feed items defined for this farm. Configure them in Feed Items first.
                      </div>
                    ) : (
                      Array.from({ length: activeShed?.lines || 1 }).map((_, index) => {
                        const r = index + 1;
                        const rowKey = `ROW ${r}`;
                        const q = quantities[rowKey] || {};

                        // Count animals in this specific line/row
                        const rowAnimalsCount = animals.filter(
                          (a) =>
                            (String(a.shed || a.shedId).trim().toUpperCase() === String(activeShed.code || '').trim().toUpperCase() ||
                             String(a.shed || a.shedId).trim().toUpperCase() === String(activeShed.name || '').trim().toUpperCase()) &&
                            String(a.farmId?._id || a.farmId?.id || a.farmId) === String(selectedFarmId) &&
                            !["SOLD", "DECEASED", "DEAD"].includes(a.status) &&
                            Number(a.lineNo) === r
                        ).length;

                        return (
                          <div 
                            key={rowKey}
                            className="bg-slate-50/40 border border-slate-200/60 rounded-3xl p-6 shadow-[0_4px_16px_rgba(0,0,0,0.01)] hover:shadow-md transition-all duration-300"
                          >
                            {/* Row Card Header */}
                            <div className="flex justify-between items-center pb-4 mb-6 border-b border-slate-100">
                              <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                                🏡 Row {r}
                              </span>
                              <span className="text-[10px] font-black px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg">
                                🐄 {rowAnimalsCount} Animals
                              </span>
                            </div>

                            {/* Inputs Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                              {activeFeedTypes.map((feed, feedIndex) => {
                                const val = q[feed.name] !== undefined ? q[feed.name] : "";
                                const unit = feed.unit;

                                return (
                                  <div key={feed.name} className="flex flex-col gap-1.5">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-0.5">
                                      {feed.label.split(" (")[0]}
                                    </label>
                                    <div className="relative flex items-center">
                                      <input
                                        id={`feed-input-${r}-${feed.name}`}
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={val}
                                        onChange={(e) => handleQuantityChange(rowKey, feed.name, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, r, feedIndex)}
                                        placeholder="0.0"
                                        className="w-full h-11 px-4 pr-12 bg-white border border-slate-200/80 rounded-xl text-xs font-black text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all duration-200"
                                      />
                                      <span className="absolute right-4 text-[9px] font-extrabold text-slate-400 pointer-events-none">{unit}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Form Footer: Save Inline Shed Action */}
                  <div className="p-8 border-t border-slate-100 flex justify-between items-center bg-slate-50/20">
                    <div className="text-xs text-slate-400 font-bold">
                      Shed Total Feed: <span className="text-sm font-black text-slate-800 ml-1">
                        {Object.values(activeShedTotals).reduce((sum, val) => sum + (Number(val) || 0), 0).toLocaleString()} units
                      </span>
                    </div>

                    {/* Save this specific shed */}
                    <button
                      onClick={handleSaveActiveShed}
                      disabled={isSaving || activeFeedTypes.length === 0}
                      className="px-6 h-12 bg-slate-800 hover:bg-slate-900 text-white font-extrabold rounded-2xl shadow-lg shadow-slate-600/10 hover:shadow-slate-600/20 active:scale-[0.98] transition-all duration-300 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? "Saving..." : `Save ${activeShedId}`}</span>
                    </button>
                  </div>

                </div>
              ) : (
                <div className="bg-white/90 rounded-3xl border border-slate-100/80 p-12 text-center shadow-[0_12px_40px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center">
                  <HomeIcon className="w-10 h-10 text-slate-300 mb-3" />
                  <h4 className="text-sm font-black text-slate-800">No active sheds configured</h4>
                  <p className="text-xs text-slate-400 mt-1">Please configure sheds in Shed Management first.</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Real-Time Sheds Summary */}
          <div className="xl:col-span-4 flex flex-col gap-6 w-full">
            
            {/* Sheds Summary Board */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-100/80 shadow-[0_12px_40px_rgba(0,0,0,0.03)] p-8">
              <div className="flex flex-col gap-1 mb-6">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.15em]">
                  REAL-TIME OVERVIEW
                </span>
                <h3 className="text-sm font-black text-slate-900">
                  Sheds Summary ({session === "MORNING" ? "Morning" : "Evening"})
                </h3>
              </div>

              <div className="overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase font-black tracking-widest text-[9px]">
                      <th className="pb-3.5 font-bold">Shed</th>
                      <th className="pb-3.5 font-bold text-right">Animals</th>
                      <th className="pb-3.5 font-bold text-right">Total Feed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold">
                    {calculations.shedsSummary.map((s) => (
                      <tr key={s.name} className="text-slate-700 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 font-extrabold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>{s.name}</span>
                        </td>
                        <td className="py-3.5 text-right text-slate-600 font-bold">{s.animalCount}</td>
                        <td className="py-3.5 text-right text-[#16223F] font-bold">{s.totalQty.toLocaleString()} units</td>
                      </tr>
                    ))}
                    {calculations.shedsSummary.length === 0 && (
                      <tr>
                        <td className="py-6 text-center text-slate-400" colSpan={3}>
                          No sheds tracked yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100/80 flex justify-between items-center text-xs font-black">
                <span className="text-slate-400 uppercase tracking-wider text-[9px]">Grand Total</span>
                <span className="text-sm text-slate-800">{calculations.sessionTotal.toLocaleString()} units</span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* D. Settings Modal to Reorder Farms */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[36px] shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-slate-800 mb-2">Display Preferences</h3>
            <p className="text-xs text-slate-400 mb-6 font-semibold leading-relaxed">
              Use controls below to shift priority displaying farms left-to-right on feed dashboards.
            </p>
            
            <div className="space-y-2 mb-8">
              {tempFarmsOrder.map((f, idx) => (
                <div key={f._id || f.id} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-xs font-black text-slate-800">🏡 {f.name}</span>
                  <div className="flex gap-1.5">
                    <button
                      disabled={idx === 0}
                      onClick={() => moveFarm(idx, -1)}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all cursor-pointer"
                    >
                      ▲
                    </button>
                    <button
                      disabled={idx === tempFarmsOrder.length - 1}
                      onClick={() => moveFarm(idx, 1)}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all cursor-pointer"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3.5">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-2xl text-xs transition-all duration-300"
              >
                Cancel
              </button>
              <button
                onClick={saveFarmsOrder}
                className="px-6 py-3 bg-[#16223F] hover:bg-[#2a3f75] text-white font-extrabold rounded-2xl text-xs transition-all duration-300 shadow-md shadow-slate-900/10"
              >
                Save Priority Order
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
