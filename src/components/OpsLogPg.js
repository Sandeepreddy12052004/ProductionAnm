import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import LogForm from './LogForm';
import LivestockTagInput from './LivestockTagInput';
import { hasActionPermission } from '@/utils/permission';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '@/utils/api';
import { swalSuccess, swalError, swalConfirm } from '@/utils/swal';
import ModulePageHeader from "./ModulePageHeader";
import FarmFilterSelector from "./FarmFilterSelector";

const toCamelCase = (str) => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');
};

// ─── Date Helpers ─────────────────────────────────────────────────────────────

const parseDateString = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  const valStr = String(dateVal).trim();
  if (valStr.includes('/')) {
    const parts = valStr.split('/');
    if (parts.length === 3) {
      const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      if (!isNaN(d.getTime())) return d;
    }
  }
  const parsed = new Date(valStr);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
};

const formatDateToDDMMYYYY = (dateVal) => {
  const d = parseDateString(dateVal);
  if (!d) return '-';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// ─── API dispatch ─────────────────────────────────────────────────────────────

const getApiForModule = (id) => {
  switch (id) {
    case 'grass':       return api.operations.grassCollection;
    case 'feeding':     return api.operations.dailyFeeding;
    case 'milk_prod':   return api.milk.collections;
    case 'procurement': return api.milk.procurement;
    case 'components':  return api.milk.quality;
    case 'feed_inv':    return api.inventory.feed;
    case 'med_inv':     return api.inventory.medicines;
    default:            return null;
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

const OpsLogPg = ({ moduleConfig }) => {
  const router = useRouter();
  const current = moduleConfig || { id: 'unknown', name: 'Unknown', icon: '📋', fields: [] };

  const getModulePrefixAndBaseToken = (id) => {
    switch (id) {
      case 'grass':       return { prefix: 'GRASS', baseToken: 'GRASS' };
      case 'feeding':     return { prefix: 'FEEDING', baseToken: 'FEEDING' };
      case 'milk_prod':   return { prefix: 'MILK', baseToken: 'MILK' };
      case 'procurement': return { prefix: 'MILK', baseToken: 'MILK' };
      case 'components':  return { prefix: 'MILK', baseToken: 'MILK' };
      case 'feed_inv':    return { prefix: 'INVENTORY', baseToken: 'INVENTORY' };
      case 'med_inv':     return { prefix: 'INVENTORY', baseToken: 'INVENTORY' };
      default:            return { prefix: id?.toUpperCase(), baseToken: id?.toUpperCase() };
    }
  };

  const { prefix, baseToken } = getModulePrefixAndBaseToken(current.id);
  const canCreate = hasActionPermission(prefix, baseToken, 'create');
  const canEdit = hasActionPermission(prefix, baseToken, 'edit');
  const canDelete = hasActionPermission(prefix, baseToken, 'delete');

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showFAB, setShowFAB] = useState(true);
  const [dynamicFields, setDynamicFields] = useState(current.fields);
  const [rawSheds, setRawSheds] = useState([]);
  const [rawAnimals, setRawAnimals] = useState([]);
  const [rawFeedItems, setRawFeedItems] = useState([]);
  const [rawMedicines, setRawMedicines] = useState([]);
  const [rawLabors, setRawLabors] = useState([]);

  const [filters, setFilters] = useState([{ field: 'entryDate', value: '', from: '', to: '' }]);
  const [appliedFilters, setAppliedFilters] = useState([{ field: 'entryDate', value: '', from: '', to: '' }]);
  const [filterSearchQueries, setFilterSearchQueries] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ── Scroll-hide FAB ──────────────────────────────────────────────────────
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      if (Math.abs(window.scrollY - lastScrollY) < 10) return;
      setShowFAB(window.scrollY <= lastScrollY);
      lastScrollY = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Body scroll lock ─────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = (showForm || showFilters || viewMode || selectedEntry) ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [showForm, showFilters, viewMode, selectedEntry]);

  useEffect(() => {
    if (showFilters) {
      setFilters(appliedFilters.map(f => ({
        ...f,
        value: Array.isArray(f.value) ? [...f.value] : f.value
      })));
    }
  }, [showFilters, appliedFilters]);

  // ── Load dynamic shed/animal/feed options ──────────────────────────────
  useEffect(() => {
    const hasShed = current.fields.some(f => ['shedId', 'shed'].includes(f.name));
    const hasAnimal = current.fields.some(f => f.name === 'animalId');
    const hasFeedType = current.fields.some(f => f.name === 'feedType');
    const hasMedicineName = current.fields.some(f => f.name === 'medicineName');
    const hasFarm = current.fields.some(f => ['farmId', 'farm'].includes(f.name));
    const hasLabor = current.fields.some(f => f.name === 'laborId');
    const hasSourcingFarm = current.fields.some(f => f.name === 'sourcingFarmId');
    const hasProcuredFrom = current.fields.some(f => f.name === 'procuredFrom');
    const isFeeding = current.id === 'feeding';

    let shed_opts = null;
    let animal_opts = null;
    let feed_opts = null;
    let medicine_opts = null;
    let farm_opts = null;
    let labor_opts = null;
    let sourcing_farm_opts = null;
    let dynamic_feeds = null;
    let procured_from_opts = null;

    const tryMerge = () => {
      if (
        (hasShed && !shed_opts) ||
        (hasAnimal && !animal_opts) ||
        (hasFeedType && !feed_opts) ||
        (hasMedicineName && !medicine_opts) ||
        (hasFarm && !farm_opts) ||
        (hasLabor && !labor_opts) ||
        (hasSourcingFarm && !sourcing_farm_opts) ||
        (isFeeding && !dynamic_feeds) ||
        (hasProcuredFrom && !procured_from_opts)
      ) return;

      let baseFields = current.fields;
      if (isFeeding && dynamic_feeds && dynamic_feeds.length > 0) {
        const keepFields = current.fields.filter(f => ['date', 'shedId', 'animalId'].includes(f.name));
        const feedFields = dynamic_feeds.map(feedName => {
          const camelName = toCamelCase(feedName);
          let unit = 'KG';
          const lowerName = feedName.toLowerCase();
          if (lowerName.includes('salt') || lowerName.includes('mineral')) unit = 'G';
          else if (lowerName.includes('calcium')) unit = 'ML';
          return {
            name: camelName,
            label: `${feedName} (${unit})`,
            type: 'number',
            optional: true
          };
        });
        baseFields = [...keepFields, ...feedFields];
      }

      setDynamicFields(baseFields.map(f => {
        if (['shedId', 'shed'].includes(f.name) && shed_opts)
          return { ...f, options: shed_opts };
        if (f.name === 'animalId' && animal_opts)
          return { ...f, options: animal_opts };
        if (f.name === 'feedType' && feed_opts)
          return { ...f, options: feed_opts };
        if (f.name === 'medicineName' && medicine_opts)
          return { ...f, options: medicine_opts };
        if (['farmId', 'farm'].includes(f.name) && farm_opts)
          return { ...f, options: farm_opts };
        if (f.name === 'laborId' && labor_opts)
          return { ...f, options: labor_opts };
        if (f.name === 'sourcingFarmId' && sourcing_farm_opts)
          return { ...f, options: sourcing_farm_opts };
        if (f.name === 'procuredFrom' && procured_from_opts)
          return { ...f, options: procured_from_opts };
        return f;
      }));
    };

    if (hasShed) {
      api.sheds.getAll()
        .then(res => {
          const list = Array.isArray(res) ? res : (res?.data ?? []);
          setRawSheds(list);
          shed_opts = list.map(s => s.name || s.code).filter(Boolean);
          tryMerge();
        })
        .catch(console.error);
    }

    if (hasAnimal) {
      api.cattle.getAll()
        .then(res => {
          const list = Array.isArray(res) ? res : (res?.data ?? []);
          setRawAnimals(list);
          animal_opts = list.map(c => ({
            label: `${c.tag || c.tag_id} (${c.cattleType || c.animalType || ''})`,
            value: c._id || c.id,
            shed: c.shed || c.shedId || ''
          }));
          tryMerge();
        })
        .catch(console.error);
    }

    if (hasFeedType) {
      api.feedItems.getAll()
        .then(res => {
          const list = Array.isArray(res) ? res : (res?.data ?? []);
          setRawFeedItems(list);
          feed_opts = list.filter(item => item.status !== false).map(item => item.name).filter(Boolean);
          tryMerge();
        })
        .catch(console.error);
    }

    if (hasMedicineName) {
      api.medicines.getAll()
        .then(res => {
          const list = Array.isArray(res) ? res : (res?.data ?? []);
          setRawMedicines(list);
          medicine_opts = list.filter(item => item.status !== false).map(item => item.name).filter(Boolean);
          tryMerge();
        })
        .catch(console.error);
    }

    if (hasFarm) {
      api.farms.getAll()
        .then(res => {
          let farmList = Array.isArray(res) ? res : (res?.data ?? []);
          if (farmList.length === 0) {
            try {
              const storedUser = localStorage.getItem("user");
              if (storedUser) {
                const user = JSON.parse(storedUser);
                const userFarmId = user.farmId && typeof user.farmId === 'object'
                  ? (user.farmId._id || user.farmId.id)
                  : user.farmId;
                if (userFarmId && userFarmId !== 'ALL') {
                  farmList = [{ _id: userFarmId, id: userFarmId, name: user.farm || "My Assigned Farm" }];
                }
              }
            } catch (e) {}
          }
          farm_opts = farmList.map(f => ({
            label: f.name || f.code,
            value: f._id || f.id
          })).filter(o => o.value);
          tryMerge();
        })
        .catch(console.error);
    }

    if (isFeeding) {
      api.feedItems.getAll()
        .then(res => {
          const list = Array.isArray(res) ? res : (res?.data ?? []);
          setRawFeedItems(list);
          dynamic_feeds = list.filter(item => item.status !== false).map(item => item.name).filter(Boolean);
          tryMerge();
        })
        .catch(err => {
          console.error(err);
          dynamic_feeds = [];
          tryMerge();
        });
    }

    if (hasLabor) {
      api.labors.getAll()
        .then(res => {
          const list = Array.isArray(res) ? res : (res?.data ?? []);
          setRawLabors(list);
          labor_opts = list.filter(item => item.status === 'ACTIVE' && item.isDeleted !== true).map(l => ({
            label: l.name,
            value: l._id || l.id
          }));
          tryMerge();
        })
        .catch(console.error);
    }

    if (hasSourcingFarm) {
      api.lands.getAll()
        .then(res => {
          const list = Array.isArray(res) ? res : (res?.data ?? []);
          const activeFarmId = getActiveFarmId();
          let filtered = list.filter(item => item.status !== 'MAINTENANCE' && item.isDeleted !== true);
          if (activeFarmId) {
            filtered = filtered.filter(item => {
              const landFarmId = item.farmId && typeof item.farmId === 'object'
                ? (item.farmId._id || item.farmId.id)
                : item.farmId;
              return String(landFarmId) === activeFarmId;
            });
          }
          sourcing_farm_opts = filtered.map(item => ({
            label: item.name || item.code,
            value: item._id || item.id
          }));
          tryMerge();
        })
        .catch(console.error);
    }

    if (hasProcuredFrom) {
      api.procurementSources.getAll()
        .then(res => {
          const list = Array.isArray(res) ? res : (res?.data ?? []);
          const activeFarmId = getActiveFarmId();
          let filtered = list.filter(item => item.status !== false && item.isDeleted !== true);
          if (activeFarmId) {
            filtered = filtered.filter(item => {
              const resFarmId = item.farmId && typeof item.farmId === 'object'
                ? (item.farmId._id || item.farmId.id)
                : item.farmId;
              return String(resFarmId) === activeFarmId;
            });
          }
          procured_from_opts = filtered.map(item => ({
            label: `${item.name} (${item.code})`,
            value: item.name
          }));
          tryMerge();
        })
        .catch(err => {
          console.error(err);
          procured_from_opts = [];
          tryMerge();
        });
    }

    if (!hasShed && !hasAnimal && !hasFeedType && !hasMedicineName && !hasFarm && !isFeeding && !hasLabor && !hasSourcingFarm && !hasProcuredFrom) {
      setDynamicFields(current.fields);
    }
  }, [moduleConfig]);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const moduleApi = getApiForModule(current.id);
      let data = moduleApi ? await moduleApi.getAll() : [];
      const rawList = Array.isArray(data) ? data : (data?.data ?? []);

      const normalized = rawList.map(log => {
        const dateVal = log.date || log.entryDate || log.createdAt || log.purchaseDate;
        return {
          ...log,
          entryDate: dateVal ? formatDateToDDMMYYYY(dateVal) : (log.entryDate || '-'),
        };
      });

      let finalList = normalized;
      if (current.id === 'feed_inv') {
        const combinedMap = {};
        normalized.forEach(log => {
          const dateKey = log.entryDate;
          const farmKey = log.farmId
            ? (typeof log.farmId === 'object'
                ? (log.farmId.code || log.farmId.name || log.farmId._id)
                : log.farmId)
            : 'UNKNOWN_FARM';
          const feedKey = String(log.feedType || '').trim().toUpperCase();

          if (log.usage > 0) {
            const groupKey = `${dateKey}_${farmKey}_${feedKey}_usage`;
            if (!combinedMap[groupKey]) {
              combinedMap[groupKey] = {
                ...log,
                _ids: [log._id || log.id].filter(Boolean),
              };
            } else {
              const existing = combinedMap[groupKey];
              if (log._id || log.id) {
                existing._ids.push(log._id || log.id);
              }
              existing.usage = (existing.usage || 0) + log.usage;
              existing.remainingStock = Math.min(existing.remainingStock || 0, log.remainingStock || 0);
              existing.oldStock = Math.max(existing.oldStock || 0, log.oldStock || 0);
            }
          } else {
            const groupKey = log._id || log.id || Math.random().toString();
            combinedMap[groupKey] = { ...log };
          }
        });

        finalList = Object.values(combinedMap).sort((a, b) => {
          const dateA = a.entryDate ? new Date(a.entryDate.split('/').reverse().join('-')) : new Date(0);
          const dateB = b.entryDate ? new Date(b.entryDate.split('/').reverse().join('-')) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
      }
      setLogs(finalList);
    } catch (e) {
      console.error(`[OpsLogPg] fetchLogs error for ${current.id}:`, e);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const defaultFilter = (router.isReady && router.query.date)
      ? [{ field: 'entryDate', value: '', from: router.query.date, to: router.query.date }]
      : [{ field: 'entryDate', value: '', from: '', to: '' }];
    setFilters(defaultFilter);
    setAppliedFilters(defaultFilter);
    setFilterSearchQueries({});
    setCurrentPage(1);
  }, [moduleConfig, router.isReady, router.query.date]);

  const getActiveFarmId = () => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const rawFarmId = user.farmId && typeof user.farmId === 'object'
          ? (user.farmId._id || user.farmId.id)
          : user.farmId;
        const isGlobal =
          !rawFarmId ||
          rawFarmId === 'ALL' ||
          String(user.role).toUpperCase() === 'SUPER_ADMIN';
        if (!isGlobal) {
          return rawFarmId;
        }
      }
      const pageKey = '__active_farm_id_' + window.location.pathname.replace(/\//g, '_') + '__';
      const activeFarm = localStorage.getItem(pageKey) || localStorage.getItem("__active_farm_id__");
      if (activeFarm && activeFarm !== 'ALL') {
        return activeFarm;
      }
    } catch (e) {}
    return null;
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async (data) => {
    setIsLoading(true);
    try {
      const moduleApi = getApiForModule(current.id);
      if (!moduleApi) throw new Error('Unsupported module');

      const now = new Date();
      const dateStr = data.date || now.toISOString();
      const d = parseDateString(dateStr);
      const formattedDate = d ? formatDateToDDMMYYYY(d) : `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;

      const activeFarm = getActiveFarmId();
      const originalFarmId = selectedEntry?.farmId && typeof selectedEntry.farmId === 'object'
        ? (selectedEntry.farmId._id || selectedEntry.farmId.id)
        : selectedEntry?.farmId;

      const resolveItemFarmId = (item) => {
        if (originalFarmId) return originalFarmId;
        if (activeFarm) return activeFarm;

        // Fallback for global user viewing 'All Farms' -> resolve from animal, shed, feed, or medicine
        if (item.animalId) {
          const selectedAnimal = rawAnimals.find(a => (a._id || a.id) === item.animalId || a.tag_id === item.animalId || a.tag === item.animalId);
          if (selectedAnimal) {
            return selectedAnimal.farmId && typeof selectedAnimal.farmId === 'object'
              ? (selectedAnimal.farmId._id || selectedAnimal.farmId.id)
              : selectedAnimal.farmId;
          }
        }
        if (item.shedId) {
          const selectedShed = rawSheds.find(s => (s._id || s.id) === item.shedId || s.name === item.shedId || s.code === item.shedId);
          if (selectedShed) {
            return selectedShed.farmId && typeof selectedShed.farmId === 'object'
              ? (selectedShed.farmId._id || selectedShed.farmId.id)
              : selectedShed.farmId;
          }
        }
        if (item.feedType) {
          const selectedFeed = rawFeedItems.find(f => f.name === item.feedType);
          if (selectedFeed) {
            return selectedFeed.farmId && typeof selectedFeed.farmId === 'object'
              ? (selectedFeed.farmId._id || selectedFeed.farmId.id)
              : selectedFeed.farmId;
          }
        }
        if (item.medicineName) {
          const selectedMed = rawMedicines.find(m => m.name === item.medicineName);
          if (selectedMed) {
            return selectedMed.farmId && typeof selectedMed.farmId === 'object'
              ? (selectedMed.farmId._id || selectedMed.farmId.id)
              : selectedMed.farmId;
          }
        }
        return null;
      };

      let payload;
      if (Array.isArray(data)) {
        payload = data.map(item => {
          const itemPayload = { ...item };
          if (current.id === 'feeding') {
            const feedingFields = dynamicFields.filter(f => f.type === 'number').map(f => f.name);
            feedingFields.forEach(f => {
              if (itemPayload[f] === "" || itemPayload[f] === undefined || itemPayload[f] === null) {
                itemPayload[f] = 0;
              } else {
                const numVal = Number(itemPayload[f]);
                itemPayload[f] = isNaN(numVal) ? 0 : numVal;
              }
            });
          }
          itemPayload.entryDate = formattedDate;
          itemPayload.date = d ? d.toISOString() : now.toISOString();
          const itemFarmId = resolveItemFarmId(item);
          if (itemFarmId) {
            itemPayload.farmId = itemFarmId;
          }
          return itemPayload;
        });
      } else {
        payload = { ...data };
        if (current.id === 'feeding') {
          const feedingFields = dynamicFields.filter(f => f.type === 'number').map(f => f.name);
          feedingFields.forEach(f => {
            if (payload[f] === "" || payload[f] === undefined || payload[f] === null) {
              payload[f] = 0;
            } else {
              const numVal = Number(payload[f]);
              payload[f] = isNaN(numVal) ? 0 : numVal;
            }
          });
        }
        payload.entryDate = formattedDate;
        payload.date = d ? d.toISOString() : now.toISOString();
        const itemFarmId = resolveItemFarmId(data);
        if (itemFarmId) {
          payload.farmId = itemFarmId;
        }
      }

      const entryId = selectedEntry?.id || selectedEntry?._id;
      if (isEditing) {
        await moduleApi.update(entryId, payload);
        swalSuccess('Success', `${current.name} updated successfully!`);
      } else {
        await moduleApi.create(payload);
        swalSuccess('Success', `${current.name} entry created successfully!`);
      }

      await fetchLogs();
      closeAllModals();
    } catch (e) {
      console.error('[OpsLogPg] Save error:', e);
      const errMsg = typeof e === 'string' ? e : (e?.message || 'Failed to save. Please try again.');
      swalError('Error', errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    const confirmed = await swalConfirm('Delete Record?', 'Permanently delete this record?');
    if (!confirmed) return;
    setIsLoading(true);
    try {
      const moduleApi = getApiForModule(current.id);
      if (current.id === 'feed_inv' && selectedEntry?._ids && selectedEntry._ids.length > 0) {
        await Promise.all(selectedEntry._ids.map(id => moduleApi.delete(id)));
      } else {
        const entryId = selectedEntry?.id || selectedEntry?._id;
        await moduleApi.delete(entryId);
      }
      swalSuccess('Deleted', `${current.name} record deleted.`);
      await fetchLogs();
      closeAllModals();
    } catch (e) {
      swalError('Error', 'Failed to delete record.');
    } finally {
      setIsLoading(false);
    }
  };

  const closeAllModals = () => {
    setShowForm(false);
    setSelectedEntry(null);
    setIsEditing(false);
    setViewMode(false);
  };

  // ── Filters ──────────────────────────────────────────────────────────────
  const filteredLogs = logs.filter(log => {
    // Group active filters by field name
    const groupedFilters = {};
    for (const f of appliedFilters) {
      const fieldConfig = dynamicFields.find(field => field.name === f.field);
      const isDate = f.field === 'entryDate' || fieldConfig?.type === "date" || f.field.toLowerCase().includes("date") || f.field.toLowerCase() === "dob";
      const isRange = fieldConfig?.type === "number";
      const hasValue = isDate || isRange ? (f.from || f.to) : (f.value && (Array.isArray(f.value) ? f.value.length > 0 : String(f.value).trim() !== ""));
      if (!hasValue) continue;

      if (!groupedFilters[f.field]) {
        groupedFilters[f.field] = [];
      }
      groupedFilters[f.field].push(f);
    }

    let isMatched = true;
    for (const fieldName in groupedFilters) {
      const fieldFilters = groupedFilters[fieldName];
      let matchAnyForField = false;

      for (const f of fieldFilters) {
        let currentMatch = true;
        const fieldConfig = dynamicFields.find(field => field.name === f.field);

        // 📅 DATE RANGE FILTER
        if (f.field === 'entryDate' || fieldConfig?.type === "date" || f.field.toLowerCase().includes("date") || f.field.toLowerCase() === "dob") {
          const logDate = log[f.field] || (f.field === 'entryDate' ? log.date : null);
          if (!logDate) {
            currentMatch = false;
          } else {
            const current = parseDateString(logDate);
            if (!current || isNaN(current.getTime())) {
              currentMatch = false;
            } else {
              current.setHours(0, 0, 0, 0);

              if (f.from) {
                const fromDate = parseDateString(f.from);
                if (fromDate) {
                  fromDate.setHours(0, 0, 0, 0);
                  if (current < fromDate) currentMatch = false;
                }
              }

              if (f.to) {
                const toDate = parseDateString(f.to);
                if (toDate) {
                  toDate.setHours(0, 0, 0, 0);
                  if (current > toDate) currentMatch = false;
                }
              }
            }
          }
        }
        // 🔢 RANGE FILTER FOR NUMBER FIELDS
        else if (fieldConfig?.type === "number") {
          const valStr = String(log[f.field] || "").trim();
          const valNum = parseFloat(valStr.replace(/[^0-9.]/g, ''));
          if (isNaN(valNum)) {
            currentMatch = false;
          } else {
            if (f.from) {
              const fromNum = parseFloat(f.from);
              if (!isNaN(fromNum) && valNum < fromNum) currentMatch = false;
            }
            if (f.to) {
              const toNum = parseFloat(f.to);
              if (!isNaN(toNum) && valNum > toNum) currentMatch = false;
            }
          }
        }
        // 🔁 MULTI-SELECT CHECKBOX MATCH
        else if (fieldConfig?.type === "select") {
          const selectedValues = Array.isArray(f.value) ? f.value : (f.value ? [f.value] : []);
          if (selectedValues.length > 0) {
            const recordVal = log[f.field];
            const optionMatched = selectedValues.some(v => {
              const valStr = String(v).toLowerCase();
              if (recordVal && typeof recordVal === 'object') {
                const subId = String(recordVal._id || recordVal.id || "").toLowerCase();
                const subName = String(recordVal.name || "").toLowerCase();
                const subCode = String(recordVal.code || "").toLowerCase();
                return subId === valStr || subName === valStr || subCode === valStr;
              }
              const recordValStr = String(recordVal || "").toLowerCase();
              return recordValStr === valStr || recordValStr.includes(valStr);
            });
            if (!optionMatched) currentMatch = false;
          }
        }
        else {
          // 🔁 NORMAL FILTER
          if (f.value) {
            currentMatch = String(log[f.field] || "")
              .toLowerCase()
              .includes(f.value.toLowerCase());
          }
        }

        if (currentMatch) {
          matchAnyForField = true;
          break; // Matches at least one filter for this field
        }
      }

      if (!matchAnyForField) {
        isMatched = false;
        break; // Fails this field, so fail the whole check
      }
    }
    return isMatched;
  });

  const totalItems = filteredLogs.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
  const activeFilterCount = appliedFilters.filter(
    f => {
      const fieldConfig = dynamicFields.find(fd => fd.name === f.field);
      const isDate = f.field === 'entryDate' || fieldConfig?.type === 'date' || f.field.toLowerCase().includes("date") || f.field.toLowerCase() === "dob";
      const isRange = fieldConfig?.type === 'number';
      return isDate || isRange
        ? (f.from || f.to)
        : (Array.isArray(f.value) ? f.value.length > 0 : String(f.value || '').trim() !== '');
    }
  ).length;

  // ── Excel Export ─────────────────────────────────────────────────────────
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(current.name);
    worksheet.columns = [
      { header: 'Date', key: 'entryDate', width: 15 },
      ...dynamicFields.map(f => ({ header: f.label, key: f.name, width: 20 }))
    ];
    filteredLogs.forEach(log => {
      worksheet.addRow({ entryDate: log.entryDate, ...dynamicFields.reduce((a, f) => { a[f.name] = log[f.name]; return a; }, {}) });
    });
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '16223F' } };
      cell.font = { name: 'Segoe UI', bold: true, color: { argb: 'FFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    headerRow.height = 28;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell(cell => {
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
          if (rowNumber % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
          }
        });
        row.height = 20;
      }
    });
    worksheet.columns.forEach(col => {
      let maxLen = 0;
      col.eachCell({ includeEmpty: true }, cell => {
        const val = cell.value ? String(cell.value) : '';
        if (val.length > maxLen) maxLen = val.length;
      });
      col.width = Math.max(maxLen + 4, 15);
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${current.name}_logs.xlsx`; a.click();
    window.URL.revokeObjectURL(url);
  };

  // ── PDF Export ───────────────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'A4' });
    const columns = ['Date', ...dynamicFields.map(f => f.label)];
    const rows = filteredLogs.map(log => [log.entryDate, ...dynamicFields.map(f => log[f.name])]);
    const img = new Image();
    img.src = '/LOGO.png';
    const drawTable = (startY) => {
      autoTable(doc, {
        head: [columns], body: rows, startY,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 6, overflow: 'linebreak', valign: 'middle' },
        headStyles: { fillColor: [22, 34, 63], textColor: 255, fontSize: 9, halign: 'center' },
        bodyStyles: { halign: 'left' },
        tableWidth: 'auto', margin: { left: 20, right: 20 },
      });
      doc.save(`${current.name}_logs.pdf`);
    };
    img.onload = () => {
      doc.addImage(img, 'PNG', 20, 10, 40, 40);
      doc.setFontSize(16); doc.setTextColor(22, 34, 63); doc.setFont('helvetica', 'bold');
      doc.text(`${current.icon} ${current.name}`, 75, 26);
      doc.setFontSize(9); doc.setTextColor(209, 134, 125); doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 75, 40);
      drawTable(60);
    };
    img.onerror = () => {
      doc.setFontSize(16); doc.setTextColor(22, 34, 63); doc.setFont('helvetica', 'bold');
      doc.text(`${current.icon} ${current.name}`, 20, 25);
      drawTable(50);
    };
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!moduleConfig) {
    return (
      <div className="p-20 text-center bg-white min-h-screen">
        <h1 className="text-2xl font-bold text-red-600">Configuration Error</h1>
        <p className="text-gray-500">The moduleConfig prop is missing.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col bg-transparent text-slate-800">

      {/* ── Header ── */}
      {moduleConfig.hideHeader ? (
        <div className="flex justify-end items-center mb-6 w-full">
          <div className="flex flex-wrap gap-2 w-full md:w-auto items-end justify-end">
            <FarmFilterSelector layout="horizontal" size="sm" showAllOption={current.showAllOption !== false} />
            <button onClick={exportExcel} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-md hover:bg-emerald-700 transition-all text-sm">
              📊 Excel
            </button>
            <button onClick={exportPDF} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold shadow-md hover:bg-red-700 transition-all text-sm">
              📄 PDF
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative px-4 py-2 rounded-lg font-bold border text-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md ${
                showFilters ? 'bg-[#D1867D]/10 border-[#D1867D]/20 text-[#16223F]' : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              🔍 Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {canCreate && (
              <button
                onClick={() => { setIsEditing(false); setShowForm(true); }}
                className="hidden md:block bg-[#16223F] text-white px-5 py-2 rounded-lg font-bold shadow-lg hover:bg-[#16223F]/90 transition-all text-sm"
              >
                + Add Entry
              </button>
            )}
          </div>
        </div>
      ) : (
        <ModulePageHeader
          title={`${current.icon || "📋"} ${current.name}`}
          description={`Module: ${current.name}`}
        >
          <div className="flex flex-wrap gap-2 w-full md:w-auto items-end">
            <FarmFilterSelector layout="horizontal" size="sm" showAllOption={current.showAllOption !== false} />
            <button onClick={exportExcel} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-md hover:bg-emerald-700 transition-all text-sm">
              📊 Excel
            </button>
            <button onClick={exportPDF} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold shadow-md hover:bg-red-700 transition-all text-sm">
              📄 PDF
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative px-4 py-2 rounded-lg font-bold border text-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md ${
                showFilters ? 'bg-[#D1867D]/10 border-[#D1867D]/20 text-[#16223F]' : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              🔍 Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {canCreate && (
              <button
                onClick={() => { setIsEditing(false); setShowForm(true); }}
                className="hidden md:block bg-[#16223F] text-white px-5 py-2 rounded-lg font-bold shadow-lg hover:bg-[#16223F]/90 transition-all text-sm"
              >
                + Add Entry
              </button>
            )}
          </div>
        </ModulePageHeader>
      )}

      {/* ── Filter Modal ── */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto p-6">
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
                      updated[index] = { field: e.target.value, value: '', from: '', to: '' };
                      setFilters(updated);
                    }}
                  >
                    <option value="entryDate">Date</option>
                    {dynamicFields.map(field => (
                      <option key={field.name} value={field.name}>{field.label}</option>
                    ))}
                  </select>

                  {(() => {
                    const fieldConfig = dynamicFields.find(field => field.name === f.field);

                    // 📅 DATE RANGE FIELD
                    if (f.field === 'entryDate' || f.field.toLowerCase().includes("date") || f.field.toLowerCase() === "dob") {
                      return (
                        <div className="flex gap-2">
                          <input
                            type="date"
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm w-full bg-white text-[#16223F] font-semibold"
                            value={f.from ? f.from.split('/').reverse().join('-') : ''}
                            onChange={(e) => {
                              const updated = [...filters];
                              updated[index].from = e.target.value ? e.target.value.split('-').reverse().join('/') : '';
                              setFilters(updated);
                            }}
                          />
                          <input
                            type="date"
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm w-full bg-white text-[#16223F] font-semibold"
                            value={f.to ? f.to.split('/').reverse().join('-') : ''}
                            onChange={(e) => {
                              const updated = [...filters];
                              updated[index].to = e.target.value ? e.target.value.split('-').reverse().join('/') : '';
                              setFilters(updated);
                            }}
                          />
                        </div>
                      );
                    }

                    // 🔢 RANGE FIELD FOR NUMBER FIELDS
                    if (fieldConfig?.type === "number") {
                      return (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Min..."
                            step="any"
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-[#16223F] font-semibold outline-none focus:border-[#D1867D] w-full"
                            value={f.from || ""}
                            onChange={(e) => {
                              const updated = [...filters];
                              updated[index].from = e.target.value;
                              setFilters(updated);
                            }}
                          />
                          <input
                            type="number"
                            placeholder="Max..."
                            step="any"
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-[#16223F] font-semibold outline-none focus:border-[#D1867D] w-full"
                            value={f.to || ""}
                            onChange={(e) => {
                              const updated = [...filters];
                              updated[index].to = e.target.value;
                              setFilters(updated);
                            }}
                          />
                        </div>
                      );
                    }

                    // 📋 SELECT FIELD (MULTI-SELECT CHECKBOXES)
                    if (fieldConfig?.type === "select") {
                      const currentSelected = Array.isArray(f.value) ? f.value : (f.value ? [f.value] : []);
                      const options = fieldConfig.options || [];
                      const query = (filterSearchQueries[index] || "").toLowerCase();
                      const filteredOptions = options.filter(opt => {
                        const labelStr = typeof opt === 'object' ? (opt.label || opt.value) : opt;
                        return String(labelStr || "").toLowerCase().includes(query);
                      });

                      return (
                        <div className="flex flex-col gap-1.5 bg-white border border-slate-200 rounded-lg p-2.5">
                          {((current.id === 'med_inv' && ['medicineName', 'type'].includes(f.field)) ||
                            (current.id === 'feed_inv' && ['feedType'].includes(f.field))) && (
                            <input
                              type="text"
                              placeholder="Search options..."
                              value={filterSearchQueries[index] || ""}
                              onChange={(e) => setFilterSearchQueries({
                                ...filterSearchQueries,
                                [index]: e.target.value
                              })}
                              className="w-full h-8 px-2.5 mb-2 rounded-lg border border-slate-200 text-xs bg-slate-50 outline-none focus:bg-white focus:border-[#D1867D] transition-all text-black font-semibold"
                            />
                          )}
                          <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto w-full">
                            {filteredOptions.length === 0 ? (
                              <div className="text-xs text-slate-400 p-1 text-center font-bold">No matching options</div>
                            ) : (
                              filteredOptions.map((opt) => {
                                const valStr = typeof opt === 'object' ? opt.value : opt;
                                const labelStr = typeof opt === 'object' ? opt.label : opt;
                                const isChecked = currentSelected.includes(valStr);

                                return (
                                  <label key={valStr} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50 p-0.5 rounded">
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
                              })
                            )}
                          </div>
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
                      setFilters(updated.length ? updated : [{ field: 'entryDate', value: '', from: '', to: '' }]);
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
                onClick={() => setFilters([...filters, { field: 'entryDate', value: '', from: '', to: '' }])}
                className="flex-1 bg-[#D1867D]/10 text-[#16223F] py-2 rounded-lg font-bold text-sm hover:bg-[#D1867D]/20 cursor-pointer"
              >
                + Add Filter
              </button>
              <button
                onClick={() => {
                  const defaultFilter = [{ field: 'entryDate', value: '', from: '', to: '' }];
                  setFilters(defaultFilter);
                  setAppliedFilters(defaultFilter);
                  setFilterSearchQueries({});
                  setCurrentPage(1);
                  setShowFilters(false);
                }}
                className="flex-1 bg-red-100 text-red-600 py-2 rounded-lg font-bold text-sm cursor-pointer"
              >
                Clear
              </button>
            </div>
            <button
              onClick={() => {
                setAppliedFilters(filters.map(f => ({
                  ...f,
                  value: Array.isArray(f.value) ? [...f.value] : f.value
                })));
                setShowFilters(false);
                setCurrentPage(1);
              }}
              className="mt-4 w-full bg-[#16223F] hover:bg-[#16223F]/90 text-white py-2.5 rounded-lg font-bold cursor-pointer"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-full md:min-w-[600px]">
          <thead className="bg-[#16223F]/5 text-[#16223F] uppercase text-[10px] font-black tracking-widest">
            <tr>
              <th className="p-4 border-b">Date</th>
              {dynamicFields.filter(f => f.name !== 'date').map(f => <th key={f.name} className="p-4 border-b">{f.label}</th>)}
              <th className="p-4 border-b w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              [1,2,3,4,5].map(i => (
                <tr key={i} className="animate-pulse border-b border-gray-100">
                  {[...Array(dynamicFields.length + 2)].map((_, j) => (
                    <td key={j} className="p-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                  ))}
                </tr>
              ))
            ) : paginatedLogs.length > 0 ? (
              paginatedLogs.map(log => (
                <tr
                  key={log._id || log.id || Math.random()}
                  className="hover:bg-[#D1867D]/5 cursor-pointer group transition-colors"
                  onClick={() => setSelectedEntry(log)}
                >
                  <td className="p-4 text-sm text-black font-sans">{log.entryDate}</td>
                  {dynamicFields.filter(f => f.name !== 'date').map(f => {
                    let cellVal = log[f.name];
                    if (cellVal && Array.isArray(cellVal)) {
                      cellVal = cellVal.map(item => {
                        if (item && typeof item === 'object' && item.name && item.liters !== undefined) {
                          return `${item.name} (${item.liters} L)`;
                        }
                        return String(item);
                      }).join(', ');
                    } else if (cellVal && typeof cellVal === 'object') {
                      if (f.name === 'sourcingFarmId') {
                        const farmName = cellVal.name || '';
                        const destinationName = cellVal.farmId?.name || cellVal.farmId?.code || '';
                        cellVal = farmName + (destinationName ? ` (${destinationName})` : '');
                      } else {
                        cellVal = cellVal.name || cellVal.code || cellVal.title || cellVal.id || cellVal._id || String(cellVal);
                      }
                    }
                    if (f.type === 'date' && cellVal) {
                      cellVal = formatDateToDDMMYYYY(cellVal);
                    }
                    if (f.name === 'purchaseDate' && current.id === 'feed_inv' && !Number(log.bought)) {
                      cellVal = '';
                    }
                    return (
                      <td key={f.name} className="p-4 font-semibold text-black text-sm">
                        {cellVal ?? '-'}
                      </td>
                    );
                  })}
                  <td className="p-4 text-gray-400 group-hover:text-[#D1867D] text-xl font-bold text-center transition-colors">⋮</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={dynamicFields.length + 2} className="p-12 text-center text-black text-sm font-medium opacity-50">
                  No records found for {current.name}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex justify-between items-center mt-4">
        <p className="text-sm text-black opacity-60">
          Showing {totalItems === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, totalItems)} of {totalItems} records
        </p>
        <div className="flex gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}
            className="px-4 py-1 border rounded-lg bg-white hover:bg-gray-100 transition disabled:opacity-40">Prev</button>
          <span className="px-3 py-1 font-semibold text-sm">Page {currentPage}</span>
          <button onClick={() => setCurrentPage(p => p + 1)} disabled={endIndex >= totalItems}
            className="px-4 py-1 border rounded-lg bg-white hover:bg-gray-100 transition disabled:opacity-40">Next</button>
        </div>
      </div>

      {/* ── Action Menu Modal ── */}
      {selectedEntry && !showForm && !viewMode && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-[320px]">
            <h3 className="font-bold text-lg mb-4 text-center text-black">Manage Record</h3>
            <div className="space-y-2">
              <button onClick={() => setViewMode(true)}
                className="w-full flex items-center justify-center gap-2 bg-gray-500 text-white py-3 rounded-xl font-semibold hover:bg-gray-600 transition-all">
                👁️ View Details
              </button>
              {canEdit && current.id !== 'feed_inv' && (
                <button onClick={() => { setIsEditing(true); setShowForm(true); }}
                  className="w-full flex items-center justify-center gap-2 bg-[#D1867D] text-white py-3 rounded-xl font-semibold hover:bg-[#D1867D]/90 shadow-lg shadow-[#D1867D]/10 transition-all">
                  ✏️ Edit Entry
                </button>
              )}
              {canDelete && (
                <button onClick={handleDelete}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-xl font-semibold hover:bg-red-100 transition-all">
                  🗑️ Delete Entry
                </button>
              )}
              <button onClick={() => setSelectedEntry(null)}
                className="w-full text-black opacity-50 py-2 hover:opacity-100 transition-colors">
                Close Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Details Modal ── */}
      {selectedEntry && viewMode && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto relative">
            <button onClick={() => setViewMode(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors text-xl font-bold p-1">
              ✕
            </button>
            <h3 className="text-lg font-bold mb-4 text-center text-black">{current.name} Details</h3>
            <div className="mt-4 border-t pt-4 space-y-3 text-sm text-black">
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-gray-500">Date</span>
                <span className="text-right">{selectedEntry.entryDate}</span>
              </div>
              {dynamicFields.map(field => {
                let cellVal = selectedEntry[field.name];
                if (cellVal && Array.isArray(cellVal)) {
                  cellVal = cellVal.map(item => {
                    if (item && typeof item === 'object' && item.name && item.liters !== undefined) {
                      return `${item.name} (${item.liters} L)`;
                    }
                    return String(item);
                  }).join(', ');
                } else if (cellVal && typeof cellVal === 'object') {
                  cellVal = cellVal.name || cellVal.code || cellVal.title || cellVal.id || cellVal._id || String(cellVal);
                }
                if (field.type === 'date' && cellVal) {
                  cellVal = formatDateToDDMMYYYY(cellVal);
                }
                return (
                  <div key={field.name} className="flex justify-between border-b pb-2">
                    <span className="font-semibold text-gray-500">{field.label}</span>
                    <span className="text-right font-medium">{cellVal ?? '-'}</span>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setViewMode(false)}
              className="mt-6 w-full bg-gray-200 hover:bg-gray-300 py-2 rounded-lg font-semibold transition-all">
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── LogForm ── */}
      {showForm && (
        <LogForm
          title={isEditing ? `Update ${current.name}` : `New ${current.name}`}
          fields={dynamicFields}
          initialData={isEditing ? selectedEntry : {}}
          onSubmit={handleSave}
          onClose={closeAllModals}
          existingRecords={logs}
        />
      )}

      {/* ── Mobile FAB ── */}
      {canCreate && !showForm && !selectedEntry && !viewMode && !showFilters && (
        <div className={`md:hidden fixed bottom-20 right-6 z-[100] transition-all duration-300 ${
          showFAB ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'
        }`}>
          <button
            onClick={() => { setIsEditing(false); setShowForm(true); }}
            className="w-14 h-14 bg-[#D1867D] text-white rounded-full shadow-[0_10px_25px_rgba(209,134,125,0.4)] flex items-center justify-center text-3xl font-bold hover:bg-[#D1867D]/95 hover:-translate-y-1 active:scale-95 transition-all duration-200"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
};

export default OpsLogPg;
