import React, { useState, useEffect, useRef } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError } from "../utils/swal";
import SkeletonLoader from './SkeletonLoader';

const LineManagementPg = () => {
  const [sheds, setSheds] = useState([]);
  const [farms, setFarms] = useState([]);
  const [selectedShedId, setSelectedShedId] = useState("");
  const [selectedShed, setSelectedShed] = useState(null);
  const [selectedRowNum, setSelectedRowNum] = useState(1);
  const [cattleData, setCattleData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Slot Assignment States (Keyed by `${rowNum}-${slotNum}`)
  const [slotSearchQueries, setSlotSearchQueries] = useState({});
  const [selectedAnimalsForSlot, setSelectedAnimalsForSlot] = useState({});
  const [activeDropdownSlot, setActiveDropdownSlot] = useState(null);

  // Replace Modal States
  const [replaceModalData, setReplaceModalData] = useState(null); // { rowNum, slotNum, oldAnimal }
  const [replaceSearchQuery, setReplaceSearchQuery] = useState("");
  const [selectedReplacementAnimal, setSelectedReplacementAnimal] = useState(null);
  const [showReplaceDropdown, setShowReplaceDropdown] = useState(false);

  const dropdownRef = useRef(null);

  const getFarmName = (fId) => {
    if (!fId) return 'Unknown';
    if (typeof fId === 'object') return fId.name || fId.code;
    const farm = Array.isArray(farms) ? farms.find(f => (f?._id || f?.id) === fId) : null;
    return farm ? farm.name : fId;
  };

  const fetchShedsAndFarms = async (autoSelectId = null, silent = false) => {
    if (!silent) setIsFetching(true);
    try {
      const [shedsData, farmsData, cattleRes] = await Promise.all([
        api.sheds.getAll(),
        api.farms.getAll(),
        api.cattle.getAll().catch(() => [])
      ]);
      
      const activeSheds = shedsData || [];
      const lineManagedSheds = activeSheds.filter(s => s.lineManagement === "Yes");
      
      setSheds(lineManagedSheds);
      setFarms(farmsData || []);
      setCattleData(Array.isArray(cattleRes) ? cattleRes : (cattleRes?.data ?? []));

      // Handle selection updates
      if (lineManagedSheds.length > 0) {
        const targetId = autoSelectId || selectedShedId || lineManagedSheds[0]?._id || lineManagedSheds[0]?.id;
        setSelectedShedId(targetId);
        const found = lineManagedSheds.find(s => (s._id || s.id) === targetId);
        setSelectedShed(found || lineManagedSheds[0]);
        
        // Default active row logic
        const maxRows = found ? found.lines : lineManagedSheds[0]?.lines || 0;
        if (selectedRowNum > maxRows || selectedRowNum <= 0) {
          setSelectedRowNum(1);
        }
      } else {
        setSelectedShedId("");
        setSelectedShed(null);
        setSelectedRowNum(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchShedsAndFarms();

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdownSlot(null);
        setShowReplaceDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShedId]);

  // ASSIGN ANIMAL TO SLOT HANDLER
  const handleAssignAnimal = async (rowNum, slotNum) => {
    const slotKey = `${rowNum}-${slotNum}`;
    const animal = selectedAnimalsForSlot[slotKey];
    if (!animal || !selectedShed) return;

    setIsLoading(true);
    try {
      const targetId = animal._id || animal.id;
      const targetFarmId = selectedShed.farmId?._id || selectedShed.farmId?.id || selectedShed.farmId || animal.farmId;
      const payload = {
        ...animal,
        shed: selectedShed.code,
        shedId: selectedShed.code,
        farmId: targetFarmId,
        lineNo: Number(rowNum),
        position: Number(slotNum)
      };

      await api.cattle.update(targetId, payload);
      swalSuccess("Success", `Assigned animal #${animal.tag || animal.tag_id} to Position ${slotNum}`);
      
      // Clear inputs
      setSlotSearchQueries(prev => ({ ...prev, [slotKey]: "" }));
      setSelectedAnimalsForSlot(prev => ({ ...prev, [slotKey]: null }));
      
      await fetchShedsAndFarms(selectedShed._id || selectedShed.id, true);
    } catch (err) {
      console.error(err);
      swalError("Error", typeof err === 'string' ? err : "Failed to assign animal.");
    } finally {
      setIsLoading(false);
    }
  };

  // REMOVE ANIMAL FROM ROW HANDLER
  const handleRemoveAnimal = async (animal) => {
    if (!selectedShed) return;

    setIsLoading(true);
    try {
      const targetId = animal._id || animal.id;
      const payload = {
        ...animal,
        lineNo: 0,
        position: 0
      };

      await api.cattle.update(targetId, payload);
      swalSuccess("Success", `Removed animal #${animal.tag || animal.tag_id} from row.`);
      await fetchShedsAndFarms(selectedShed._id || selectedShed.id, true);
    } catch (err) {
      console.error(err);
      swalError("Error", typeof err === 'string' ? err : "Failed to remove animal.");
    } finally {
      setIsLoading(false);
    }
  };

  // REPLACE ANIMAL IN SLOT HANDLER
  const handleReplaceAnimal = async () => {
    if (!replaceModalData || !selectedReplacementAnimal || !selectedShed) return;
    const { rowNum, slotNum, oldAnimal } = replaceModalData;

    setIsLoading(true);
    try {
      // 1. Remove old animal
      await api.cattle.update(oldAnimal._id || oldAnimal.id, {
        ...oldAnimal,
        lineNo: 0,
        position: 0
      });

      // 2. Assign new animal to this slot
      const targetFarmId = selectedShed.farmId?._id || selectedShed.farmId?.id || selectedShed.farmId || selectedReplacementAnimal.farmId;
      await api.cattle.update(selectedReplacementAnimal._id || selectedReplacementAnimal.id, {
        ...selectedReplacementAnimal,
        shed: selectedShed.code,
        shedId: selectedShed.code,
        farmId: targetFarmId,
        lineNo: Number(rowNum),
        position: Number(slotNum)
      });

      swalSuccess("Success", `Replaced #${oldAnimal.tag || oldAnimal.tag_id} with #${selectedReplacementAnimal.tag || selectedReplacementAnimal.tag_id} in Position ${slotNum}`);
      
      setReplaceModalData(null);
      setReplaceSearchQuery("");
      setSelectedReplacementAnimal(null);
      
      await fetchShedsAndFarms(selectedShed._id || selectedShed.id, true);
    } catch (err) {
      console.error(err);
      swalError("Error", typeof err === 'string' ? err : "Failed to replace animal.");
    } finally {
      setIsLoading(false);
    }
  };

  // Autocomplete Suggestions for dynamic search in a specific slot
  const getSuggestions = (rowNum, slotNum) => {
    const slotKey = `${rowNum}-${slotNum}`;
    const query = (slotSearchQueries[slotKey] || "").toLowerCase().trim();
    if (!query || !selectedShed) return [];

    const selectedShedFarmId = selectedShed.farmId?._id || selectedShed.farmId?.id || selectedShed.farmId || "";

    return cattleData.filter(animal => {
      const animalFarmId = animal.farmId?._id || animal.farmId?.id || animal.farmId || "";
      if (String(animalFarmId) !== String(selectedShedFarmId)) return false;
      if (animal.isDeleted) return false;

      // Only show animals belonging to this specific shed
      const isRespectiveShed = String(animal.shed || '').trim() === String(selectedShed.code || '').trim();
      if (!isRespectiveShed) return false;

      const tagMatches = String(animal.tag || animal.tag_id || "").toLowerCase().includes(query);
      if (!tagMatches) return false;

      // Cannot be already in this row
      const isAlreadyInRow = Number(animal.lineNo || 0) === rowNum;
      return !isAlreadyInRow;
    }).slice(0, 5);
  };

  // Autocomplete Suggestions for replacement modal
  const getReplacementSuggestions = () => {
    const query = replaceSearchQuery.toLowerCase().trim();
    if (!query || !selectedShed || !replaceModalData) return [];

    const selectedShedFarmId = selectedShed.farmId?._id || selectedShed.farmId?.id || selectedShed.farmId || "";
    const { rowNum, oldAnimal } = replaceModalData;

    return cattleData.filter(animal => {
      if ((animal._id || animal.id) === (oldAnimal._id || oldAnimal.id)) return false;

      const animalFarmId = animal.farmId?._id || animal.farmId?.id || animal.farmId || "";
      if (String(animalFarmId) !== String(selectedShedFarmId)) return false;
      if (animal.isDeleted) return false;

      // Only show animals belonging to this specific shed
      const isRespectiveShed = String(animal.shed || '').trim() === String(selectedShed.code || '').trim();
      if (!isRespectiveShed) return false;

      const tagMatches = String(animal.tag || animal.tag_id || "").toLowerCase().includes(query);
      if (!tagMatches) return false;

      // Cannot be already in this row
      const isAlreadyInRow = Number(animal.lineNo || 0) === rowNum;
      return !isAlreadyInRow;
    }).slice(0, 5);
  };

  const statusStyles = {
    ACTIVE: "text-emerald-600 bg-emerald-50 border-emerald-100",
    PREGNANT: "text-violet-700 bg-violet-50 border-violet-100",
    EMPTY: "text-amber-700 bg-amber-50 border-amber-100",
    PENDING: "text-orange-700 bg-orange-50 border-orange-100",
    SOLD: "text-slate-600 bg-slate-100 border-slate-200",
    DECEASED: "text-red-700 bg-red-50 border-red-100",
  };

  // Build the list of 10 slots for the active selectedRowNum
  const getActiveRowSlots = () => {
    if (!selectedShed) return [];
    
    // Get all animals currently assigned to the active row
    const rowAnimals = cattleData.filter(c => 
      String(c.shed || c.shedId || '').trim() === String(selectedShed.code || '').trim() && 
      Number(c.lineNo || 0) === selectedRowNum
    );

    // Filter out unpositioned animals (position === 0 or position > 10)
    const unpositionedAnimals = rowAnimals.filter(a => 
      Number(a.position || 0) === 0 || 
      Number(a.position || 0) > 10
    );

    // Initialize 10 slots
    const slots = Array.from({ length: 10 }, (_, idx) => {
      const slotNum = idx + 1;
      const animal = rowAnimals.find(a => Number(a.position || 0) === slotNum);
      return { slotNum, animal, isUnsavedPosition: false };
    });

    // Distribute unpositioned animals into remaining empty slots
    let unpositionedIdx = 0;
    const filledSlots = slots.map(slot => {
      if (slot.animal) return slot;
      if (unpositionedIdx < unpositionedAnimals.length) {
        const animal = unpositionedAnimals[unpositionedIdx++];
        return { ...slot, animal, isUnsavedPosition: true };
      }
      return slot;
    });

    return filledSlots;
  };

  const activeRowSlots = getActiveRowSlots();
  const activeRowAnimalsCount = activeRowSlots.filter(s => s.animal).length;

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col bg-transparent text-slate-800 font-sans" ref={dropdownRef}>
      {/* HEADER SECTION */}
      <div className="flex-none flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#16223F] tracking-tight">
            Line Management
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Manage rows, lines, and sequential cattle distribution across sheds.
          </p>
        </div>
      </div>

      {/* SHED SELECTOR */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="w-full sm:max-w-xs">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Shed to Manage</label>
          <select
            value={selectedShedId}
            onChange={(e) => {
              const shedId = e.target.value;
              setSelectedShedId(shedId);
              const found = sheds.find(s => (s._id || s.id) === shedId);
              setSelectedShed(found || null);
              setSelectedRowNum(1); // Reset active row
            }}
            disabled={isFetching}
            className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 text-sm font-semibold animate-transition bg-white"
          >
            {sheds.length === 0 ? (
              <option value="">No Sheds with Line Management Enabled</option>
            ) : (
              <>
                <option value="" disabled>Select a Shed...</option>
                {sheds.map(s => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    Shed {s.code} ({getFarmName(s.farmId)})
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 min-h-[300px] flex flex-col">
        {isFetching ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <SkeletonLoader type="table" columns={4} />
          </div>
        ) : sheds.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#D1867D]/10 border border-[#D1867D]/20 flex items-center justify-center text-3xl mb-4 text-[#D1867D]">
              📏
            </div>
            <h3 className="text-lg font-black text-gray-700">No Sheds with Line Management</h3>
            <p className="text-gray-500 mt-2 text-sm max-w-sm font-medium leading-relaxed">
              To configure rows and assign animal positions, please enable **Line Management** under the **Shed Management** core module.
            </p>
          </div>
        ) : !selectedShed ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-3xl mb-4">
              👉
            </div>
            <h3 className="text-lg font-bold text-gray-700">Please Select a Shed</h3>
            <p className="text-gray-500 mt-2 text-sm">
              Select one of the line-managed sheds from the dropdown above to manage row assignments.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ROW SELECTOR NAVIGATION */}
            <div className="flex flex-wrap gap-2.5 p-1 bg-slate-100/50 rounded-2xl border border-slate-200/40 w-fit max-w-full">
              {Array.from({ length: selectedShed.lines || 0 }, (_, idx) => {
                const rowNum = idx + 1;
                return (
                  <button
                    key={rowNum}
                    onClick={() => {
                      setSelectedRowNum(rowNum);
                      // Clear search / dropdown queries
                      setSlotSearchQueries({});
                      setSelectedAnimalsForSlot({});
                      setActiveDropdownSlot(null);
                    }}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 ${
                      selectedRowNum === rowNum
                        ? "bg-[#D1867D] text-white shadow-md shadow-[#D1867D]/15 scale-[1.02]"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                    }`}
                  >
                    Row {rowNum}
                  </button>
                );
              })}
            </div>

            {/* ROW DETAILED INFO */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="inline-block w-3 h-3 rounded-full bg-[#D1867D] shadow-sm shadow-[#D1867D]/20 animate-pulse" />
                <h3 className="font-extrabold text-base text-[#16223F] uppercase tracking-wider">
                  Shed {selectedShed.code} &mdash; Row {selectedRowNum} Layout
                </h3>
                <span className="text-xs font-bold text-[#D1867D] bg-[#D1867D]/10 border border-[#D1867D]/20 px-3 py-0.5 rounded-full">
                  {activeRowAnimalsCount} / 10 Assigned
                </span>
              </div>
              <div className="text-xs text-slate-500 font-bold">
                Farm: <span className="text-slate-800">{getFarmName(selectedShed.farmId)}</span> | Total Capacity: {selectedShed.capacity || 0}
              </div>
            </div>

            {/* VISUAL 10-SLOT GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {activeRowSlots.map(({ slotNum, animal, isUnsavedPosition }) => {
                const slotKey = `${selectedRowNum}-${slotNum}`;
                const suggestions = getSuggestions(selectedRowNum, slotNum);

                if (animal) {
                  const animalEmoji = String(animal.cattleType || animal.animalType).toUpperCase() === 'BUFFALO' 
                    ? '🐃' 
                    : String(animal.cattleType || animal.animalType).toUpperCase() === 'CALF' 
                      ? '🍼' 
                      : '🐄';

                  return (
                    <div 
                      key={animal._id || animal.id} 
                      className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-5 hover:shadow-md hover:border-[#D1867D]/35 transition-all duration-300 transform hover:-translate-y-0.5 flex flex-col justify-between min-h-[240px]"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-black text-slate-400 bg-slate-100 border border-slate-200/50 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                            Slot {slotNum}
                          </span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border shadow-sm ${statusStyles[String(animal.status).toUpperCase()] || 'bg-slate-50 text-slate-700'}`}>
                            {animal.status}
                          </span>
                        </div>

                        {/* Title details */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">{animalEmoji}</span>
                          <span className="font-extrabold text-base text-[#16223F] tracking-tight">#{animal.tag || animal.tag_id}</span>
                          {isUnsavedPosition && (
                            <span className="text-[8px] bg-[#D1867D]/10 text-[#D1867D] border border-[#D1867D]/10 px-1.5 py-0.5 rounded font-black animate-pulse">
                              Unsaved
                            </span>
                          )}
                        </div>

                        {/* Stats Info */}
                        <div className="space-y-1.5 text-xs text-slate-500 font-semibold border-t border-slate-100 pt-3">
                          <div>Breed: <span className="text-slate-800 font-bold">{animal.breed || '-'}</span></div>
                          <div>Gender: <span className="text-slate-800 font-bold">{animal.gender || '-'}</span></div>
                          <div>Milk Yield: <span className="text-[#D1867D] font-extrabold">{animal.milk || animal.production || '-'} { (animal.milk || animal.production) && (animal.milk !== '-' && animal.production !== '-') ? 'L' : ''}</span></div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100/70">
                        <button
                          onClick={() => {
                            setReplaceModalData({ rowNum: selectedRowNum, slotNum, oldAnimal: animal });
                            setReplaceSearchQuery("");
                            setSelectedReplacementAnimal(null);
                          }}
                          className="flex-1 text-[10px] bg-amber-50 text-amber-600 hover:bg-amber-100 font-black py-2 rounded-xl border border-amber-100 transition-colors cursor-pointer text-center"
                        >
                          Replace
                        </button>
                        <button
                          onClick={() => handleRemoveAnimal(animal)}
                          className="flex-1 text-[10px] bg-red-50 text-red-600 hover:bg-red-100 font-black py-2 rounded-xl border border-red-100 transition-colors cursor-pointer text-center"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                } else {
                  // Render Empty Slot Grid Card
                  return (
                    <div 
                      key={slotNum}
                      className="bg-slate-50/20 rounded-[24px] border-2 border-dashed border-slate-200/70 p-5 flex flex-col justify-between min-h-[240px] hover:bg-slate-50/50 hover:border-slate-300 transition-all duration-300"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-black text-slate-300 bg-slate-100/50 border border-slate-200/20 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                            Slot {slotNum}
                          </span>
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Available</span>
                        </div>

                        {/* Search Picker Box */}
                        <div className="flex-1 flex flex-col justify-center my-3 relative">
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 text-center tracking-tight">Assign Cattle</label>
                          <input
                            type="text"
                            placeholder="Type tag code..."
                            value={slotSearchQueries[slotKey] || ""}
                            onFocus={() => setActiveDropdownSlot(slotKey)}
                            onChange={(e) => {
                              setSlotSearchQueries({ ...slotSearchQueries, [slotKey]: e.target.value });
                              setActiveDropdownSlot(slotKey);
                              if (selectedAnimalsForSlot[slotKey] && selectedAnimalsForSlot[slotKey].tag !== e.target.value) {
                                setSelectedAnimalsForSlot({ ...selectedAnimalsForSlot, [slotKey]: null });
                              }
                            }}
                            className="w-full h-8 text-center border border-slate-200 rounded-xl px-3 text-xs font-semibold outline-none focus:border-[#D1867D] bg-white shadow-sm"
                          />
                          {activeDropdownSlot === slotKey && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-36 overflow-y-auto">
                              {suggestions.length === 0 ? (
                                <div className="p-2.5 text-[10px] text-slate-400 font-semibold text-center">
                                  No available cattle
                                </div>
                              ) : (
                                suggestions.map(item => {
                                  const currentLoc = item.shed 
                                    ? `Shed ${item.shed}${item.lineNo ? `, Row ${item.lineNo}` : ''}`
                                    : 'Unassigned';
                                  return (
                                    <button
                                      key={item._id || item.id}
                                      type="button"
                                      onClick={() => {
                                        setSlotSearchQueries({ ...slotSearchQueries, [slotKey]: item.tag || item.tag_id });
                                        setSelectedAnimalsForSlot({ ...selectedAnimalsForSlot, [slotKey]: item });
                                        setActiveDropdownSlot(null);
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-[#D1867D]/10 flex justify-between items-center border-b border-slate-50 last:border-0 text-[10px] font-semibold"
                                    >
                                      <span className="text-slate-800 font-extrabold">#{item.tag || item.tag_id}</span>
                                      <span className="text-slate-400 text-[8px]">({currentLoc})</span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Add button inside Card */}
                      <button
                        onClick={() => handleAssignAnimal(selectedRowNum, slotNum)}
                        disabled={isLoading || !selectedAnimalsForSlot[slotKey]}
                        className="w-full bg-[#16223F] hover:bg-[#2a3f75] text-white font-extrabold h-9 rounded-xl text-xs shadow-sm transition-all disabled:opacity-50 flex items-center justify-center whitespace-nowrap cursor-pointer mt-1"
                      >
                        + Assign Animal
                      </button>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        )}
      </div>

      {/* REPLACE ANIMAL MODAL */}
      {replaceModalData && (
        <div className="fixed inset-0 bg-[#16223F]/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[30px] shadow-2xl p-8 relative border border-slate-100 animate-slide-up">
            <button
              onClick={() => setReplaceModalData(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-800 font-black text-lg bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-all"
            >
              ✕
            </button>

            <h2 className="text-xl font-black text-[#16223F] mb-2 pr-10">
              Replace Animal #{replaceModalData.oldAnimal.tag || replaceModalData.oldAnimal.tag_id}
            </h2>
            <p className="text-xs text-gray-500 font-semibold mb-6">
              Row {replaceModalData.rowNum}, Position {replaceModalData.slotNum} | Shed {selectedShed.code}
            </p>

            <div className="space-y-6">
              {/* Search Replacement Animal */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Search Replacement Animal</label>
                <input
                  type="text"
                  placeholder="Type animal tag (e.g. 902)..."
                  value={replaceSearchQuery}
                  onFocus={() => setShowReplaceDropdown(true)}
                  onChange={(e) => {
                    setReplaceSearchQuery(e.target.value);
                    setShowReplaceDropdown(true);
                    if (selectedReplacementAnimal && selectedReplacementAnimal.tag !== e.target.value) {
                      setSelectedReplacementAnimal(null);
                    }
                  }}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 bg-white"
                />

                {showReplaceDropdown && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-48 overflow-y-auto">
                    {getReplacementSuggestions().length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 font-semibold text-center">
                        No matching available animals on this farm
                      </div>
                    ) : (
                      getReplacementSuggestions().map(animal => {
                        const currentLoc = animal.shed 
                          ? `Shed ${animal.shed}${animal.lineNo ? `, Row ${animal.lineNo}` : ''}`
                          : 'Unassigned';
                        return (
                          <button
                            key={animal._id || animal.id}
                            type="button"
                            onClick={() => {
                              setReplaceSearchQuery(animal.tag || animal.tag_id);
                              setSelectedReplacementAnimal(animal);
                              setShowReplaceDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-[#D1867D]/10 flex justify-between items-center border-b border-slate-50 last:border-0 text-xs font-semibold"
                          >
                            <span className="text-slate-800 font-extrabold">#{animal.tag || animal.tag_id}</span>
                            <span className="text-slate-400 text-[10px]">({currentLoc})</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Selection details */}
              {selectedReplacementAnimal && (
                <div className="bg-[#D1867D]/5 border border-[#D1867D]/20 rounded-2xl p-4 flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-[#D1867D] uppercase tracking-wider">New Selection Details</span>
                  <div className="text-xs font-bold text-slate-700">
                    Tag ID: <span className="text-slate-900 font-black">#{selectedReplacementAnimal.tag || selectedReplacementAnimal.tag_id}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-700">
                    Breed: <span className="text-slate-900">{selectedReplacementAnimal.breed || '-'}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-700">
                    Status: <span className="text-slate-900">{selectedReplacementAnimal.status || '-'}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button
                  onClick={handleReplaceAnimal}
                  disabled={isLoading || !selectedReplacementAnimal}
                  className="flex-1 bg-[#16223F] hover:bg-[#253359] text-white py-3.5 rounded-2xl font-black text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  Confirm Replace
                </button>
                <button
                  onClick={() => setReplaceModalData(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-2xl font-black text-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LineManagementPg;
