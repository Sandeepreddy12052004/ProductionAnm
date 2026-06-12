import React, { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError } from "../utils/swal";
import SkeletonLoader from "./SkeletonLoader";

export default function DailyMilkCollection() {
  const [farms, setFarms] = useState([]);
  const [sheds, setSheds] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [collections, setCollections] = useState([]);

  // Filter / Page state
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [session, setSession] = useState("MORNING");
  const [activeShedId, setActiveShedId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // User input states
  const [quantities, setQuantities] = useState({}); // tag -> quantity (string/number)
  const [selfConsumptions, setSelfConsumptions] = useState({}); // shedId -> selfConsumption
  const [notes, setNotes] = useState("");

  // Settings / Reordering Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempFarmsOrder, setTempFarmsOrder] = useState([]);

  const itemsPerPage = 20;

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
    let isMounted = true;
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const [farmsData, shedsData, animalsData] = await Promise.all([
          api.farms.getAll(),
          api.sheds.getAll(),
          api.cattle.getAll(),
        ]);

        if (isMounted) {
          const sorted = sortFarms(farmsData || []);
          setFarms(sorted);
          setSheds(shedsData || []);
          
          const rawAnimals = Array.isArray(animalsData) ? animalsData : (animalsData?.data ?? []);
          setAnimals(rawAnimals);

          if (sorted && sorted.length > 0) {
            setSelectedFarmId(sorted[0]._id || sorted[0].id);
          }
        }
      } catch (err) {
        console.error(err);
        swalError("Error", "Failed to initialize milk collection dashboard.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadInitialData();
    return () => { isMounted = false; };
  }, []);

  // 2. Fetch existing collections for selected date
  const fetchCollections = async () => {
    try {
      const records = await api.milk.collections.getAll();
      const rawRecords = Array.isArray(records) ? records : (records?.data ?? []);
      setCollections(rawRecords);
    } catch (err) {
      console.error("Failed to load existing collections:", err);
    }
  };

  useEffect(() => {
    fetchCollections();
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
      setActiveShedId(farmSheds[0].name || farmSheds[0].code || String(farmSheds[0]._id));
    } else {
      setActiveShedId("");
    }
  }, [farmSheds]);

  // Filter animals in active shed
  const activeShedAnimals = useMemo(() => {
    if (!activeShedId) return [];
    return animals.filter(
      (a) =>
        String(a.shed || a.shedId).trim().toUpperCase() ===
        String(activeShedId).trim().toUpperCase() &&
        String(a.farmId?._id || a.farmId?.id || a.farmId) === String(selectedFarmId) &&
        a.status === "ACTIVE"
    );
  }, [activeShedId, animals, selectedFarmId]);

  // Filter animals based on search query
  const searchedAnimals = useMemo(() => {
    const query = searchQuery.trim().toUpperCase();
    if (!query) return activeShedAnimals;
    return activeShedAnimals.filter((a) => String(a.tag || a.tag_id).toUpperCase().includes(query));
  }, [activeShedAnimals, searchQuery]);

  // Reset page when active shed or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeShedId, searchQuery]);

  // 3. Populate existing quantities when collections or active shed changes
  useEffect(() => {
    const newQuantities = {};
    const newSelfConsumptions = {};

    // Get active collections for this farm and date
    const targetDateStr = new Date(selectedDate).toDateString();
    const activeDayCollections = collections.filter(
      (c) => new Date(c.date).toDateString() === targetDateStr
    );

    // Map quantities and self consumptions
    activeDayCollections.forEach((c) => {
      if (c.session === session) {
        const tag = String(c.tag_id || c.tagId).toUpperCase();
        newQuantities[tag] = c.quantity || 0;
        if (c.shedId) {
          newSelfConsumptions[c.shedId] = c.selfConsumption || 0;
        }
      }
    });

    setQuantities(newQuantities);
    setSelfConsumptions(newSelfConsumptions);
  }, [collections, selectedDate, session]);

  // Calculations
  const calculations = useMemo(() => {
    const targetDateStr = new Date(selectedDate).toDateString();
    
    // Day collections overall
    const dayCollections = collections.filter(
      (c) => new Date(c.date).toDateString() === targetDateStr
    );

    // Totals by session
    const morningTotal = dayCollections
      .filter((c) => c.session === "MORNING")
      .reduce((sum, c) => sum + (c.quantity || 0), 0);

    const eveningTotal = dayCollections
      .filter((c) => c.session === "EVENING")
      .reduce((sum, c) => sum + (c.quantity || 0), 0);

    const dayTotal = morningTotal + eveningTotal;

    // Active session stats for CURRENT active shed
    const shedTotal = activeShedAnimals.reduce((sum, a) => {
      const tag = String(a.tag || a.tag_id).toUpperCase();
      return sum + (Number(quantities[tag]) || 0);
    }, 0);

    const shedSelfConsumption = Number(selfConsumptions[activeShedId]) || 0;
    const shedNet = Math.max(0, shedTotal - shedSelfConsumption);

    // Table summary of all sheds for active session
    const shedsSummary = farmSheds.map((s) => {
      const shedKey = s.name || s.code || String(s._id);
      
      const shedAnimals = animals.filter(
        (a) =>
          String(a.shed || a.shedId).trim().toUpperCase() ===
          String(shedKey).trim().toUpperCase() &&
          String(a.farmId?._id || a.farmId?.id || a.farmId) === String(selectedFarmId) &&
          a.status === "ACTIVE"
      );

      const totalQty = shedAnimals.reduce((sum, a) => {
        const tag = String(a.tag || a.tag_id).toUpperCase();
        return sum + (Number(quantities[tag]) || 0);
      }, 0);

      const selfCons = Number(selfConsumptions[shedKey]) || 0;
      const net = Math.max(0, totalQty - selfCons);

      return {
        name: shedKey,
        totalQty,
        selfCons,
        net,
      };
    });

    const summaryTotalQty = shedsSummary.reduce((sum, s) => sum + s.totalQty, 0);
    const summaryTotalSelf = shedsSummary.reduce((sum, s) => sum + s.selfCons, 0);
    const summaryTotalNet = shedsSummary.reduce((sum, s) => sum + s.net, 0);

    return {
      morningTotal,
      eveningTotal,
      dayTotal,
      shedTotal,
      shedSelfConsumption,
      shedNet,
      shedsSummary,
      summaryTotalQty,
      summaryTotalSelf,
      summaryTotalNet,
    };
  }, [collections, selectedDate, session, activeShedId, activeShedAnimals, quantities, selfConsumptions, farmSheds, animals, selectedFarmId]);

  // Paginated animals slice
  const paginatedAnimals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return searchedAnimals.slice(start, start + itemsPerPage);
  }, [searchedAnimals, currentPage]);

  const totalPages = Math.ceil(searchedAnimals.length / itemsPerPage) || 1;

  // Handle quantity inputs
  const handleQuantityChange = (tag, val) => {
    setQuantities((prev) => ({
      ...prev,
      [tag.toUpperCase()]: val,
    }));
  };

  const handleSelfConsumptionChange = (val) => {
    if (!activeShedId) return;
    setSelfConsumptions((prev) => ({
      ...prev,
      [activeShedId]: val,
    }));
  };

  // Submit / Save
  const handleSave = async () => {
    if (!selectedFarmId) {
      swalError("Error", "Please select a farm first.");
      return;
    }
    setIsSaving(true);

    try {
      // Build collections payload array for active shed animals
      const collectionsPayload = activeShedAnimals.map((a) => {
        const tag = String(a.tag || a.tag_id).toUpperCase();
        return {
          tagId: tag,
          quantity: Number(quantities[tag]) || 0,
        };
      });

      const payload = {
        date: selectedDate,
        session,
        farmId: selectedFarmId,
        shedId: activeShedId,
        selfConsumption: Number(selfConsumptions[activeShedId]) || 0,
        collections: collectionsPayload,
      };

      await api.milk.collections.bulkCreate(payload);
      swalSuccess("Success", `Milk collection for ${activeShedId} (${session}) saved successfully.`);
      fetchCollections();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to save milk collection records.");
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
    <div className="p-4 md:p-8 w-full h-full flex flex-col bg-slate-50/20 text-slate-800 font-sans min-h-screen">
      {/* 1. Header Section */}
      <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#071437] tracking-tight flex items-center gap-2">
            🥛 Daily Milk Collection
          </h1>
          <p className="text-sm text-slate-500 font-bold mt-1">
            Log and review yield outputs by session and shed.
          </p>
        </div>
        <button
          onClick={openSettings}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:border-[#D1867D] hover:text-[#D1867D] text-[#16223F] font-bold rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all text-sm self-start sm:self-center"
        >
          ⚙️ Set Farm Order
        </button>
      </div>

      {isLoading ? (
        <SkeletonLoader type="table" columns={4} />
      ) : (
        <div className="flex flex-col xl:flex-row gap-8">
          {/* Main Panel */}
          <div className="flex-1 flex flex-col gap-8">
            {/* Top Filter and Overall Totals Card */}
            <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-100 shadow-xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Date Input */}
              <div className="lg:col-span-3">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full h-12 border border-slate-200 rounded-xl px-4 text-sm font-bold text-[#071437] outline-none focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 transition-all"
                />
              </div>

              {/* Session Input */}
              <div className="lg:col-span-3">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Session
                </label>
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className="w-full h-12 border border-slate-200 rounded-xl px-4 text-sm font-bold text-[#071437] outline-none focus:border-[#D1867D] transition-all bg-white"
                >
                  <option value="MORNING">☀️ MORNING</option>
                  <option value="EVENING">🌙 EVENING</option>
                </select>
              </div>

              {/* Farm Input */}
              <div className="lg:col-span-3">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Farm
                </label>
                <select
                  value={selectedFarmId}
                  onChange={(e) => setSelectedFarmId(e.target.value)}
                  className="w-full h-12 border border-slate-200 rounded-xl px-4 text-sm font-bold text-[#071437] outline-none focus:border-[#D1867D] transition-all bg-white"
                >
                  {farms.map((f) => (
                    <option key={f._id || f.id} value={f._id || f.id}>
                      🏡 {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day Overall stats */}
              <div className="lg:col-span-3 flex flex-col md:flex-row lg:flex-col gap-3 justify-between">
                <div className="flex justify-between items-center bg-slate-50/50 rounded-xl p-2.5 border border-slate-100 flex-1 hover:border-blue-100 transition-colors">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Morning Total</span>
                  <span className="text-sm font-black text-blue-600">{calculations.morningTotal} L</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50/50 rounded-xl p-2.5 border border-slate-100 flex-1 hover:border-emerald-100 transition-colors">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evening Total</span>
                  <span className="text-sm font-black text-emerald-600">{calculations.eveningTotal} L</span>
                </div>
                <div className="flex justify-between items-center bg-[#16223F]/5 rounded-xl p-2.5 border border-[#16223F]/10 flex-1 hover:border-[#16223F]/20 transition-colors">
                  <span className="text-[10px] font-black text-[#071437] uppercase tracking-widest">Day Total</span>
                  <span className="text-sm font-black text-[#16223F]">{calculations.dayTotal} L</span>
                </div>
              </div>
            </div>

            {/* Shed Tabs and Search row */}
            <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                {/* Shed Tabs */}
                <div className="flex flex-wrap gap-2">
                  {farmSheds.map((s) => {
                    const shedKey = s.name || s.code || String(s._id);
                    const animalCount = animals.filter(
                      (a) =>
                        String(a.shed || a.shedId).trim().toUpperCase() ===
                        String(shedKey).trim().toUpperCase() &&
                        String(a.farmId?._id || a.farmId?.id || a.farmId) === String(selectedFarmId) &&
                        a.status === "ACTIVE"
                    ).length;

                    return (
                      <button
                        key={shedKey}
                        onClick={() => {
                          setActiveShedId(shedKey);
                          setSearchQuery("");
                        }}
                        className={`h-11 px-5 rounded-xl text-sm font-black transition-all flex items-center gap-2 border ${
                          activeShedId === shedKey
                            ? "bg-[#16223F] border-[#16223F] text-white shadow-md shadow-[#16223F]/15"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200/60"
                        }`}
                      >
                        🏡 {shedKey} ({animalCount})
                      </button>
                    );
                  })}
                </div>

                {/* Search box */}
                <div className="w-full md:max-w-xs relative">
                  <input
                    type="text"
                    placeholder="Search Tag ID / Animal No..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-4 text-xs font-bold text-[#071437] outline-none focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Active Shed Title and Details */}
              <div className="p-6 bg-slate-50/30 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-lg font-black text-[#071437]">
                    {activeShedId ? `${activeShedId} - ${session} SESSION` : "NO ACTIVE SHED"}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">
                    Enter milk quantity for all active animals
                  </p>
                </div>

                {/* Total indicators for session/shed */}
                <div className="flex flex-wrap gap-3">
                  <div className="bg-blue-50 border border-blue-100/50 rounded-2xl px-5 py-3 flex flex-col items-center shadow-inner hover:-translate-y-0.5 transition-all">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Session Total</span>
                    <span className="text-lg font-black text-blue-700 mt-1">{calculations.shedTotal} L</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-100/50 rounded-2xl px-5 py-3 flex flex-col items-center shadow-inner hover:-translate-y-0.5 transition-all">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Self Consumption</span>
                    <span className="text-lg font-black text-amber-700 mt-1">{calculations.shedSelfConsumption} L</span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100/50 rounded-2xl px-5 py-3 flex flex-col items-center shadow-inner hover:-translate-y-0.5 transition-all">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Net Milk</span>
                    <span className="text-lg font-black text-emerald-700 mt-1">{calculations.shedNet} L</span>
                  </div>
                </div>
              </div>

              {/* Grid of Animals */}
              <div className="p-6 bg-slate-50/10">
                {searchedAnimals.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-bold text-sm">
                    No active animals found in {activeShedId || "this farm"}.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {paginatedAnimals.map((animal, idx) => {
                      const tag = String(animal.tag || animal.tag_id).toUpperCase();
                      const animalIndex = (currentPage - 1) * itemsPerPage + idx + 1;

                      return (
                        <div
                          key={tag}
                          className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-[#D1867D]/30 transition-all duration-300"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-slate-300">#{animalIndex}</span>
                            <span className="text-xs font-black text-[#071437] font-mono bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{tag}</span>
                          </div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Quantity (L)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={quantities[tag] !== undefined ? quantities[tag] : ""}
                            onChange={(e) => handleQuantityChange(tag, e.target.value)}
                            placeholder="0"
                            className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm font-black text-[#071437] focus:border-[#D1867D] focus:ring-1 focus:ring-[#D1867D]/10 outline-none text-center transition-all"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pagination controls & Self consumption field at bottom */}
              <div className="p-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/20">
                {/* Self consumption field */}
                {activeShedId && (
                  <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 max-w-sm w-full shadow-inner">
                    <div className="flex-1">
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Self Consumption (Session)
                      </span>
                      <p className="text-[9px] text-slate-400 mt-0.5 leading-none font-bold">
                        Deducted from session total.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={selfConsumptions[activeShedId] !== undefined ? selfConsumptions[activeShedId] : ""}
                        onChange={(e) => handleSelfConsumptionChange(e.target.value)}
                        placeholder="0"
                        className="w-16 h-10 border border-slate-200 rounded-xl text-center font-black text-[#071437] focus:border-[#D1867D] outline-none transition-all"
                      />
                      <span className="text-xs font-black text-[#071437]">L</span>
                    </div>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold bg-white hover:bg-slate-50 disabled:opacity-40 transition-all"
                    >
                      Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-10 h-10 rounded-xl text-xs font-bold border ${
                          currentPage === p
                            ? "bg-[#16223F] border-[#16223F] text-white"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        } transition-all`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold bg-white hover:bg-slate-50 disabled:opacity-40 transition-all"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Summary & Save Panel */}
          <div className="w-full xl:w-80 flex flex-col gap-6 flex-shrink-0">
            {/* Shed Summary Table */}
            <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-100 shadow-xl p-6">
              <h3 className="text-md font-black text-[#071437] mb-4">
                Sheds Summary ({session === "MORNING" ? "Morning" : "Evening"})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase font-black tracking-widest text-[9px]">
                      <th className="pb-3">Shed</th>
                      <th className="pb-3 text-right">Qty</th>
                      <th className="pb-3 text-right">Self Cons.</th>
                      <th className="pb-3 text-right">Net Milk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-bold">
                    {calculations.shedsSummary.map((s) => (
                      <tr key={s.name} className="text-[#071437] hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 font-black">🏡 {s.name}</td>
                        <td className="py-3 text-right text-blue-600">{s.totalQty} L</td>
                        <td className="py-3 text-right text-amber-600">{s.selfCons} L</td>
                        <td className="py-3 text-right text-emerald-600">{s.net} L</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-100 text-[#071437] font-black bg-slate-50/50">
                      <td className="py-3 pl-2">TOTAL</td>
                      <td className="py-3 text-right text-blue-700">{calculations.summaryTotalQty} L</td>
                      <td className="py-3 text-right text-amber-700">{calculations.summaryTotalSelf} L</td>
                      <td className="py-3 text-right text-emerald-700">{calculations.summaryTotalNet} L</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving || !activeShedId}
                className="w-full py-4 bg-[#16223F] hover:bg-[#2a3f75] text-white font-black rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                💾 {isSaving ? "Saving..." : `Save ${session === "MORNING" ? "Morning" : "Evening"} Data`}
              </button>

              <button
                onClick={() => setSession((s) => (s === "MORNING" ? "EVENING" : "MORNING"))}
                className="w-full py-4 bg-white border border-slate-200 hover:bg-slate-50 hover:border-[#D1867D]/30 text-[#16223F] font-black rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
              >
                🔄 Switch to {session === "MORNING" ? "Evening" : "Morning"} Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Brand Settings Modal (reordering) */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-[#071437]/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fadeIn">
          <div className="bg-white p-7 rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto border border-slate-100 relative">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-all font-bold z-10"
              type="button"
            >
              ✕
            </button>

            <h2 className="text-xl font-black mb-1 text-[#071437] tracking-tight">Set Farm Display Order</h2>
            <p className="text-xs text-slate-400 font-bold mb-6 uppercase tracking-wider">
              Sort how farms appear in your lists
            </p>

            <div className="space-y-2 mb-6">
              {tempFarmsOrder.map((farm, index) => (
                <div
                  key={farm._id || farm.id}
                  className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-slate-200 transition-all"
                >
                  <span className="font-bold text-sm text-[#071437] flex items-center gap-2">
                    🏡 {farm.name}
                  </span>
                  
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => moveFarm(index, -1)}
                      disabled={index === 0}
                      className="w-8 h-8 flex items-center justify-center border border-slate-200 hover:border-[#D1867D] hover:text-[#D1867D] rounded-xl bg-white text-slate-500 disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-500 font-black transition-all"
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveFarm(index, 1)}
                      disabled={index === tempFarmsOrder.length - 1}
                      className="w-8 h-8 flex items-center justify-center border border-slate-200 hover:border-[#D1867D] hover:text-[#D1867D] rounded-xl bg-white text-slate-500 disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-500 font-black transition-all"
                      title="Move Down"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveFarmsOrder}
                className="flex-1 py-3 bg-[#16223F] hover:bg-[#2a3f75] text-white font-bold rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all text-xs"
              >
                Save Display Order
              </button>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 bg-slate-100 text-slate-600 hover:bg-slate-200 py-3 rounded-2xl font-bold shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all border border-slate-200 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
