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

  const itemsPerPage = 20;

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
          setFarms(farmsData || []);
          setSheds(shedsData || []);
          
          const rawAnimals = Array.isArray(animalsData) ? animalsData : (animalsData?.data ?? []);
          setAnimals(rawAnimals);

          if (farmsData && farmsData.length > 0) {
            setSelectedFarmId(farmsData[0]._id || farmsData[0].id);
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

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col bg-transparent text-slate-800 font-sans">
      {/* 1. Header Section */}
      <div className="flex-none flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#16223F] tracking-tight flex items-center gap-2">
            🥛 Daily Milk Collection
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Enter milk quantity for all animals by shed and session.
          </p>
        </div>
      </div>

      {isLoading ? (
        <SkeletonLoader type="table" columns={4} />
      ) : (
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Main Panel */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Top Filter and Overall Totals Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Date Input */}
              <div className="lg:col-span-3">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full h-12 border border-slate-200 rounded-xl px-4 text-sm font-semibold text-[#16223F] outline-none focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 transition-all"
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
                  className="w-full h-12 border border-slate-200 rounded-xl px-4 text-sm font-semibold text-[#16223F] outline-none focus:border-[#D1867D] transition-all bg-white"
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
                  className="w-full h-12 border border-slate-200 rounded-xl px-4 text-sm font-semibold text-[#16223F] outline-none focus:border-[#D1867D] transition-all bg-white"
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
                <div className="flex justify-between items-center bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Morning Total</span>
                  <span className="text-sm font-black text-blue-600">{calculations.morningTotal} L</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evening Total</span>
                  <span className="text-sm font-black text-emerald-600">{calculations.eveningTotal} L</span>
                </div>
                <div className="flex justify-between items-center bg-[#16223F]/5 rounded-xl p-2.5 border border-[#16223F]/10 flex-1">
                  <span className="text-[10px] font-black text-[#16223F] uppercase tracking-widest">Day Total</span>
                  <span className="text-sm font-black text-[#16223F]">{calculations.dayTotal} L</span>
                </div>
              </div>
            </div>

            {/* Shed Tabs and Search row */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
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
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-4 text-xs font-semibold text-[#16223F] outline-none focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Active Shed Title and Details */}
              <div className="p-6 bg-slate-50/40 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-lg font-black text-[#16223F]">
                    {activeShedId ? `${activeShedId} - ${session} SESSION` : "NO ACTIVE SHED"}
                  </h3>
                  <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider">
                    Enter milk quantity for all active animals
                  </p>
                </div>

                {/* Total indicators for session/shed */}
                <div className="flex gap-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 flex flex-col items-center">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Session Total</span>
                    <span className="text-lg font-black text-blue-700 mt-1">{calculations.shedTotal} L</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3 flex flex-col items-center">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Self Consumption</span>
                    <span className="text-lg font-black text-amber-700 mt-1">{calculations.shedSelfConsumption} L</span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-3 flex flex-col items-center">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Net Milk</span>
                    <span className="text-lg font-black text-emerald-700 mt-1">{calculations.shedNet} L</span>
                  </div>
                </div>
              </div>

              {/* Grid of Animals */}
              <div className="p-6">
                {searchedAnimals.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-semibold text-sm">
                    No animals found in {activeShedId || "this farm"}.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {paginatedAnimals.map((animal, idx) => {
                      const tag = String(animal.tag || animal.tag_id).toUpperCase();
                      const animalIndex = (currentPage - 1) * itemsPerPage + idx + 1;

                      return (
                        <div
                          key={tag}
                          className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:border-[#D1867D]/40 transition-all"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-slate-300">#{animalIndex}</span>
                            <span className="text-xs font-black text-[#16223F] font-mono">{tag}</span>
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
                            className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm font-black text-slate-800 focus:border-[#D1867D] outline-none text-center"
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
                  <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 max-w-sm w-full">
                    <div className="flex-1">
                      <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        Self Consumption (Session)
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
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
                        className="w-16 h-10 border border-slate-200 rounded-xl text-center font-black text-slate-800 focus:border-[#D1867D] outline-none"
                      />
                      <span className="text-xs font-bold text-[#16223F]">L</span>
                    </div>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold bg-white hover:bg-slate-50 disabled:opacity-40"
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
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-bold bg-white hover:bg-slate-50 disabled:opacity-40"
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
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-md font-black text-[#16223F] mb-4">
                All Sheds Summary ({session === "MORNING" ? "Morning" : "Evening"})
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
                      <tr key={s.name} className="text-[#16223F]">
                        <td className="py-3 font-black">🏡 {s.name}</td>
                        <td className="py-3 text-right text-blue-600">{s.totalQty} L</td>
                        <td className="py-3 text-right text-amber-600">{s.selfCons} L</td>
                        <td className="py-3 text-right text-emerald-600">{s.net} L</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-100 text-[#16223F] font-black bg-slate-50/50">
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
                className="w-full py-4 bg-[#16223F] hover:bg-[#2a3f75] text-white font-black rounded-2xl shadow-lg shadow-[#16223F]/15 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                💾 {isSaving ? "Saving..." : `Save ${session === "MORNING" ? "Morning" : "Evening"} Data`}
              </button>

              <button
                onClick={() => setSession((s) => (s === "MORNING" ? "EVENING" : "MORNING"))}
                className="w-full py-4 bg-white border border-slate-200 hover:bg-slate-50 text-[#16223F] font-black rounded-2xl shadow-sm transition-all text-sm flex items-center justify-center gap-2"
              >
                🔄 Switch to {session === "MORNING" ? "Evening" : "Morning"} Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
