import React, { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError } from "../utils/swal";
import SkeletonLoader from "./SkeletonLoader";
import ModulePageHeader from "./ModulePageHeader";
import { Calendar as CalendarIcon, Save, ChevronDown } from "lucide-react";

export default function DailyMilkQuality() {
  const [bmcsList, setBmcsList] = useState([]);
  const [collectionsList, setCollectionsList] = useState([]);
  const [qaLogsList, setQaLogsList] = useState([]);
  const [farmsList, setFarmsList] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [focusedBmcId, setFocusedBmcId] = useState(null);

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Grid values state: bmcId -> { liters, fat, snf, density, water, temperature, _id }
  const [rowValues, setRowValues] = useState({});

  // 1. Initial Data Fetch
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const [bmcs, farmsData] = await Promise.all([
          api.bmcs.getAll(),
          api.farms.getAll().catch(() => [])
        ]);

        const finalFarms = Array.isArray(farmsData) ? farmsData : (farmsData?.data ?? []);
        setFarmsList(finalFarms);

        const storedActive = localStorage.getItem('__active_farm_id__');
        let activeId = "";
        if (storedActive && storedActive !== 'ALL') {
          activeId = storedActive;
        } else if (finalFarms && finalFarms.length > 0) {
          activeId = finalFarms[0]._id || finalFarms[0].id;
        }
        setSelectedFarmId(activeId);

        const activeBmcs = (Array.isArray(bmcs) ? bmcs : (bmcs?.data ?? [])).filter(
          b => String(b.status || "").trim().toUpperCase() === "ACTIVE" &&
               !b.isDeleted &&
               (!activeId || String(b.farmId?._id || b.farmId?.id || b.farmId) === activeId)
        );
        setBmcsList(activeBmcs);
      } catch (err) {
        console.error(err);
        swalError("Error", "Failed to load BMCs list.");
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Filter BMCs list when active farm changes
  useEffect(() => {
    if (!selectedFarmId) return;
    api.bmcs.getAll().then((bmcs) => {
      const activeBmcs = (Array.isArray(bmcs) ? bmcs : (bmcs?.data ?? [])).filter(
        b => String(b.status || "").trim().toUpperCase() === "ACTIVE" &&
             !b.isDeleted &&
             String(b.farmId?._id || b.farmId?.id || b.farmId) === selectedFarmId
      );
      setBmcsList(activeBmcs);
    }).catch(console.error);
  }, [selectedFarmId]);

  // 2. Fetch collections & QA logs when date changes
  const fetchDataForDate = async () => {
    try {
      const [collectionsRes, qaRes] = await Promise.all([
        api.milk.collections.getAll().catch(() => []),
        api.milk.quality.getAll().catch(() => [])
      ]);
      setCollectionsList(Array.isArray(collectionsRes) ? collectionsRes : (collectionsRes?.data ?? []));
      setQaLogsList(Array.isArray(qaRes) ? qaRes : (qaRes?.data ?? []));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDataForDate();
  }, [selectedDate]);

  // Helper for timezone-safe local date string
  const toLocalYMD = (dVal) => {
    if (!dVal) return "";
    const d = new Date(dVal);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString('en-CA');
  };

  // 3. Match collections and populate existing values
  const targetDateStr = useMemo(() => toLocalYMD(selectedDate), [selectedDate]);

  const totalCollectedNet = useMemo(() => {
    const dayCollections = collectionsList.filter(
      (c) => toLocalYMD(c.date) === targetDateStr &&
             !c.isDeleted &&
             (!selectedFarmId || String(c.farmId?._id || c.farmId?.id || c.farmId) === selectedFarmId)
    );
    const groups = {};
    dayCollections.forEach(c => {
      const groupKey = `${c.shedId}_${c.session}`;
      if (!groups[groupKey]) {
        groups[groupKey] = { quantity: 0, selfConsumption: c.selfConsumption || 0 };
      }
      groups[groupKey].quantity += c.quantity || 0;
    });
    let total = 0;
    Object.values(groups).forEach(g => {
      total += Math.max(0, g.quantity - g.selfConsumption);
    });
    return total;
  }, [collectionsList, targetDateStr, selectedFarmId]);

  useEffect(() => {
    // Group existing QA records on this date by bmcId
    const dayQaLogs = qaLogsList.filter(
      (q) => toLocalYMD(q.date) === targetDateStr &&
             !q.isDeleted &&
             (!selectedFarmId || String(q.farmId?._id || q.farmId?.id || q.farmId) === selectedFarmId)
    );

    const bmcToQa = {};
    dayQaLogs.forEach(q => {
      if (Array.isArray(q.bmcs)) {
        q.bmcs.forEach(b => {
          if (b.bmcId) {
            bmcToQa[b.bmcId] = {
              _id: q._id || q.id,
              liters: b.liters !== undefined ? String(b.liters) : "",
              fat: q.fat !== undefined ? String(q.fat) : "",
              snf: q.snf !== undefined ? String(q.snf) : "",
              density: q.density !== undefined ? String(q.density) : "",
              water: q.water !== undefined ? String(q.water) : "",
              temperature: q.temperature !== undefined ? String(q.temperature) : ""
            };
          }
        });
      }
    });

    // Initialize values for all BMCs
    const initialRows = {};
    bmcsList.forEach(b => {
      const bId = b._id || b.id;
      if (bmcToQa[bId]) {
        initialRows[bId] = bmcToQa[bId];
      } else {
        initialRows[bId] = {
          _id: "",
          liters: "",
          fat: "",
          snf: "",
          density: "",
          water: "",
          temperature: ""
        };
      }
    });

    setRowValues(initialRows);
  }, [bmcsList, qaLogsList, targetDateStr, selectedFarmId]);

  // Handle cell inputs
  const handleCellChange = (bmcId, field, val) => {
    setRowValues(prev => ({
      ...prev,
      [bmcId]: {
        ...prev[bmcId],
        [field]: val
      }
    }));
  };

  const totalEnteredQa = useMemo(() => {
    let sum = 0;
    Object.values(rowValues).forEach(r => {
      sum += Number(r.liters) || 0;
    });
    return sum;
  }, [rowValues]);

  const availableMilk = Math.max(0, totalCollectedNet - totalEnteredQa);

  const averageMetrics = useMemo(() => {
    let count = 0;
    let totalTemp = 0;
    let totalFat = 0;
    let totalSnf = 0;
    let totalDensity = 0;
    let totalWater = 0;

    Object.values(rowValues).forEach(r => {
      const isFilled = [r.liters, r.fat, r.snf, r.density, r.water, r.temperature].every(v => String(v).trim() !== "");
      if (isFilled) {
        count++;
        totalTemp += Number(r.temperature) || 0;
        totalFat += Number(r.fat) || 0;
        totalSnf += Number(r.snf) || 0;
        totalDensity += Number(r.density) || 0;
        totalWater += Number(r.water) || 0;
      }
    });

    if (count === 0) {
      return { temperature: 0, fat: 0, snf: 0, density: 0, water: 0 };
    }

    return {
      temperature: Number((totalTemp / count).toFixed(2)),
      fat: Number((totalFat / count).toFixed(2)),
      snf: Number((totalSnf / count).toFixed(2)),
      density: Number((totalDensity / count).toFixed(2)),
      water: Number((totalWater / count).toFixed(2))
    };
  }, [rowValues]);

  const isTallied = useMemo(() => {
    return Number(totalEnteredQa.toFixed(2)) === Number(totalCollectedNet.toFixed(2));
  }, [totalEnteredQa, totalCollectedNet]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validate that if any cell is filled, all cells in that row are filled (mandatory)
      for (const bmc of bmcsList) {
        const bId = bmc._id || bmc.id;
        const row = rowValues[bId] || {};
        const { liters, fat, snf, density, water, temperature } = row;

        const hasAnyValue = [liters, fat, snf, density, water, temperature].some(v => String(v).trim() !== "");
        if (hasAnyValue) {
          const hasEmpty = [liters, fat, snf, density, water, temperature].some(v => String(v).trim() === "");
          if (hasEmpty) {
            swalError("Validation Error", `All Milk QA fields (Liters, Temperature, Fat, SNF, CLR, Water) are mandatory for BMC: ${bmc.name || bmc.code}`);
            setIsSaving(false);
            return;
          }
          if (Number(liters) <= 0) {
            swalError("Validation Error", `Milk quantity (Liters) must be greater than zero for BMC: ${bmc.name || bmc.code}`);
            setIsSaving(false);
            return;
          }
        }
      }

      if (totalEnteredQa > totalCollectedNet) {
        swalError("Validation Error", `Total QA logged (${totalEnteredQa.toFixed(2)} L) cannot exceed the total collected milk yield (${totalCollectedNet.toFixed(2)} L) for this date.`);
        setIsSaving(false);
        return;
      }

      // Save each row
      await Promise.all(
        bmcsList.map(async (bmc) => {
          const bId = bmc._id || bmc.id;
          const row = rowValues[bId] || {};
          const { _id, liters, fat, snf, density, water, temperature } = row;

          const isFilled = [liters, fat, snf, density, water, temperature].every(v => String(v).trim() !== "");

          if (isFilled) {
            const payload = {
              date: new Date(selectedDate).toISOString(),
              fat: Number(fat),
              snf: Number(snf),
              density: Number(density),
              water: Number(water),
              temperature: Number(temperature),
              bmcs: [{ bmcId: bId, name: bmc.name || bmc.code, liters: Number(liters) }]
            };
            if (selectedFarmId) {
              payload.farmId = selectedFarmId;
            }

            if (_id) {
              await api.milk.quality.update(_id, payload);
            } else {
              await api.milk.quality.create(payload);
            }
          } else if (_id) {
            // Deleted / Cleared row
            await api.milk.quality.delete(_id);
          }
        })
      );

      swalSuccess("Success", "Daily Milk QA logs saved successfully.");
      await fetchDataForDate();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to save daily Milk QA logs.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-10 w-full h-full flex flex-col bg-slate-50/50 text-slate-800 font-sans min-h-screen">
      
      {/* Page Header */}
      <ModulePageHeader
        title="Daily Milk QA Log"
        description="Verify milk chemistry, temperature parameters, and allocate storage yields directly into Bulk Milk Coolers."
      />

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-6">
        
        {/* Table & Form Panel */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-100/80 shadow-[0_12px_40px_rgba(0,0,0,0.03)] p-8">
            
            {/* Date & Farm Picker Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center border-b border-slate-100 pb-6 mb-6">
              <div className="md:col-span-6">
                <h3 className="text-sm font-black text-[#16223F] uppercase tracking-wider">Milk QA Spreadsheet</h3>
                <p className="text-xs font-semibold text-slate-400">Enter parameters directly for each Bulk Milk Cooler.</p>
              </div>
              <div className="md:col-span-3 relative">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Collection Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full h-10 bg-slate-50/50 border border-slate-200/80 rounded-xl pl-11 pr-4 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 transition-all duration-300"
                  />
                </div>
              </div>
              <div className="md:col-span-3 relative">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Active Farm</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🏡</span>
                  <select
                    value={selectedFarmId}
                    onChange={(e) => {
                      const newFarmId = e.target.value;
                      localStorage.setItem('__active_farm_id__', newFarmId);
                      setSelectedFarmId(newFarmId);
                    }}
                    className="w-full h-10 bg-slate-50/50 border border-slate-200/80 rounded-xl pl-11 pr-10 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 appearance-none transition-all duration-300"
                  >
                    {farmsList.map((f) => (
                      <option key={f._id || f.id} value={f._id || f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {isLoading ? (
              <SkeletonLoader type="table" columns={8} />
            ) : bmcsList.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-xs font-bold text-slate-400">No active Bulk Milk Coolers (BMCs) found in management registry.</p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-2 text-left">⚡ BMC Name</th>
                      <th className="py-3 px-2 w-28 text-center">Liters (L)</th>
                      <th className="py-3 px-2 w-28 text-center">Temp (°C)</th>
                      <th className="py-3 px-2 w-24 text-center">Fat %</th>
                      <th className="py-3 px-2 w-24 text-center">SNF %</th>
                      <th className="py-3 px-2 w-32 text-center">CLR / Density</th>
                      <th className="py-3 px-2 w-24 text-center">Water %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bmcsList.map(bmc => {
                      const bId = bmc._id || bmc.id;
                      const row = rowValues[bId] || {};
                      const isFocused = focusedBmcId === bId;
                      return (
                        <tr
                          key={bId}
                          className={`border-b border-slate-50 hover:bg-slate-50/50 transition-all border-l-4 ${
                            isFocused ? "bg-slate-50/70 border-l-[#D1867D]" : "border-l-transparent"
                          }`}
                        >
                          <td className="py-4 px-2 align-middle">
                            <span className="text-xs font-black text-slate-800 block">❄️ {bmc.name || bmc.code}</span>
                            <span className="text-[10px] font-bold text-slate-400">Cap: {bmc.capacity} L</span>
                          </td>
                          <td className="py-3 px-2 align-middle">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0.0"
                              value={row.liters || ""}
                              onFocus={() => setFocusedBmcId(bId)}
                              onBlur={() => setFocusedBmcId(null)}
                              onChange={(e) => handleCellChange(bId, "liters", e.target.value)}
                              className="w-full h-9 px-2 bg-slate-50/30 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center outline-none focus:border-[#D1867D] focus:bg-white transition-all"
                            />
                          </td>
                          <td className="py-3 px-2 align-middle">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0.0"
                              value={row.temperature || ""}
                              onFocus={() => setFocusedBmcId(bId)}
                              onBlur={() => setFocusedBmcId(null)}
                              onChange={(e) => handleCellChange(bId, "temperature", e.target.value)}
                              className="w-full h-9 px-2 bg-slate-50/30 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center outline-none focus:border-[#D1867D] focus:bg-white transition-all"
                            />
                          </td>
                          <td className="py-3 px-2 align-middle">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0.0"
                              value={row.fat || ""}
                              onFocus={() => setFocusedBmcId(bId)}
                              onBlur={() => setFocusedBmcId(null)}
                              onChange={(e) => handleCellChange(bId, "fat", e.target.value)}
                              className="w-full h-9 px-2 bg-slate-50/30 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center outline-none focus:border-[#D1867D] focus:bg-white transition-all"
                            />
                          </td>
                          <td className="py-3 px-2 align-middle">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0.0"
                              value={row.snf || ""}
                              onFocus={() => setFocusedBmcId(bId)}
                              onBlur={() => setFocusedBmcId(null)}
                              onChange={(e) => handleCellChange(bId, "snf", e.target.value)}
                              className="w-full h-9 px-2 bg-slate-50/30 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center outline-none focus:border-[#D1867D] focus:bg-white transition-all"
                            />
                          </td>
                          <td className="py-3 px-2 align-middle">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0.0"
                              value={row.density || ""}
                              onFocus={() => setFocusedBmcId(bId)}
                              onBlur={() => setFocusedBmcId(null)}
                              onChange={(e) => handleCellChange(bId, "density", e.target.value)}
                              className="w-full h-9 px-2 bg-slate-50/30 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center outline-none focus:border-[#D1867D] focus:bg-white transition-all"
                            />
                          </td>
                          <td className="py-3 px-2 align-middle">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0.0"
                              value={row.water || ""}
                              onFocus={() => setFocusedBmcId(bId)}
                              onBlur={() => setFocusedBmcId(null)}
                              onChange={(e) => handleCellChange(bId, "water", e.target.value)}
                              className="w-full h-9 px-2 bg-slate-50/30 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center outline-none focus:border-[#D1867D] focus:bg-white transition-all"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-8 pt-6 border-t border-slate-100 w-full">
              <div>
                {totalEnteredQa > totalCollectedNet && (
                  <span className="text-xs text-red-500 font-bold">
                    ⚠️ Entered quantity cannot exceed total collected milk ({totalEnteredQa.toFixed(2)} L entered vs {totalCollectedNet.toFixed(2)} L collected)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || totalEnteredQa > totalCollectedNet}
                className={`inline-flex items-center justify-center gap-2 px-6 py-3 font-black rounded-2xl shadow-lg active:scale-[0.98] transition-all duration-300 text-xs ${
                  (totalEnteredQa > totalCollectedNet)
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-[#16223F] hover:bg-[#20315a] text-white shadow-[#16223F]/10 hover:shadow-xl'
                }`}
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Saving Daily logs..." : "Save Daily Milk QA"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Stats Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Yield Allocator status card */}
          <div className="bg-white/95 rounded-3xl border border-slate-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <h3 className="text-xs font-black text-[#16223F] uppercase tracking-wider mb-4">Yield Allocation Status</h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Milk Collected</span>
                  <span className="text-sm font-black text-slate-800">{totalCollectedNet.toLocaleString()} L</span>
                </div>
                <span className="text-xl">🥛</span>
              </div>
              
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Total QA Logged</span>
                  <span className="text-sm font-black text-slate-800">{totalEnteredQa.toLocaleString()} L</span>
                </div>
                <span className="text-xl">❄️</span>
              </div>

              <div className={`p-4 border rounded-2xl flex justify-between items-center ${availableMilk === 0 && totalCollectedNet > 0 ? 'bg-red-50/50 border-red-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Remaining Available Milk</span>
                  <span className={`text-sm font-black ${availableMilk === 0 && totalCollectedNet > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                    {availableMilk.toLocaleString()} L
                  </span>
                </div>
                <span className="text-xl">✨</span>
              </div>
            </div>
          </div>

          {/* Average Quality Metrics card */}
          <div className="bg-white/95 rounded-3xl border border-slate-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
            <h3 className="text-xs font-black text-[#16223F] uppercase tracking-wider mb-4">Average Quality Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                <span className="text-slate-400 font-bold">Avg Temperature:</span>
                <span className="text-slate-800 font-black">{averageMetrics.temperature} °C</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                <span className="text-slate-400 font-bold">Avg Fat:</span>
                <span className="text-slate-800 font-black">{averageMetrics.fat} %</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                <span className="text-slate-400 font-bold">Avg SNF:</span>
                <span className="text-slate-800 font-black">{averageMetrics.snf} %</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                <span className="text-slate-400 font-bold">Avg CLR / Density:</span>
                <span className="text-slate-800 font-black">{averageMetrics.density}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold">Avg Water:</span>
                <span className="text-slate-800 font-black">{averageMetrics.water} %</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
