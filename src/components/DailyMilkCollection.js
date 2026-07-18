import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import { api } from "../utils/api";
import { swalSuccess, swalError } from "../utils/swal";
import LivestockTagInput from "./LivestockTagInput";
import SkeletonLoader from "./SkeletonLoader";
import ModulePageHeader from "./ModulePageHeader";
import {
  Calendar as CalendarIcon,
  Clock,
  Home as HomeIcon,
  Settings,
  Search,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";

export default function DailyMilkCollection() {
  const router = useRouter();
  const [farms, setFarms] = useState([]);
  const [sheds, setSheds] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [collections, setCollections] = useState([]);

  // Filter / Page state
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (router.isReady && router.query.date) {
      setSelectedDate(router.query.date);
    }
  }, [router.isReady, router.query.date]);
  const [session, setSession] = useState("MORNING");
  const [activeShedId, setActiveShedId] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState([{ field: "tag", value: "" }]);

  const filterFields = [
    { name: "tag", label: "Tag ID", type: "text" },
    { name: "cattleType", label: "Cattle Type", type: "select", options: ["COW", "BUFFALO"] },
    { name: "breed", label: "Breed", type: "text" }
  ];

  const activeFilterCount = filters.filter(
    f => Array.isArray(f.value) ? f.value.length > 0 : String(f.value || '').trim() !== ''
  ).length;
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // User input states
  const [quantities, setQuantities] = useState({}); // tag -> quantity
  const [selfConsumptions, setSelfConsumptions] = useState({}); // shedId -> selfConsumption

  // Settings / Reordering Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUnassignedModal, setShowUnassignedModal] = useState(false);
  const [tempFarmsOrder, setTempFarmsOrder] = useState([]);

  const itemsPerPage = 10; // Redesigned layout uses compact paginated slots

  const initializedRef = useRef(false);
  const collectionsInitKey = useRef("");

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
        const [farmsData, shedsData] = await Promise.all([
          api.farms.getAll().catch(() => []),
          api.sheds.getAll().catch(() => []),
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
          } catch (e) { }
        }

        const sorted = sortFarms(finalFarms);
        setFarms(sorted);
        setSheds(shedsData || []);

        const pageKey = '__active_farm_id_' + window.location.pathname.replace(/\//g, '_') + '__';
        const storedActive = localStorage.getItem(pageKey) || localStorage.getItem('__active_farm_id__');
        if (storedActive && storedActive !== 'ALL') {
          setSelectedFarmId(storedActive);
        } else if (sorted && sorted.length > 0) {
          setSelectedFarmId(sorted[0]._id || sorted[0].id);
        }
      } catch (err) {
        console.error(err);
        swalError("Error", "Failed to initialize milk collection dashboard.");
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // 2. Fetch existing collections and rolled-back animals for selected date
  const fetchCollectionsAndAnimals = async () => {
    const key = `${selectedDate}_${session}`;
    if (collectionsInitKey.current === key) return;
    collectionsInitKey.current = key;

    try {
      const [records, animalsRes] = await Promise.all([
        api.milk.collections.getAll(),
        api.cattle.getAll({ date: selectedDate })
      ]);
      const rawRecords = Array.isArray(records) ? records : (records?.data ?? []);
      setCollections(rawRecords);

      const rawAnimals = Array.isArray(animalsRes) ? animalsRes : (animalsRes?.data ?? []);
      setAnimals(rawAnimals);
    } catch (err) {
      console.error("Failed to load existing data:", err);
    }
  };

  useEffect(() => {
    fetchCollectionsAndAnimals();
  }, [selectedDate, session]);

  // Filter sheds belonging to selected farm
  const farmSheds = useMemo(() => {
    if (!selectedFarmId) return [];
    return sheds.filter(
      (s) => String(s.farmId?._id || s.farmId?.id || s.farmId) === String(selectedFarmId) &&
        s.milking === "Yes"
    );
  }, [selectedFarmId, sheds]);
  // Filter animals that were registered on or before selectedDate
  const filteredAnimals = useMemo(() => {
    if (!selectedDate || !animals || animals.length === 0) return [];
    const targetDate = new Date(selectedDate);
    targetDate.setHours(0, 0, 0, 0);
    const targetTime = targetDate.getTime();

    return animals.filter((a) => {
      const entryRaw = a.date || a.createdAt || a.dateOfBirth;
      if (!entryRaw) return true; // fallback if no date is present
      const entryDate = new Date(entryRaw);
      entryDate.setHours(0, 0, 0, 0);
      return targetTime >= entryDate.getTime();
    });
  }, [animals, selectedDate]);

  // Set default active shed when farmSheds list changes
  useEffect(() => {
    if (farmSheds.length > 0) {
      const firstShedWithAnimals = farmSheds.find((s) => {
        const count = filteredAnimals.filter(
          (a) =>
            (String(a.shed || a.shedId).trim().toUpperCase() === String(s.code || '').trim().toUpperCase() ||
              String(a.shed || a.shedId).trim().toUpperCase() === String(s.name || '').trim().toUpperCase() ||
              String(a.shed || a.shedId).trim().toUpperCase() === String(s._id || '').trim().toUpperCase()) &&
            String(a.farmId?._id || a.farmId?.id || a.farmId) === String(selectedFarmId) &&
            !["SOLD", "DECEASED", "DEAD", "DRY"].includes(a.status) &&
            String(a.gender || '').trim().toUpperCase() === 'FEMALE' &&
            String(a.cattleType || a.animalType || '').trim().toUpperCase() === 'BUFFALO'
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
  }, [farmSheds, filteredAnimals, selectedFarmId]);

  // Reset page when active shed or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeShedId, filters]);

  // 3. Populate existing quantities when collections change
  useEffect(() => {
    const newQuantities = {};
    const newSelfConsumptions = {};

    const targetDateStr = new Date(selectedDate).toDateString();
    const activeDayCollections = collections.filter(
      (c) => new Date(c.date).toDateString() === targetDateStr
    );

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

  // Helper to dynamically resolve shed animals for a date/session
  const getShedAnimalsForDate = (shedObj, dateStr, sessionStr) => {
    if (!shedObj) return [];
    const shedKey = shedObj.name || shedObj.code || String(shedObj._id);

    const targetDateStr = new Date(dateStr).toDateString();
    const dayCollections = collections.filter(
      (c) => new Date(c.date).toDateString() === targetDateStr && c.session === sessionStr
    );
    const shedCollections = dayCollections.filter(
      (c) => String(c.shedId).trim().toUpperCase() === shedKey.trim().toUpperCase()
    );

    const historicalAnimals = shedCollections.map((col) => {
      const tag = String(col.tag_id || col.tagId).toUpperCase();
      const animal = filteredAnimals.find((a) => String(a.tag || a.tag_id).toUpperCase() === tag);
      if (animal) {
        return {
          ...animal,
          shedId: col.shedId,
          shed: col.shedId,
          lineNo: col.lineNo !== undefined && col.lineNo !== null ? col.lineNo : animal.lineNo,
          position: col.position !== undefined && col.position !== null ? col.position : animal.position,
          status: 'ACTIVE'
        };
      }
      return {
        _id: `mock-${tag}`,
        tag_id: tag,
        tag: tag,
        cattleType: 'BUFFALO',
        animalType: 'BUFFALO',
        breed: 'Unknown',
        gender: 'FEMALE',
        status: 'ACTIVE',
        shedId: col.shedId,
        shed: col.shedId,
        lineNo: col.lineNo || 0,
        position: col.position || 0,
        isMock: true
      };
    });

    const currentShedAnimals = filteredAnimals.filter(
      (a) =>
        (String(a.shed || a.shedId).trim().toUpperCase() === String(shedObj.code || '').trim().toUpperCase() ||
          String(a.shed || a.shedId).trim().toUpperCase() === String(shedObj.name || '').trim().toUpperCase() ||
          String(a.shed || a.shedId).trim().toUpperCase() === String(shedObj._id || '').trim().toUpperCase()) &&
        String(a.farmId?._id || a.farmId?.id || a.farmId) === String(selectedFarmId) &&
        !["SOLD", "DECEASED", "DEAD", "DRY"].includes(a.status) &&
        String(a.gender || '').trim().toUpperCase() === 'FEMALE' &&
        String(a.cattleType || a.animalType || '').trim().toUpperCase() === 'BUFFALO'
    );

    const remainingCurrentAnimals = currentShedAnimals.filter((currAnimal) => {
      const tag = String(currAnimal.tag || currAnimal.tag_id).toUpperCase();
      
      const hasCollectionInSameShed = shedCollections.some((c) => String(c.tag_id || c.tagId).toUpperCase() === tag);
      if (hasCollectionInSameShed) return false;

      const hasCollectionInDifferentShed = dayCollections.some(
        (c) => String(c.tag_id || c.tagId).toUpperCase() === tag &&
               String(c.shedId).trim().toUpperCase() !== shedKey.trim().toUpperCase()
      );
      if (hasCollectionInDifferentShed) return false;

      if (shedObj.lineManagement === "Yes") {
        const isSlotOccupied = shedCollections.some(
          (c) => Number(c.lineNo) === Number(currAnimal.lineNo) &&
                 Number(c.position) === Number(currAnimal.position) &&
                 String(c.tag_id || c.tagId).toUpperCase() !== tag
        );
        if (isSlotOccupied) return false;
      }

      return true;
    });

    const combined = [...historicalAnimals, ...remainingCurrentAnimals];

    if (shedObj.lineManagement === "Yes") {
      combined.sort((a, b) => {
        const aLine = Number(a.lineNo) || 0;
        const bLine = Number(b.lineNo) || 0;
        if (aLine === 0 && bLine > 0) return 1;
        if (bLine === 0 && aLine > 0) return -1;
        if (aLine !== bLine) return aLine - bLine;

        const aPos = Number(a.position) || 0;
        const bPos = Number(b.position) || 0;
        if (aPos === 0 && bPos > 0) return 1;
        if (bPos === 0 && aPos > 0) return -1;
        return aPos - bPos;
      });
    }

    return combined;
  };

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

    // Table summary of all sheds for active session
    const shedsSummary = farmSheds.map((s) => {
      const shedKey = s.name || s.code || String(s._id);
      const shedAnimals = getShedAnimalsForDate(s, selectedDate, session);

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
        animalCount: shedAnimals.length
      };
    });

    // Compute pregnant animals and their total yield
    const pregnantAnimals = filteredAnimals.filter(
      (a) =>
        String(a.farmId?._id || a.farmId?.id || a.farmId) === String(selectedFarmId) &&
        !["SOLD", "DECEASED", "DEAD", "DRY"].includes(a.status) &&
        String(a.gender || '').trim().toUpperCase() === 'FEMALE' &&
        String(a.cattleType || a.animalType || '').trim().toUpperCase() === 'BUFFALO' &&
        String(a.status).toUpperCase() === 'PREGNANT'
    );

    const pregnantTotalQty = pregnantAnimals.reduce((sum, a) => {
      const tag = String(a.tag || a.tag_id).toUpperCase();
      return sum + (Number(quantities[tag]) || 0);
    }, 0);

    const summaryList = [...shedsSummary];

    const summaryTotalQty = summaryList.reduce((sum, s) => sum + s.totalQty, 0);
    const summaryTotalSelf = summaryList.reduce((sum, s) => sum + s.selfCons, 0);
    const summaryTotalNet = summaryList.reduce((sum, s) => sum + s.net, 0);

    return {
      morningTotal,
      eveningTotal,
      dayTotal,
      shedsSummary: summaryList,
      summaryTotalQty,
      summaryTotalSelf,
      summaryTotalNet,
      pregnantAnimals,
      pregnantTotalQty
    };
  }, [collections, selectedDate, session, quantities, selfConsumptions, farmSheds, filteredAnimals, selectedFarmId]);

  const activeShedObj = useMemo(() => {
    if (!activeShedId) return null;
    return sheds.find(s =>
      String(s.name || s.code || s._id).trim().toUpperCase() === String(activeShedId).trim().toUpperCase()
    );
  }, [activeShedId, sheds]);

  // Active Animals list inside currently selected active shed
  const activeShedAnimals = useMemo(() => {
    return getShedAnimalsForDate(activeShedObj, selectedDate, session);
  }, [activeShedObj, selectedDate, session, filteredAnimals, collections, selectedFarmId]);

  const unassignedAnimalsInShed = useMemo(() => {
    if (!activeShedObj || activeShedObj.lineManagement !== "Yes") return [];
    return activeShedAnimals.filter(a => !a.lineNo || Number(a.lineNo) === 0);
  }, [activeShedObj, activeShedAnimals]);

  // Filtered animals inside active shed based on overlay filters
  const searchedAnimals = useMemo(() => {
    // Group active filters by field name
    const groupedFilters = {};
    for (const f of filters) {
      const fieldConfig = filterFields.find(field => field.name === f.field);
      const hasValue = fieldConfig?.type === "select"
        ? (f.value && (Array.isArray(f.value) ? f.value.length > 0 : String(f.value).trim() !== ""))
        : (f.value && String(f.value).trim() !== "");
      if (!hasValue) continue;

      if (!groupedFilters[f.field]) {
        groupedFilters[f.field] = [];
      }
      groupedFilters[f.field].push(f);
    }

    if (Object.keys(groupedFilters).length === 0) return activeShedAnimals;

    return activeShedAnimals.filter((a) => {
      let isMatched = true;

      for (const fieldName in groupedFilters) {
        const fieldFilters = groupedFilters[fieldName];
        let matchAnyForField = false;

        for (const f of fieldFilters) {
          let currentMatch = true;

          if (f.field === "tag") {
            const tagStr = String(a.tag || a.tag_id || "");
            currentMatch = tagStr.toUpperCase().includes(String(f.value).toUpperCase());
          }
          else if (f.field === "cattleType") {
            const selectedValues = Array.isArray(f.value) ? f.value : (f.value ? [f.value] : []);
            if (selectedValues.length > 0) {
              const recVal = String(a.cattleType || a.animalType || "").toUpperCase();
              const matched = selectedValues.some(v => String(v).toUpperCase() === recVal);
              if (!matched) currentMatch = false;
            }
          }
          else {
            if (f.value) {
              currentMatch = String(a[f.field] || "")
                .toLowerCase()
                .includes(String(f.value).toLowerCase());
            }
          }

          if (currentMatch) {
            matchAnyForField = true;
            break;
          }
        }

        if (!matchAnyForField) {
          isMatched = false;
          break;
        }
      }
      return isMatched;
    });
  }, [activeShedAnimals, filters]);

  // Paginated animals slice for active shed
  const paginatedAnimals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return searchedAnimals.slice(start, start + itemsPerPage);
  }, [searchedAnimals, currentPage]);

  const totalPages = Math.ceil(searchedAnimals.length / itemsPerPage) || 1;

  // Active shed calculations
  const activeShedTotals = useMemo(() => {
    const totalQty = activeShedAnimals.reduce((sum, a) => {
      const tag = String(a.tag || a.tag_id).toUpperCase();
      return sum + (Number(quantities[tag]) || 0);
    }, 0);
    const selfCons = Number(selfConsumptions[activeShedId]) || 0;
    const net = Math.max(0, totalQty - selfCons);
    return { totalQty, selfCons, net };
  }, [activeShedAnimals, quantities, selfConsumptions, activeShedId]);

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

  // Submit / Save active shed
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
      fetchCollectionsAndAnimals();
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
      const firstFarmId = tempFarmsOrder[0]._id || tempFarmsOrder[0].id;
      localStorage.setItem('__active_farm_id__', firstFarmId);
      setSelectedFarmId(firstFarmId);
      window.location.reload();
    } else {
      setShowSettingsModal(false);
      swalSuccess("Order Updated", "Farm display order has been saved successfully.");
    }
  };

  return (
    <div className="w-full flex flex-col bg-transparent text-slate-800 font-sans">

      {/* A. Header & Sub-Header Section */}
      <ModulePageHeader
        title="Daily Milk Collection"
        description="Log, verify, and monitor session yield outputs across sheds."
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
          <div className="xl:col-span-8 flex flex-col gap-8">

            {/* 1. Session & Parameters Selection Grid (Horizontal Selection) */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-100/80 shadow-[0_12px_40px_rgba(0,0,0,0.03)] p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Date */}
                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                    Collection Date
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={selectedDate}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full h-12 bg-slate-50/50 border border-slate-200/80 rounded-2xl pl-11 pr-4 text-xs font-black text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Session */}
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

                {/* Farm Selector */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                    Active Farm
                  </label>
                  <div className="relative">
                    <HomeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={selectedFarmId}
                      onChange={(e) => {
                        const newFarmId = e.target.value;
                        const pageKey = '__active_farm_id_' + window.location.pathname.replace(/\//g, '_') + '__';
                        localStorage.setItem(pageKey, newFarmId);
                        setSelectedFarmId(newFarmId);
                        window.location.reload();
                      }}
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
              </div>

              {/* Minimalist shared stat counter strip (Side-by-Side) */}
              <div className="mt-8 grid grid-cols-3 bg-slate-50/60 rounded-2xl border border-slate-100 overflow-hidden divide-x divide-slate-100">
                <div className="p-4 flex flex-col gap-1 text-center hover:bg-slate-50 transition-colors">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Morning Session</span>
                  <span className="text-base md:text-lg font-black text-blue-600 tracking-tight">
                    {calculations.morningTotal.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">L</span>
                  </span>
                </div>
                <div className="p-4 flex flex-col gap-1 text-center hover:bg-slate-50 transition-colors">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Evening Session</span>
                  <span className="text-base md:text-lg font-black text-indigo-600 tracking-tight">
                    {calculations.eveningTotal.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">L</span>
                  </span>
                </div>
                <div className="p-4 flex flex-col gap-1 text-center hover:bg-slate-50/80 transition-colors">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">Total Yield</span>
                  <span className="text-base md:text-lg font-black text-emerald-600 tracking-tight">
                    {calculations.dayTotal.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">L</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Interactive Shed Workspace Section */}
            <div className="flex flex-col gap-5">

              {/* Shed Navigation Tabs */}
              <div className="flex flex-wrap gap-2.5">
                {farmSheds.map((s) => {
                  const shedKey = s.name || s.code || String(s._id);
                  const matchedSummary = calculations.shedsSummary.find(item => item.name === shedKey);
                  const animalCount = matchedSummary?.animalCount || 0;
                  const netYield = matchedSummary?.net || 0;

                  return (
                    <button
                      key={shedKey}
                      onClick={() => {
                        setActiveShedId(shedKey);
                        setFilters([{ field: "tag", value: "" }]);
                      }}
                      className={`h-12 px-5 rounded-2xl text-xs font-black transition-all duration-300 flex items-center gap-2.5 border active:scale-[0.98] ${activeShedId === shedKey
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/10"
                          : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200/60 shadow-[0_4px_12px_rgba(0,0,0,0.01)]"
                        }`}
                    >
                      <HomeIcon className="w-3.5 h-3.5" />
                      <span>{shedKey}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeShedId === shedKey ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                        }`}>
                        {animalCount} head · {netYield} L
                      </span>
                    </button>
                  );
                })}

              </div>

              {/* Selected Shed Data Entry Card */}
              {activeShedId ? (
                <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-100/80 shadow-[0_12px_40px_rgba(0,0,0,0.03)] overflow-hidden">

                  {/* Card Section Header */}
                  <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50/30">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight font-sans">
                          {activeShedId} Workspace
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase border bg-emerald-50 text-emerald-700 border-emerald-100">
                          {session}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-1">
                        Please record the exact milk quantity collected per individual livestock asset.
                      </p>
                    </div>

                    {/* Dynamic Filters Overlay button */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`relative px-4 py-2 rounded-xl font-bold border text-xs transition-all duration-200 hover:-translate-y-px hover:shadow-md cursor-pointer flex items-center gap-2 h-10 ${showFilters ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                      >
                        🔍 Filters
                        {activeFilterCount > 0 && (
                          <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {activeFilterCount}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* FILTER OVERLAY MODAL */}
                    {showFilters && (
                      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                        <div className="bg-white w-full max-w-md rounded-[30px] shadow-2xl max-h-[85vh] overflow-y-auto p-6 text-left">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black text-[#16223F]">Filters</h3>
                            <button onClick={() => setShowFilters(false)} className="text-gray-500 hover:text-black text-xl font-bold cursor-pointer">✕</button>
                          </div>
                          <div className="space-y-4">
                            {filters.map((f, index) => (
                              <div key={index} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <select
                                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-semibold text-[#16223F] bg-white outline-none focus:border-[#D1867D]"
                                  value={f.field}
                                  onChange={e => {
                                    const updated = [...filters];
                                    updated[index] = { field: e.target.value, value: '' };
                                    setFilters(updated);
                                  }}
                                >
                                  {filterFields.map(field => (
                                    <option key={field.name} value={field.name}>{field.label}</option>
                                  ))}
                                </select>

                                {(() => {
                                  const fieldConfig = filterFields.find(field => field.name === f.field);

                                  // 📋 SELECT FIELD (MULTI-SELECT CHECKBOXES)
                                  if (fieldConfig?.type === "select") {
                                    const currentSelected = Array.isArray(f.value) ? f.value : (f.value ? [f.value] : []);
                                    const options = fieldConfig.options || [];

                                    return (
                                      <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto bg-white border border-slate-200 rounded-lg p-2.5">
                                        {options.map((opt) => {
                                          const valStr = typeof opt === 'object' ? opt.value : opt;
                                          const labelStr = typeof opt === 'object' ? opt.label : opt;
                                          const isChecked = currentSelected.includes(valStr);

                                          return (
                                            <label key={valStr} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                  const updated = [...filters];
                                                  let nextVal;
                                                  if (e.target.checked) {
                                                    nextVal = [...currentSelected, valStr];
                                                  } else {
                                                    nextVal = currentSelected.filter((v) => v !== valStr);
                                                  }
                                                  updated[index].value = nextVal;
                                                  setFilters(updated);
                                                }}
                                                className="w-4 h-4 text-[#16223F] border-gray-300 rounded focus:ring-[#16223F]"
                                              />
                                              {labelStr}
                                            </label>
                                          );
                                        })}
                                      </div>
                                    );
                                  }

                                  // ✏️ AUTOCOMPLETE FOR TAGS
                                  if (['tag', 'tagId', 'animalId', 'maleTag'].includes(f.field)) {
                                    return (
                                      <LivestockTagInput
                                        name={f.field}
                                        value={f.value || ""}
                                        validationMode="none"
                                        placeholder="Type or select Tag ID..."
                                        onChange={(name, tagValue) => {
                                          const updated = [...filters];
                                          updated[index].value = tagValue;
                                          setFilters(updated);
                                        }}
                                      />
                                    );
                                  }

                                  // ✏️ DEFAULT TEXT
                                  return (
                                    <input
                                      type="text"
                                      placeholder="Enter value..."
                                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-[#16223F] font-semibold outline-none focus:border-[#D1867D]"
                                      value={f.value || ""}
                                      onChange={(e) => {
                                        const updated = [...filters];
                                        updated[index].value = e.target.value;
                                        setFilters(updated);
                                      }}
                                    />
                                  );
                                })()}

                                <button
                                  onClick={() => {
                                    const updated = filters.filter((_, i) => i !== index);
                                    setFilters(updated.length ? updated : [{ field: 'tag', value: '' }]);
                                  }}
                                  className="text-red-500 hover:text-red-700 text-xs font-bold self-end mt-1 cursor-pointer transition-colors"
                                >
                                  Remove Filter
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between mt-6 gap-3">
                            <button
                              onClick={() => setFilters([...filters, { field: 'tag', value: '' }])}
                              className="flex-1 bg-[#D1867D]/10 text-[#16223F] py-2 rounded-lg font-bold text-sm hover:bg-[#D1867D]/20 cursor-pointer"
                            >
                              + Add Filter
                            </button>
                            <button
                              onClick={() => { setFilters([{ field: 'tag', value: '' }]); }}
                              className="flex-1 bg-red-100 text-red-600 py-2 rounded-lg font-bold text-sm cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                          <button onClick={() => setShowFilters(false)}
                            className="mt-4 w-full bg-[#16223F] hover:bg-[#16223F]/90 text-white py-2.5 rounded-lg font-bold cursor-pointer">
                            Apply Filters
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Active Shed Stat Ribbon */}
                  <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/10 grid grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gross Yield</span>
                      <span className="text-base font-black text-blue-600 mt-1">{activeShedTotals.totalQty} L</span>
                    </div>
                    <div className="flex flex-col border-x border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Self Consumption</span>
                      <span className="text-base font-black text-amber-600 mt-1">{activeShedTotals.selfCons} L</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Net Yield</span>
                      <span className="text-base font-black text-emerald-600 mt-1">{activeShedTotals.net} L</span>
                    </div>
                  </div>

                  {activeShedAnimals.some(a => String(a.status).toUpperCase() === 'PREGNANT') && (
                    <div className="mx-8 mt-6 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-5 shadow-[0_4px_20px_rgba(109,40,217,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <span className="text-2xl pt-0.5 font-sans">✨</span>
                        <div>
                          <span className="block text-xs font-black text-violet-800 tracking-wide uppercase">
                            Automated Dry Transition Rules
                          </span>
                          <span className="block text-[10px] text-violet-600 mt-1 font-semibold leading-relaxed">
                            If a pregnant animal&apos;s session contribution is <strong>less than 3 Liters</strong>, the system will automatically transition her to the <strong>Dry state (DRY status)</strong> and move her to the <strong>Dry Shed</strong> upon saving.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeShedObj?.lineManagement === "Yes" && unassignedAnimalsInShed.length > 0 && (
                    <div className="mx-8 mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                          <span className="block text-xs font-black text-amber-800">Unassigned Livestock Detected</span>
                          <span className="block text-[10px] text-amber-600 mt-0.5 font-medium leading-normal">
                            There are {unassignedAnimalsInShed.length} animal(s) in this shed that have not been assigned in Line Management.
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowUnassignedModal(true)}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black shadow-md shadow-amber-600/10 active:scale-95 transition-all duration-200 cursor-pointer"
                      >
                        View List
                      </button>
                    </div>
                  )}

                  {/* Livestock Grid */}
                  <div className="p-8">
                    {searchedAnimals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-xs text-slate-400 font-bold">No active animals matching tag filters in {activeShedId}.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {paginatedAnimals.map((animal, idx) => {
                          const tag = String(animal.tag || animal.tag_id).toUpperCase();
                          const animalIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                          const quantity = quantities[tag] !== undefined ? quantities[tag] : "";

                          return (
                            <div
                              key={tag}
                              className="group bg-slate-50/50 hover:bg-white border border-slate-200/50 hover:border-emerald-500/30 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-md transition-all duration-300"
                            >
                              <div className="flex justify-between items-center mb-2.5">
                                <span className="text-[9px] font-extrabold text-slate-300">
                                  #{animalIndex}
                                </span>
                                <span className="text-[10px] font-black text-slate-700 font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shadow-sm max-w-[70%] truncate" title={tag}>
                                  {tag}
                                </span>
                              </div>
                              {((String(animal.status).toUpperCase() === 'PREGNANT') ||
                                (activeShedObj?.lineManagement === "Yes" && (!animal.lineNo || Number(animal.lineNo) === 0))) && (
                                  <div className="flex flex-wrap gap-1.5 mb-3">
                                    {String(animal.status).toUpperCase() === 'PREGNANT' && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-extrabold text-[#D1867D] bg-[#D1867D]/10 border border-[#D1867D]/20 rounded-md uppercase tracking-wider animate-pulse" title="Pregnant">
                                        🤰 Pregnant
                                      </span>
                                    )}
                                    {activeShedObj?.lineManagement === "Yes" && (!animal.lineNo || Number(animal.lineNo) === 0) && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black text-red-600 bg-red-50 border border-red-100 rounded-md uppercase tracking-wider" title="Unassigned in Line Management">
                                        ⚠️ Unassigned
                                      </span>
                                    )}
                                  </div>
                                )}
                              <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                                Volume (Liters)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={quantity}
                                onChange={(e) => handleQuantityChange(tag, e.target.value)}
                                placeholder="0.0"
                                className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-3 text-xs font-black text-slate-800 text-center outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all duration-300"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Form Footer: Pagination, Self Consumption, & Inline Shed Action */}
                  <div className="p-8 border-t border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-6 bg-slate-50/20">

                    {/* Self consumption parameter input */}
                    {activeShedId !== "PREGNANT_WORKFLOW" && (
                      <div className="flex items-center gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 max-w-sm w-full shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
                        <div className="flex-1">
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">
                            Self Consumption
                          </span>
                          <p className="text-[9px] text-slate-400 mt-0.5 font-medium leading-normal">
                            Deducted directly from current shed yield total.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={selfConsumptions[activeShedId] !== undefined ? selfConsumptions[activeShedId] : ""}
                            onChange={(e) => handleSelfConsumptionChange(e.target.value)}
                            placeholder="0"
                            className="w-16 h-10 border border-slate-200 rounded-xl text-center text-xs font-black text-slate-800 focus:border-emerald-500 outline-none transition-all duration-300 bg-slate-50/50 focus:bg-white"
                          />
                          <span className="text-xs font-black text-slate-700">L</span>
                        </div>
                      </div>
                    )}

                    {/* Pagination control */}
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="h-9 px-3 rounded-xl border border-slate-200 text-[10px] font-bold bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-all duration-300"
                        >
                          Prev
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <button
                            key={p}
                            onClick={() => setCurrentPage(p)}
                            className={`w-9 h-9 rounded-xl text-[10px] font-bold border transition-all duration-300 ${currentPage === p
                                ? "bg-slate-800 border-slate-800 text-white"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                          >
                            {p}
                          </button>
                        ))}
                        <button
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="h-9 px-3 rounded-xl border border-slate-200 text-[10px] font-bold bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-all duration-300"
                        >
                          Next
                        </button>
                      </div>
                    )}

                    {/* Save this specific shed */}
                    <button
                      onClick={handleSaveActiveShed}
                      disabled={isSaving}
                      className={`px-6 h-12 text-white font-extrabold rounded-2xl shadow-lg active:scale-[0.98] transition-all duration-300 text-xs flex items-center justify-center gap-2 ml-auto lg:ml-0 ${activeShedId === "PREGNANT_WORKFLOW"
                          ? "bg-violet-600 hover:bg-violet-700 shadow-violet-600/10 hover:shadow-violet-600/20"
                          : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10 hover:shadow-emerald-600/20"
                        }`}
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? "Saving..." : `Save ${activeShedId === "PREGNANT_WORKFLOW" ? "Pregnant Animals" : activeShedId}`}</span>
                    </button>
                  </div>

                </div>
              ) : (
                <div className="bg-white/90 rounded-3xl border border-slate-100/80 p-12 text-center shadow-[0_12px_40px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center">
                  <HomeIcon className="w-10 h-10 text-slate-300 mb-3" />
                  <h4 className="text-sm font-black text-slate-800">No active shed selected</h4>
                  <p className="text-xs text-slate-400 mt-1">Please select one of the sheds above to record values.</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Real-Time Sheds Summary & Global Operations */}
          <div className="xl:col-span-4 flex flex-col gap-6">

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
                      <th className="pb-3.5 font-bold text-right">Gross Qty</th>
                      <th className="pb-3.5 font-bold text-right">Self Cons.</th>
                      <th className="pb-3.5 font-bold text-right">Net Milk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold">
                    {calculations.shedsSummary.map((s) => (
                      <tr key={s.name} className={`text-slate-700 hover:bg-slate-50/50 transition-colors ${s.isVirtual ? 'bg-violet-50/20' : ''}`}>
                        <td className="py-3.5 font-extrabold flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${s.isVirtual ? 'bg-violet-500' : 'bg-emerald-500'}`} />
                          <span>{s.name}</span>
                        </td>
                        <td className="py-3.5 text-right text-blue-600 font-bold">{s.totalQty.toLocaleString()} L</td>
                        <td className="py-3.5 text-right text-amber-500 font-medium">{s.selfCons.toLocaleString()} L</td>
                        <td className="py-3.5 text-right text-emerald-600 font-extrabold">{s.net.toLocaleString()} L</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-150 text-slate-800 font-black bg-slate-50/50">
                      <td className="py-4 pl-3.5 text-[10px] tracking-wider font-extrabold uppercase">Total Yield</td>
                      <td className="py-4 text-right text-blue-700 font-black">{calculations.summaryTotalQty.toLocaleString()} L</td>
                      <td className="py-4 text-right text-amber-700 font-bold">{calculations.summaryTotalSelf.toLocaleString()} L</td>
                      <td className="py-4 text-right text-emerald-700 font-black">{calculations.summaryTotalNet.toLocaleString()} L</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Global Session Actions & Utilities */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleSaveActiveShed}
                disabled={isSaving || !activeShedId}
                className={`w-full py-4 text-white font-extrabold rounded-2xl shadow-lg active:scale-[0.98] transition-all duration-300 text-xs flex items-center justify-center gap-2 disabled:opacity-40 ${activeShedId === "PREGNANT_WORKFLOW"
                    ? "bg-violet-600 hover:bg-violet-700 shadow-violet-600/10 hover:shadow-violet-600/20"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10 hover:shadow-emerald-600/20"
                  }`}
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : `Save ${activeShedId === "PREGNANT_WORKFLOW" ? "Pregnant Animals" : (session === "MORNING" ? "Morning" : "Evening")} Data`}</span>
              </button>

              <button
                onClick={() => setSession((s) => (s === "MORNING" ? "EVENING" : "MORNING"))}
                className="w-full py-4 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-extrabold rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.01)] active:scale-[0.98] transition-all duration-300 text-xs flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 text-slate-400" />
                <span>Switch to {session === "MORNING" ? "Evening" : "Morning"} Session</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* Brand Settings Modal (reordering) */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fadeIn">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto border border-slate-100/60 relative">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-all font-bold z-10"
              type="button"
            >
              ✕
            </button>

            <h2 className="text-base font-black mb-1 text-slate-900 tracking-tight">Set Farm Display Order</h2>
            <p className="text-[10px] text-slate-400 font-extrabold mb-6 uppercase tracking-wider">
              Sort how farms appear in your lists
            </p>

            <div className="space-y-2 mb-6">
              {tempFarmsOrder.map((farm, index) => (
                <div
                  key={farm._id || farm.id}
                  className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/50 rounded-2xl hover:border-slate-300 transition-all duration-200"
                >
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-2">
                    🏡 {farm.name}
                  </span>

                  <div className="flex gap-1">
                    <button
                      onClick={() => moveFarm(index, -1)}
                      disabled={index === 0}
                      className="w-8 h-8 flex items-center justify-center border border-slate-200 hover:border-emerald-600 hover:text-emerald-700 rounded-xl bg-white text-slate-500 disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-500 font-black transition-all text-xs"
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveFarm(index, 1)}
                      disabled={index === tempFarmsOrder.length - 1}
                      className="w-8 h-8 flex items-center justify-center border border-slate-200 hover:border-emerald-600 hover:text-emerald-700 rounded-xl bg-white text-slate-500 disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-500 font-black transition-all text-xs"
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
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-300 text-xs"
              >
                Save Display Order
              </button>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 bg-slate-100 text-slate-600 hover:bg-slate-200 py-3 rounded-xl font-bold shadow-sm active:scale-[0.98] transition-all duration-300 border border-slate-200 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Unassigned Livestock Modal ── */}
      {showUnassignedModal && activeShedObj && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[250] p-4">
          <div className="bg-white w-full max-w-md rounded-[30px] shadow-2xl p-6 relative">
            <button
              onClick={() => setShowUnassignedModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors text-xl font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-base font-black text-[#16223F] flex items-center gap-2 mb-4">
              ⚠️ Unassigned in {activeShedId}
            </h3>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {unassignedAnimalsInShed.map((animal) => (
                <div key={animal.tag || animal.tag_id} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <span className="block text-xs font-black text-[#16223F] font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shadow-sm w-fit">
                        {String(animal.tag || animal.tag_id).toUpperCase()}
                      </span>
                      {String(animal.status).toUpperCase() === 'PREGNANT' && (
                        <span className="px-2.5 py-0.5 text-[9px] font-extrabold text-[#D1867D] bg-[#D1867D]/10 border border-[#D1867D]/20 rounded-md uppercase tracking-wider animate-pulse" title="Pregnant">
                          🤰 Pregnant
                        </span>
                      )}
                    </div>
                    <span className="block text-[10px] text-slate-400 font-semibold uppercase">
                      {animal.breed || 'Unknown Breed'} · {animal.cattleType || animal.animalType || 'COW'}
                    </span>
                  </div>
                  <span className="text-[10px] bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-extrabold uppercase border border-red-100 shrink-0">
                    Unassigned
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowUnassignedModal(false)}
              className="mt-6 w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold text-sm shadow-md transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
