import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import LogForm from './LogForm';
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";
import SkeletonLoader from './SkeletonLoader';
import { hasActionPermission } from "../utils/permission";
import FarmOverview from './FarmOverview';

const toCamelCase = (str) => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');
};

const FarmTKP = ({ farmCode = 'TKP' }) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [showForm, setShowForm] = useState(false);

  const canDelete = hasActionPermission('SHED_LOG', 'SHED_LOG', 'delete');

  const [userObj, setUserObj] = useState(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUserObj(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Failed to parse user session in FarmTKP:", e);
    }
  }, []);

  const hasAccess = (moduleKey, exact = false) => {
    if (!userObj) return false;
    const role = userObj.role || '';
    if (role.trim().toUpperCase() === 'SUPER_ADMIN') return true;
    const permissions = userObj.permissions;
    if (!Array.isArray(permissions)) return false;
    const hasAllAccess = permissions.some(p => typeof p === 'string' && p.trim().toUpperCase() === 'ALL');
    if (hasAllAccess) return true;

    const permission = permissions.find((p) => {
      if (!p) return false;
      if (typeof p === 'object') {
        return String(p.module_key || '').trim().toLowerCase() === moduleKey.trim().toLowerCase();
      }
      if (typeof p === 'string') {
        const lowerP = p.trim().toLowerCase();
        const lowerModKey = moduleKey.trim().toLowerCase();
        if (exact) {
          return lowerP === lowerModKey;
        }
        return lowerP === lowerModKey || lowerP.startsWith(lowerModKey + '_') || lowerP.includes(lowerModKey);
      }
      return false;
    });

    if (!permission) return false;
    if (typeof permission === 'object') return !!permission.can_view;
    return true;
  };

  useEffect(() => {
    if (!userObj) return;
    let isMounted = true;

    // Fetch sheds for the form dropdown
    api.sheds.getAll()
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        if (isMounted && list.length > 0) {
          const shedOpts = list.map(s => ({ label: `Shed ${s.name || s.code}`, value: s.name || s.code }));
          setSheds(shedOpts);
        }
      })
      .catch(console.error);

    // Fetch cattle for tag lookups
    api.cattle.getAll()
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        if (isMounted && list.length > 0) {
          const cattleOpts = list.map(c => ({ label: `${c.tag} (${c.cattleType || c.animalType})`, value: c._id || c.id }));
          setAnimals(cattleOpts);
        }
      })
      .catch(console.error);

    // Fetch dynamic feeds
    api.feedItems.getAll()
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        if (isMounted && list.length > 0) {
          const feedOpts = list.filter(item => item.status !== false).map(item => item.name).filter(Boolean);
          setFeeds(feedOpts);
        }
      })
      .catch(console.error);

    // Fetch dynamic treatments (symptoms & diagnosis)
    api.treatments.getAll()
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        if (isMounted && list.length > 0) {
          const syms = Array.from(new Set(list.map(t => t.symptoms).filter(Boolean)));
          const diags = Array.from(new Set(list.map(t => t.diagnosis).filter(Boolean)));
          setSymptomOptions(syms);
          setDiagnosisOptions(diags);
        }
      })
      .catch(console.error);

    // Fetch dynamic medicines
    api.medicines.getAll()
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        if (isMounted && list.length > 0) {
          const medOpts = list.map(m => m.name).filter(Boolean);
          setMedicines(medOpts);
        }
      })
      .catch(console.error);

    return () => { isMounted = false; };
  }, [userObj]);
  const [logs, setLogs] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [showTabDropdown, setShowTabDropdown] = useState(false);
  const [showFAB, setShowFAB] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [availableFarms, setAvailableFarms] = useState([]);
  const [sheds, setSheds] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [symptomOptions, setSymptomOptions] = useState([]);
  const [diagnosisOptions, setDiagnosisOptions] = useState([]);
  const [medicines, setMedicines] = useState([]);

  const [filters, setFilters] = useState([
    { field: "entryDate", value: "", from: "", to: "" }
  ]);

  const clearAllFilters = () => {
    setFilters([{ field: "entryDate", value: "", from: "", to: "" }]);
  };
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const modules = [
    {
      id: 'overview',
      name: 'Farm Overview',
      icon: '📊',
      fields: []
    },






    {
      id: 'vaccine',
      name: 'Vaccination Log',
      icon: '💉',
      fields: [
        { name: 'tagId', label: 'Tag ID' },
        { name: 'animalType', label: 'Animal Type', disabled: true, optional: true },
        { name: 'shedId', label: 'Shed', type: 'select', options: sheds },
        { name: 'vaccinationName', label: 'Vaccine Name' },
        { name: 'batchNo', label: 'Vaccine Batch No' },
        { name: 'manufactureDate', label: 'Manufacture Date', type: 'date' },
        { name: 'expiryDate', label: 'Expiry Date', type: 'date' },
        { name: 'treatmentOrStatus', label: 'Treatment/Status', type: 'select', options: ['Completed', 'Pending'] }
      ]
    },
    {
      id: 'components',
      name: 'Milk Components',
      icon: '🔬',
      fields: [
        { name: 'date', label: 'Date', type: 'date' },
        { name: 'bmcs', label: 'BMCs & Liters', type: 'select', options: [] },
        { name: 'temperature', label: 'Temperature (°C)', type: 'number' },
        { name: 'fat', label: 'Fat %', type: 'number' },
        { name: 'snf', label: 'SNF %', type: 'number' },
        { name: 'density', label: 'CLR / Density', type: 'number' },
        { name: 'water', label: 'Water %', type: 'number' },
        { name: 'indentLiters', label: 'No. of Liters Used for Indent', type: 'number' }
      ]
    },
    {
      id: 'pashudhan',
      name: 'Bharat Pashudhan',
      icon: '🇮🇳',
      fields: [
        { name: 'uid', label: 'Pashu ID' },
        { name: 'status', label: 'Portal Status' }
      ]
    }
  ];

  const current = modules.find(m => m.id === activeTab);

  // Tab-to-permission mapping — each tab key maps to the module key guarding it
  const tabPermissionMap = {
    vaccine: 'VACCINATION_LOG',
    components: 'MILK_QA',
    pashudhan: 'CATTLE_MANAGEMENT',
  };

  const tabBaseTokenMap = {
    vaccine: 'HEALTH',
    components: 'MILK',
    pashudhan: 'CATTLE',
  };

  const fetchLogs = async () => {
    // Client-Side API Firewall — skip fetch if user lacks permission for this tab
    const requiredPermission = tabPermissionMap[activeTab];
    const basePermission = tabBaseTokenMap[activeTab];
    const hasPermission = requiredPermission && (hasAccess(requiredPermission) || (basePermission && hasAccess(basePermission, true)));

    if (requiredPermission && !hasPermission) {
      console.warn(`[FarmTKP] Access denied for tab '${activeTab}' (requires ${requiredPermission} or legacy ${basePermission}). Fetch blocked.`);
      setLogs([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let data = [];
      if (activeTab === 'health') {
        data = await api.health.treatments.getAll();
      } else if (activeTab === 'vaccine') {
        data = await api.health.vaccinations.getAll();
      } else if (activeTab === 'components') {
        data = await api.milk.quality.getAll();
      } else {
        const savedData = localStorage.getItem(`tkp_${activeTab}_logs`);
        data = savedData ? JSON.parse(savedData) : [];
      }
      let rawList;
      if (Array.isArray(data)) {
        rawList = data;
      } else if (data && Array.isArray(data.data)) {
        rawList = data.data;
      } else {
        rawList = [];
      }

      // For health/vaccine tabs, enrich records with animalType + shed from livestock
      if (activeTab === 'health' || activeTab === 'vaccine') {
        let livestockMap = {};
        try {
          const cached = sessionStorage.getItem('__livestock_tag_cache__');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && Array.isArray(parsed.list)) {
              parsed.list.forEach(a => {
                const key = String(a.tag_id || a.tag || '').trim().toUpperCase();
                if (key) livestockMap[key] = a;
              });
            }
          }
        } catch (_) { }

        if (Object.keys(livestockMap).length === 0) {
          try {
            const lsData = await api.cattle.getAll();
            const lsList = Array.isArray(lsData) ? lsData : (lsData?.data ?? []);
            lsList.forEach(a => {
              const key = String(a.tag_id || a.tag || '').trim().toUpperCase();
              if (key) livestockMap[key] = a;
            });
          } catch (_) { }
        }

        rawList = rawList.map(log => {
          const tagKey = String(log.tagId || log.tag_id || log.tag || '').trim().toUpperCase();
          const animal = tagKey ? livestockMap[tagKey] : null;
          return {
            ...log,
            animalType: log.animalType || log.animalId || (animal ? (animal.animalType || animal.cattleType || '') : ''),
            shedId: log.shedId || log.shed || (animal ? (animal.shed || animal.shedId || '') : ''),
          };
        });
      }

      const filtered = rawList.filter(log => {
        const fId = log.farmId?.code || log.farmId?.name || log.farmId || log.farm;
        if (fId && typeof fId === 'string' && fId.toUpperCase() === farmCode.toUpperCase()) {
          return true;
        }
        if (!fId && farmCode.toUpperCase() === 'TKP') {
          return true;
        }
        return false;
      });

      let finalLogs = filtered;
      if (activeTab === 'feeding') {
        const combinedMap = {};
        filtered.forEach(log => {
          const rawDate = log.date || log.entryDate || log.createdAt;
          let dateStr = '-';
          if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
              dateStr = d.toLocaleDateString('en-GB'); // formats to DD/MM/YYYY
            } else {
              dateStr = String(rawDate);
            }
          }
          const shedKey = String(log.shedId || '').trim().toUpperCase();
          const animalKey = String(log.animalId || log.tag_id || '').trim().toUpperCase();
          const groupKey = `${dateStr}_${shedKey}_${animalKey}`;

          if (!combinedMap[groupKey]) {
            combinedMap[groupKey] = {
              ...log,
              _ids: [log._id || log.id].filter(Boolean),
              date: dateStr,
              entryDate: dateStr,
            };
          } else {
            const existing = combinedMap[groupKey];
            if (log._id || log.id) {
              existing._ids.push(log._id || log.id);
            }
            // Sum all numeric properties that are feed items
            Object.keys(log).forEach(key => {
              if (
                typeof log[key] === 'number' &&
                !['__v', 'lineNo'].includes(key)
              ) {
                existing[key] = (existing[key] || 0) + log[key];
              }
            });
          }
        });
        // Sort combined list by date descending
        finalLogs = Object.values(combinedMap).sort((a, b) => {
          const dateA = a.date ? new Date(a.date.split('/').reverse().join('-')) : new Date(0);
          const dateB = b.date ? new Date(b.date.split('/').reverse().join('-')) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
      }
      setLogs(finalLogs);
    } catch (e) {
      console.error(`Error loading logs for ${activeTab}:`, e);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (router.query.tab) {
      const tab = router.query.tab;
      if (modules.find(m => m.id === tab)) {
        setActiveTab(tab);
      }
    } else {
      setActiveTab('overview');
    }
  }, [router.query.tab, router.query.code]);

  useEffect(() => {
    fetchLogs();
    setFilters([{ field: "entryDate", value: "", from: "", to: "" }]);
    setCurrentPage(1);
  }, [activeTab, farmCode]);

  useEffect(() => {
    if (!userObj) return;
    // Client-Side API Firewall — only load farms dropdown if user has FARM_MANAGEMENT access
    if (!hasAccess('FARM_MANAGEMENT')) return;
    const fetchFarms = async () => {
      try {
        const farms = await api.farms.getAll();
        const farmsArray = Array.isArray(farms) ? farms : (farms && Array.isArray(farms.data) ? farms.data : []);
        setAvailableFarms(farmsArray);
      } catch (err) {
        console.error("Failed to load farms for dropdown:", err);
      }
    };
    fetchFarms();
  }, [userObj]);


  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      if (Math.abs(window.scrollY - lastScrollY) < 10) return;

      if (window.scrollY > lastScrollY) {
        setShowFAB(false); // scrolling down → hide
      } else {
        setShowFAB(true); // scrolling up → show
      }

      lastScrollY = window.scrollY;
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (showTabDropdown || showFilters || viewMode || showForm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showTabDropdown, showFilters, viewMode, showForm]);

  useEffect(() => {

    if (showForm) {
      document.body.classList.add("hide-mobile-footer");
    } else {
      document.body.classList.remove("hide-mobile-footer");
    }

    return () => {
      document.body.classList.remove("hide-mobile-footer");
    };

  }, [showForm]);

  useEffect(() => {

    if (
      showForm ||
      showFilters ||
      viewMode ||
      selectedEntry
    ) {
      document.body.classList.add("hide-mobile-footer");
    } else {
      document.body.classList.remove("hide-mobile-footer");
    }

    return () => {
      document.body.classList.remove("hide-mobile-footer");
    };

  }, [showForm, showFilters, viewMode, selectedEntry]);

  // FIXED FILTER LOGIC
  const filteredLogs = logs.filter(log => {
    return filters.every(f => {

      // 📅 DATE RANGE
      if (f.field.toLowerCase().includes("date")) {
        if (!f.from && !f.to) return true;

        const logDate = log[f.field] || (f.field === 'date' ? log.entryDate : null);
        if (!logDate) return false;

        let current;
        if (logDate.includes("/")) {
          const parts = logDate.split("/");
          if (parts.length === 3) {
            const [d, m, y] = parts;
            current = new Date(`${y}-${m}-${d}`);
          } else {
            current = new Date(logDate);
          }
        } else {
          current = new Date(logDate);
        }

        if (isNaN(current.getTime())) return false;
        current.setHours(0, 0, 0, 0);

        if (f.from) {
          const [fd, fm, fy] = f.from.split("/");
          const fromDate = new Date(`${fy}-${fm}-${fd}`);
          fromDate.setHours(0, 0, 0, 0);
          if (current < fromDate) return false;
        }

        if (f.to) {
          const [td, tm, ty] = f.to.split("/");
          const toDate = new Date(`${ty}-${tm}-${td}`);
          toDate.setHours(0, 0, 0, 0);
          if (current > toDate) return false;
        }

        return true;
      }

      // 🔁 NORMAL FILTER
      if (!f.value) return true;

      return String(log[f.field] || "")
        .toLowerCase()
        .includes(f.value.toLowerCase());
    });
  });


  const totalItems = filteredLogs.length;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);


  const saveToStorage = (updatedLogs) => {
    setLogs(updatedLogs);
    localStorage.setItem(`tkp_${activeTab}_logs`, JSON.stringify(updatedLogs));
  };



  const handleSave = async (data) => {
    setIsLoading(true);
    try {
      const payload = { ...data, farm: farmCode, farmId: farmCode };
      const entryId = selectedEntry?.id || selectedEntry?._id;

      if (isEditing) {
        if (activeTab === 'health') await api.health.treatments.update(entryId, payload);
        else if (activeTab === 'vaccine') await api.health.vaccinations.update(entryId, payload);
        else if (activeTab === 'components') await api.milk.quality.update(entryId, payload);
        else {
          const index = logs.findIndex(log => (log.id || log._id) === entryId);
          const newLogs = [...logs];
          newLogs[index] = { ...newLogs[index], ...data };
          saveToStorage(newLogs);
        }
        swalSuccess("Success", `${current.name} updated successfully!`);
      } else {
        const now = new Date();
        const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        payload.entryDate = formattedDate;
        payload.date = now.toISOString();

        if (activeTab === 'health') await api.health.treatments.create(payload);
        else if (activeTab === 'vaccine') await api.health.vaccinations.create(payload);
        else if (activeTab === 'components') await api.milk.quality.create(payload);
        else {
          const newLogs = [{ ...data, id: Date.now(), entryDate: formattedDate }, ...logs];
          saveToStorage(newLogs);
        }
        swalSuccess("Success", `${current.name} created successfully!`);
      }
      await fetchLogs();
      closeAllModals();
    } catch (e) {
      console.error("Save error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await swalConfirm("Delete Record?", "Permanent delete this record?");
    if (confirmed) {
      setIsLoading(true);
      try {
        const entryId = selectedEntry.id || selectedEntry._id;
        if (activeTab === 'health') await api.health.treatments.delete(entryId);
        else if (activeTab === 'vaccine') await api.health.vaccinations.delete(entryId);
        else if (activeTab === 'components') await api.milk.quality.delete(entryId);
        else {
          const filtered = logs.filter(log => (log._id || log.id) !== (selectedEntry._id || selectedEntry.id));
          saveToStorage(filtered);
        }
        swalSuccess("Deleted", `${current.name} deleted successfully!`);
        await fetchLogs();
        closeAllModals();
      } catch (e) {
        console.error("Delete error:", e);
        swalError("Error", "Failed to delete record.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const closeAllModals = () => {
    setShowForm(false);
    setSelectedEntry(null);
    setIsEditing(false);
    setViewMode(false);

  };

  /* ---------- EXPORT EXCEL ---------- */
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(current.name);
    worksheet.columns = [
      { header: "Date", key: "entryDate", width: 15 },
      ...current.fields.map(field => ({ header: field.label, key: field.name, width: 20 }))
    ];
    filteredLogs.forEach(log => {
      worksheet.addRow({
        entryDate: log.entryDate,
        ...current.fields.reduce((acc, field) => { acc[field.name] = log[field.name]; return acc; }, {})
      });
    });

    // Style the header row (row 1)
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "16223F" } // Brand Navy
      };
      cell.font = {
        name: "Segoe UI",
        bold: true,
        color: { argb: "FFFFFF" },
        size: 11
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "16223F" } },
        left: { style: "thin", color: { argb: "1E293B" } },
        bottom: { style: "medium", color: { argb: "1E293B" } },
        right: { style: "thin", color: { argb: "1E293B" } }
      };
    });
    headerRow.height = 28;

    // Style body rows and auto-adjust widths
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.font = { name: "Segoe UI", size: 10 };
          cell.alignment = { vertical: "middle", horizontal: "left" };
          cell.border = {
            top: { style: "thin", color: { argb: "E2E8F0" } },
            left: { style: "thin", color: { argb: "E2E8F0" } },
            bottom: { style: "thin", color: { argb: "E2E8F0" } },
            right: { style: "thin", color: { argb: "E2E8F0" } }
          };
          if (rowNumber % 2 === 0) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "F8FAFC" } // Zebra striping
            };
          }
        });
        row.height = 20;
      }
    });

    // Auto-fit column widths based on maximum text length
    worksheet.columns.forEach((column) => {
      let maxLen = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const val = cell.value ? String(cell.value) : "";
        if (val.length > maxLen) {
          maxLen = val.length;
        }
      });
      column.width = Math.max(maxLen + 4, 15);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${current.name}_logs.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  /* ---------- EXPORT PDF ---------- */
  const exportPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "A4"
    });

    const columns = ["Date", ...current.fields.map(f => f.label)];
    const rows = filteredLogs.map(log => [log.entryDate, ...current.fields.map(f => log[f.name])]);

    const img = new Image();
    img.src = "/LOGO.png";
    img.onload = () => {
      // Landscape A4 size is 842pt x 595pt
      // Place beautiful brand logo at top-left
      doc.addImage(img, "PNG", 20, 10, 40, 40);

      // Corporate title next to logo
      doc.setFontSize(16);
      doc.setTextColor(22, 34, 63); // Brand Navy
      doc.setFont("helvetica", "bold");
      doc.text(`${farmCode} Farm - ${current.name}`, 75, 26);

      doc.setFontSize(9);
      doc.setTextColor(209, 134, 125); // Brand Rose
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 75, 40);

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 60,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 6,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: {
          fillColor: [22, 34, 63],
          textColor: 255,
          fontSize: 9,
          halign: "center",
        },
        bodyStyles: {
          halign: "left",
        },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 80 },
        },
        tableWidth: "auto",
        margin: { left: 20, right: 20 },
      });

      doc.save(`${current.name}_logs.pdf`);
    };

    img.onerror = () => {
      // Fallback if logo fails to load (draw text at original position)
      doc.setFontSize(16);
      doc.setTextColor(22, 34, 63);
      doc.setFont("helvetica", "bold");
      doc.text(`${farmCode} Farm - ${current.name}`, 20, 25);

      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 38);

      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 50,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 6,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: {
          fillColor: [22, 34, 63],
          textColor: 255,
          fontSize: 9,
          halign: "center",
        },
        bodyStyles: {
          halign: "left",
        },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 80 },
        },
        tableWidth: "auto",
        margin: { left: 20, right: 20 },
      });

      doc.save(`${current.name}_logs.pdf`);
    };
  };


  const activeFilterCount = filters.filter(
    f => (f.value && f.value.trim() !== "") || f.from || f.to
  ).length;
  return (
    <div className="w-full flex flex-col bg-transparent text-slate-800">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-5">
          <button
            onClick={() => router.push('/farms')}
            className="flex items-center justify-center w-12 h-12 rounded-[1rem] bg-white border border-[#e3e8f2] text-[#16223F] hover:bg-[#16223F] hover:text-white hover:border-[#16223F] shadow-sm hover:shadow-md transition-all duration-200 group"
            title="Back to Farms"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[#16223F] font-sans">{farmCode} Farm</h1>
            <p className="text-slate-500 mt-1 font-medium">{current?.name}</p>
          </div>
        </div>
        {activeTab !== 'overview' && (
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {/* Export Buttons Added to your custom header */}
            <button onClick={exportExcel} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-md hover:bg-emerald-700 transition-all">📊 Excel</button>
            <button onClick={exportPDF} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold shadow-md hover:bg-red-700 transition-all">📄 PDF</button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
    relative
    px-4 py-2 rounded-lg font-bold border
    transition-all duration-200 ease-out 
    hover:-translate-y-[1px] hover:shadow-md
    ${showFilters
                  ? 'bg-[#D1867D]/10 border-[#D1867D]/20 text-[#16223F] hover:bg-[#D1867D]/20'
                  : 'bg-white border-gray-300 hover:bg-gray-50'}
  `}
            >
              {showFilters ? '✕ Hide Filter' : '🔍 Filters'}

              {/* 🔴 FILTER COUNT BADGE */}
              {activeFilterCount > 0 && (
                <span className="
    absolute -top-2 -right-2
    bg-red-600 text-white
    text-[10px] font-bold
    px-1.5 py-0.5
    rounded-full
    min-w-[18px]
    text-center
  ">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setIsEditing(false); setShowForm(true); }}
              className="hidden md:block bg-[#16223F] text-white px-5 py-2 rounded-lg font-bold shadow-lg hover:bg-[#16223F]/90 transition-all"
            >
              + Add Entry
            </button>
          </div>
        )}
      </header>

      {/* PILL TABS */}
      {activeTab !== 'overview' && (
        <div className="relative mb-6 w-full md:w-auto">

          {/* CAPSULE BUTTON */}
          <button
            onClick={() => setShowTabDropdown(prev => !prev)}
            className="
      w-full md:w-auto
      flex items-center justify-between
      px-4 py-2 
      rounded-full 
      border 
      bg-white
      text-sm font-bold
      shadow-sm
    "
          >
            <span>🏢 {
              (Array.isArray(availableFarms) ? availableFarms.find(f => f?.code === farmCode) : null)?.name || `${farmCode} Farm`
            }</span>

            {/* 🔽 ROTATING ARROW */}
            <span
              className={`
        ml-2 transition-transform duration-300
        ${showTabDropdown ? "rotate-180" : "rotate-0"}
      `}
            >
              ▼
            </span>
          </button>

          {/* OVERLAY */}
          {showTabDropdown && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowTabDropdown(false)}
            />
          )}

          {/* DROPDOWN */}
          <div
            className={`
      absolute left-0 mt-2 w-full 
      bg-white border rounded-xl shadow-lg z-50
      transform transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
      ${showTabDropdown
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-6 pointer-events-none"}
    `}
          >
            {Array.isArray(availableFarms) && availableFarms.map(f => (
              <button
                key={f?._id || f?.id}
                onClick={() => {
                  setShowTabDropdown(false);
                  router.push(`/farm/${f?.code}?tab=${activeTab}`);
                }}
                className={`
          w-full text-left px-4 py-2 text-sm
          hover:bg-gray-100 transition
          ${farmCode === f?.code ? 'bg-[#D1867D]/10 text-[#16223F] font-bold' : ''}
        `}
              >
                🏢 {f?.name}
              </button>
            ))}
          </div>

        </div>
      )}



      {/* Filter Bar */}



      {showFilters && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">

          <div className="
        bg-white 
        w-full 
        max-w-md 
        rounded-2xl 
        shadow-2xl 
        max-h-[85vh] 
        overflow-y-auto
        p-4
      ">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-black">Filters</h3>

              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-500 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* FILTER LIST */}
            <div className="space-y-3">

              {filters.map((f, index) => (
                <div key={`filter-${f.field}-${index}`} className="flex flex-col gap-2">

                  {/* FIELD */}
                  <select
                    className="px-2 py-1.5 border rounded-lg text-sm"
                    value={f.field}
                    onChange={(e) => {
                      const updated = [...filters];
                      updated[index].field = e.target.value;
                      updated[index].value = "";
                      setFilters(updated);
                    }}
                  >
                    <option value="entryDate">Date</option>
                    {current.fields.map(field => (
                      <option key={field.name} value={field.name}>
                        {field.label}
                      </option>
                    ))}
                  </select>


                  {/* VALUE */}
                  {(() => {
                    const fieldConfig = current.fields.find(field => field.name === f.field);

                    // 📅 DATE RANGE
                    if (f.field.toLowerCase().includes("date")) {
                      return (
                        <div className="flex gap-2">
                          <input
                            type="date"
                            className="px-2 py-1.5 border rounded-lg text-sm w-full text-black"
                            value={f.from ? f.from.split("/").reverse().join("-") : ""}
                            onChange={(e) => {
                              const updated = [...filters];
                              updated[index].from = e.target.value
                                ? e.target.value.split("-").reverse().join("/")
                                : "";
                              setFilters(updated);
                            }}
                          />
                          <input
                            type="date"
                            className="px-2 py-1.5 border rounded-lg text-sm w-full text-black"
                            value={f.to ? f.to.split("/").reverse().join("-") : ""}
                            onChange={(e) => {
                              const updated = [...filters];
                              updated[index].to = e.target.value
                                ? e.target.value.split("-").reverse().join("/")
                                : "";
                              setFilters(updated);
                            }}
                          />
                        </div>
                      );
                    }

                    // 🔢 NUMBER
                    if (fieldConfig?.type === "number") {
                      return (
                        <input
                          type="number"
                          className="px-2 py-1.5 border rounded-lg text-sm text-black"
                          value={f.value}
                          onChange={(e) => {
                            const updated = [...filters];
                            updated[index].value = e.target.value;
                            setFilters(updated);
                          }}
                        />
                      );
                    }

                    // 📋 SELECT
                    if (fieldConfig?.type === "select") {
                      return (
                        <select
                          className="px-2 py-1.5 border rounded-lg text-sm"
                          value={f.value}
                          onChange={(e) => {
                            const updated = [...filters];
                            updated[index].value = e.target.value;
                            setFilters(updated);
                          }}
                        >
                          <option value="">Select...</option>
                          {fieldConfig.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      );
                    }

                    // ✏️ DEFAULT
                    return (
                      <input
                        type="text"
                        className="px-2 py-1.5 border rounded-lg text-sm"
                        value={f.value}
                        onChange={(e) => {
                          const updated = [...filters];
                          updated[index].value = e.target.value;
                          setFilters(updated);
                        }}
                      />
                    );
                  })()}

                  {/* REMOVE */}
                  <button
                    onClick={() => {
                      const updated = filters.filter((_, i) => i !== index);
                      setFilters([{ field: "entryDate", value: "", from: "", to: "" }]);
                    }}
                    className="text-red-600 text-xs font-bold self-end"
                  >
                    Remove
                  </button>

                </div>
              ))}

            </div>

            {/* ACTIONS */}
            <div className="flex justify-between mt-6 gap-2">

              <button
                onClick={() => setFilters([...filters, { field: "entryDate", value: "", from: "", to: "" }])}
                className="flex-1 bg-[#D1867D]/10 text-[#16223F] py-2 rounded-lg font-bold text-sm hover:bg-[#D1867D]/20"
              >
                + Add Filter
              </button>

              <button
                onClick={clearAllFilters}
                className="flex-1 bg-red-100 text-red-600 py-2 rounded-lg font-bold text-sm"
              >
                Clear
              </button>

            </div>

            {/* APPLY BUTTON */}
            <button
              onClick={() => setShowFilters(false)}
              className="mt-4 w-full bg-[#16223F] hover:bg-[#16223F]/90 text-white py-2 rounded-lg font-bold"
            >
              Apply Filters
            </button>

          </div>

        </div>
      )}

      {/* Data Table or Overview */}
      {activeTab === 'overview' ? (
        <FarmOverview farmCode={farmCode} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-left min-w-full md:min-w-[600px]">
            <thead className="bg-[#16223F]/5 text-[#16223F] uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="p-4 border-b">Date</th>
                {current.fields.map(f => <th key={f.name} className="p-4 border-b">{f.label}</th>)}
                <th className="p-4 border-b w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="animate-pulse border-b border-gray-100">
                      <td className="p-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                      <td className="p-4"><div className="h-4 bg-slate-200 rounded w-full max-w-[120px]"></div></td>
                    </tr>
                  ))}
                </>
              ) : paginatedLogs.length > 0 ? (
                paginatedLogs.map(log => (
                  <tr
                    key={log._id || log.id || log.entryDate}
                    className="hover:bg-[#D1867D]/5 cursor-pointer group transition-colors"
                    onClick={() => setSelectedEntry(log)}
                  >
                    <td className="p-4 text-sm text-black font-sans">{log.entryDate}</td>
                    {current.fields.map(f => (
                      <td key={f.name} className="p-4 font-semibold text-black">{log[f.name]}</td>
                    ))}
                    <td className="p-4 text-gray-400 group-hover:text-[#D1867D] text-xl font-bold text-center transition-colors">⋮</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={current.fields.length + 2} className="p-12 text-center text-black text-sm font-medium opacity-50">
                    No records found for {current.name}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}


      {/* Pagination Controls */}
      {activeTab !== 'overview' && (
        <div className="flex justify-between items-center mt-4">

          <p className="text-sm text-black opacity-60">
            Showing {totalItems === 0 ? 0 : startIndex + 1}–
            {Math.min(endIndex, totalItems)} of {totalItems} records
          </p>

          <div className="flex gap-2">

            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-1 border rounded-lg bg-white hover:bg-gray-100 transition"
            >
              Prev
            </button>

            <span className="px-3 py-1 font-semibold text-sm">
              Page {currentPage}
            </span>

            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={endIndex >= totalItems}
              className="px-4 py-1 border rounded-lg bg-white hover:bg-gray-100 transition"
            >
              Next
            </button>

          </div>
        </div>
      )}


      {/* Popover Action Menu (MODAL) */}
      {selectedEntry && !showForm && !viewMode && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-[320px] transform transition-all scale-100">
            <h3 className="font-bold text-lg mb-4 text-center text-black">Manage Record</h3>
            <div className="space-y-2">
              <button
                onClick={() => setViewMode(true)}
                className="w-full flex items-center justify-center gap-2 bg-gray-500 text-white py-3 rounded-xl font-semibold hover:bg-gray-600 transition-all"
              >
                👁️ View Details
              </button>
              {activeTab !== 'feeding' && (
                <button
                  onClick={() => { setIsEditing(true); setShowForm(true); }}
                  className="w-full flex items-center justify-center gap-2 bg-[#D1867D] text-white py-3 rounded-xl font-semibold hover:bg-[#D1867D]/90 shadow-lg shadow-[#D1867D]/10 transition-all"
                >
                  ✏️ Edit Entry
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-xl font-semibold hover:bg-red-100 transition-all"
                >
                  🗑️ Delete Entry
                </button>
              )}
              <button onClick={() => setSelectedEntry(null)} className="w-full text-black opacity-50 py-2 hover:opacity-100 transition-colors">Close Menu</button>
            </div>
          </div>
        </div>
      )}
      {selectedEntry && viewMode && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">

          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto relative">

            {/* CLOSE CROSS ICON */}
            <button
              onClick={() => setViewMode(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors text-xl font-bold p-1 focus:outline-none"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold mb-4 text-center text-black">
              {current.name} Details
            </h3>

            <div className="mt-4 border-t pt-4 space-y-3 text-sm text-black">

              {/* DATE */}
              <div className="flex justify-between border-b pb-2">
                <span className="font-semibold text-gray-500">Date</span>
                <span className="text-right">{selectedEntry.entryDate}</span>
              </div>

              {/* FIELDS */}
              {current.fields.map(field => (
                <div key={field.name} className="flex justify-between border-b pb-2">
                  <span className="font-semibold text-gray-500">
                    {field.label}
                  </span>
                  <span className="text-right font-medium">
                    {selectedEntry[field.name] || "-"}
                  </span>
                </div>
              ))}

            </div>

            <button
              onClick={() => setViewMode(false)}
              className="mt-6 w-full bg-gray-300 py-2 rounded-lg font-semibold"
            >
              Close
            </button>

          </div>
        </div>
      )}
      {showForm && (
        <LogForm
          title={isEditing ? `Update ${current.name}` : `New ${current.name}`}
          fields={current.fields}
          initialData={isEditing ? selectedEntry : {}}
          onSubmit={handleSave}
          onClose={closeAllModals}
        />
      )}
      {/* MOBILE FLOATING ADD BUTTON */}
      {/* MOBILE FLOATING ADD BUTTON */}
      {!showForm &&
        !selectedEntry &&
        !viewMode &&
        !showFilters &&
        !showTabDropdown &&
        activeTab !== 'overview' && (
          <div
            className={`
      md:hidden
      fixed bottom-20 right-6
      z-[100]
      transition-all duration-300
      ${showFAB
                ? 'translate-y-0 opacity-100'
                : 'translate-y-24 opacity-0 pointer-events-none'}
    `}
          >

            <button
              onClick={() => {
                setIsEditing(false);
                setShowForm(true);
              }}
              className="
        w-14 h-14
        bg-[#D1867D] text-white
        rounded-full
        shadow-[0_10px_25px_rgba(209,134,125,0.4)]
        flex items-center justify-center
        text-3xl font-bold
        hover:bg-[#D1867D]/95 hover:-translate-y-1
        active:scale-95
        transition-all duration-200
      "
            >
              +
            </button>

          </div>
        )}
    </div>
  );
};

export default FarmTKP;