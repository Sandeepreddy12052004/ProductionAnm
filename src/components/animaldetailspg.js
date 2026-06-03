import React, { useState, useEffect } from 'react';
import { useRouter } from "next/router";
import LogForm from './LogForm';
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";
import SkeletonLoader from './SkeletonLoader';

const parseDateString = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  const valStr = String(dateVal).trim();
  if (valStr.includes("/")) {
    const parts = valStr.split("/");
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
  if (!d) return "-";
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const AnimalDetailspg = ({ moduleConfig }) => {

const router = useRouter();

const [showForm, setShowForm] = useState(false);
const [logs, setLogs] = useState([]);
const [pendingPurchases, setPendingPurchases] = useState([]);
const [pendingCalves, setPendingCalves] = useState([]);
const [selectedEntry, setSelectedEntry] = useState(null);
const [viewMode, setViewMode] = useState(false);
const [isEditing, setIsEditing] = useState(false);
const [isLoading, setIsLoading] = useState(false);

const [filters, setFilters] = useState([
  { field: "entryDate", value: "" }
]);
const [showFilters, setShowFilters] = useState(false);
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 10;

// MODULE ROUTING (PILL TABS)
const modules = [
  { id: 'livestock', name: 'Live Stock', icon: '🐄', path: '/animals' }
];

const [dynamicShedOptions, setDynamicShedOptions] = useState(null);
const [farmsList, setFarmsList] = useState([]);

useEffect(() => {
  let isMounted = true;
  api.farms.getAll().then(res => {
    if (isMounted && Array.isArray(res)) {
      setFarmsList(res);
    }
  }).catch(console.error);
  return () => { isMounted = false; };
}, []);

useEffect(() => {
  const hasShedField = (moduleConfig?.fields || []).some(f => ['shed', 'oldShed', 'newShed', 'shedId'].includes(f.name));
  if (hasShedField) {
    api.sheds.getAll().then(sheds => {
      setDynamicShedOptions(sheds.map(s => s.name));
    }).catch(console.error);
  }
}, [moduleConfig?.id]);

const current = moduleConfig || { id: 'unknown', name: 'Unknown', fields: [] };
const currentFields = current.fields.map(f => {
  if (['shed', 'oldShed', 'newShed', 'shedId'].includes(f.name) && dynamicShedOptions) {
    return { ...f, options: dynamicShedOptions.length > 0 ? dynamicShedOptions : ['-'] };
  }
  return f;
});

const storageKey = `global_${current.id}_logs`;

const fetchLogs = async () => {
  setIsLoading(true);
  try {
    let data = [];
    if (current.id === 'livestock') {
      data = await api.cattle.getAll();
    } else if (current.id === 'crossing') {
      data = await api.crossing.getAll();
    } else if (current.id === 'shed') {
      data = await api.shed.getAll();
    } else if (current.id === 'purchase') {
      data = await api.purchase.getAll();
    } else if (current.id === 'sale') {
      data = await api.sale.getAll();
    } else if (current.id === 'health') {
      data = await api.health.treatments.getAll();
    } else if (current.id === 'vaccine') {
      data = await api.health.vaccinations.getAll();
    } else {
      const savedData = localStorage.getItem(storageKey);
      data = savedData ? JSON.parse(savedData) : [];
    }

    // Unwrap various response shapes defensively:
    // 1. Plain array (normal API success)
    // 2. { data: [...] } envelope
    // 3. { firewallBlocked: true, data: [] } — silently blocked
    let rawList;
    if (Array.isArray(data)) {
      rawList = data;
    } else if (data && Array.isArray(data.data)) {
      rawList = data.data;
    } else {
      rawList = [];
    }

    const normalizedData = rawList.map(log => {
      const dateValue = log.createdAt || log.entryDate || log.date || log.shiftingDate || log.purchaseDate || log.crossingDate;
      const formattedDate = dateValue ? formatDateToDDMMYYYY(dateValue) : "";
      return {
        ...log,
        purchaseFrom: log.purchaseFrom || log.sellerName || '',
        purchasePrice: log.purchasePrice || log.price || 0,
        sellerName: log.sellerName || log.purchaseFrom || '',
        price: log.price || log.purchasePrice || 0,
        tag: log.tag || log.tag_id || log.tagId || '',
        tagId: log.tagId || log.tag_id || log.tag || '',
        entryDate: formattedDate || log.entryDate || '-'
      };
    });

    // ── Enrich health/vaccine records with animalType + shed from livestock ──
    // Existing records may not have animalType/shedId stored — look them up
    // by tagId against the livestock registry so columns always show data.
    if (current.id === 'health' || current.id === 'vaccine') {
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
      } catch (_) {}

      // Cache miss — fetch from API
      if (Object.keys(livestockMap).length === 0) {
        try {
          const lsData = await api.cattle.getAll();
          const lsList = Array.isArray(lsData) ? lsData : (lsData?.data ?? []);
          lsList.forEach(a => {
            const key = String(a.tag_id || a.tag || '').trim().toUpperCase();
            if (key) livestockMap[key] = a;
          });
        } catch (_) {}
      }

      const enriched = normalizedData.map(log => {
        const tagKey = String(log.tagId || log.tag_id || log.tag || '').trim().toUpperCase();
        const animal = tagKey ? livestockMap[tagKey] : null;
        return {
          ...log,
          animalType: log.animalType || log.animalId || (animal ? (animal.animalType || animal.cattleType || '') : ''),
          shedId:     log.shedId || log.shed || (animal ? (animal.shed || animal.shedId || '') : ''),
        };
      });
      setLogs(enriched);
      setPendingPurchases([]);
      setPendingCalves([]);
      return;
    }

    if (current.id === 'livestock') {
      // isPendingDetails can be true (boolean), "true" (string), or missing/false
      const isPending = (log) => log.isPendingDetails === true || String(log.isPendingDetails) === 'true';
      const pending = normalizedData.filter(isPending);
      const active  = normalizedData.filter(log => !isPending(log));
      
      const calves = pending.filter(log => log.onboardingType === 'CALVING' || (log.dameId && String(log.dameId).trim() !== ''));
      const purchases = pending.filter(log => !calves.includes(log));
      
      setPendingPurchases(purchases);
      setPendingCalves(calves);
      setLogs(active);
    } else {
      setLogs(normalizedData);
      setPendingPurchases([]);
      setPendingCalves([]);
    }
  } catch (e) {
    console.error(`Error loading logs for ${current.id}:`, e);
    setLogs([]);
  } finally {
    setIsLoading(false);
  }
};


useEffect(() => {
  if (!moduleConfig) return;
  fetchLogs();
  setFilters([{ field: "entryDate", value: "" }]);
  setCurrentPage(1);
}, [moduleConfig, current.id]);

useEffect(() => {
  const modalOpen =
    showForm ||
    selectedEntry ||
    viewMode ||
    showFilters;

  const footer = document.getElementById("main-footer");

  if (footer) {
    footer.style.display = modalOpen ? "none" : "block";
  }

  return () => {
    if (footer) {
      footer.style.display = "block";
    }
  };
}, [showForm, selectedEntry, viewMode, showFilters]);


if (!moduleConfig) {
  return (
    <div className="p-20 text-center bg-white min-h-screen">
      <h1 className="text-2xl font-bold text-red-600">Configuration Error</h1>
      <p className="text-gray-500">The moduleConfig prop is missing in the page file.</p>
    </div>
  );
}

 
  const filteredLogs = logs.filter(log => {
  return filters.every(f => {

    // 📅 DATE RANGE FILTER
    if (f.field.toLowerCase().includes("date") || f.field.toLowerCase() === "dob") {
      if (!f.from && !f.to) return true;

      const logDate = log[f.field] || (f.field === 'entryDate' ? log.date : null);
      if (!logDate) return false;

      const current = parseDateString(logDate);
      if (!current || isNaN(current.getTime())) return false;
      current.setHours(0, 0, 0, 0);

      if (f.from) {
        const fromDate = parseDateString(f.from);
        if (fromDate) {
          fromDate.setHours(0, 0, 0, 0);
          if (current < fromDate) return false;
        }
      }

      if (f.to) {
        const toDate = parseDateString(f.to);
        if (toDate) {
          toDate.setHours(0, 0, 0, 0);
          if (current > toDate) return false;
        }
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
const activeFilterCount = filters.filter(
  f => (f.value && f.value.trim() !== "") || f.from || f.to
).length;


  const saveToStorage = (updatedLogs) => {
    setLogs(updatedLogs);
    localStorage.setItem(`global_${current.id}_logs`, JSON.stringify(updatedLogs));
  };


  const calculateAge = (dob) => {
  if (!dob) return "";

  const birth = parseDateString(dob);
  if (!birth || isNaN(birth.getTime())) return "";
  const today = new Date();
  if (birth > today) {
      return "Invalid Date";
  
    }

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  // Adjust days
  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }

  // Adjust months
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  let ageText = `${years} Y`;

  if (months > 0) ageText += ` ${months} M`;
  if (days > 0) ageText += ` ${days} D`;

  return ageText;
};


// Legacy syncToLivestock removed to prevent unnecessary localStorage operations


const handleSave = async (data) => {
  setIsLoading(true);
  try {
    if (['livestock', 'crossing', 'shed', 'purchase', 'sale', 'health', 'vaccine'].includes(current.id)) {
      const entryId = selectedEntry?.id || selectedEntry?._id;
      if (isEditing) {
        if (current.id === 'livestock') {
          const payload = { ...data, tagId: data.tag || data.tagId };
          if (selectedEntry?.isPendingDetails) {
            payload.isPendingDetails = false;
          }
          await api.cattle.update(entryId, payload);
          swalSuccess("Success", "Cattle details updated successfully!");
        } else if (current.id === 'crossing') {
          await api.crossing.update(entryId, data);
          swalSuccess("Success", "Crossing log updated successfully!");
          if (data.calfTag && String(data.calfTag).trim() !== '' && (!selectedEntry?.calfTag || selectedEntry.calfTag !== data.calfTag)) {
            setTimeout(async () => {
              const go = await swalConfirm(
                "🍼 Complete Calf Profile?",
                `A pending record for newborn Calf Tag [${data.calfTag}] has been added to Live Stock. Would you like to complete its profile now?`
              );
              if (go) {
                router.push('/animals');
              }
            }, 1000);
          }
        } else if (current.id === 'shed') {
          await api.shed.update(entryId, data);
          swalSuccess("Success", "Shed log updated successfully!");
        } else if (current.id === 'purchase') {
          await api.purchase.update(entryId, data);
          swalSuccess("Success", "Purchase log updated successfully!");
        } else if (current.id === 'sale') {
          await api.sale.update(entryId, data);
          swalSuccess("Success", "Sale log updated successfully!");
        } else if (current.id === 'health') {
          await api.health.treatments.update(entryId, data);
          swalSuccess("Success", "Treatment log updated successfully!");
        } else if (current.id === 'vaccine') {
          const payload = { ...data };
          if (!payload.date) {
            payload.date = selectedEntry?.date || new Date().toISOString();
          }
          await api.health.vaccinations.update(entryId, payload);
          swalSuccess("Success", "Vaccination log updated successfully!");
        }
      } else {
        if (current.id === 'livestock') {
          // Prevent MongoDB duplicate key error on farmId_1_code_1 by ensuring uniqueness
          // Ensure required backend fields always have valid values
          const resolvedShed = data.shed && data.shed !== '' && data.shed !== '-' ? data.shed : (data.shedId || '-');
          const resolvedType = data.cattleType || data.animalType || 'COW';
          const payload = { 
            ...data,
            tagId: data.tag || data.tagId,
            code: data.code || `CTL-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            farmId: data.farmId || (moduleConfig.farmCode) || (router.query.code) || null,
            shed: resolvedShed,
            shedId: resolvedShed,
            cattleType: resolvedType,
            animalType: resolvedType,
          };
          await api.cattle.create(payload);
          swalSuccess("Success", "Cattle registered successfully!");
        } else if (current.id === 'crossing') {
          await api.crossing.create(data);
          swalSuccess("Success", "Crossing log created successfully!");
          if (data.calfTag && String(data.calfTag).trim() !== '') {
            setTimeout(async () => {
              const go = await swalConfirm(
                "🍼 Complete Calf Profile?",
                `A pending record for newborn Calf Tag [${data.calfTag}] has been added to Live Stock. Would you like to complete its profile now?`
              );
              if (go) {
                router.push('/animals');
              }
            }, 1000);
          }
        } else if (current.id === 'shed') {
          await api.shed.create(data);
          swalSuccess("Success", "Shed log created successfully!");
        } else if (current.id === 'purchase') {
          await api.purchase.create(data);
          swalSuccess("Success", "Purchase log created successfully!");
          const cleanTag = String(data.tag || '').trim().toUpperCase();
          setTimeout(async () => {
            const go = await swalConfirm(
              "🛍️ Complete Purchase Profile?",
              `A pending record for Tag [${cleanTag}] has been added to Live Stock. Would you like to complete its profile now?`
            );
            if (go) {
              router.push('/animals');
            }
          }, 1000);
        } else if (current.id === 'sale') {
          await api.sale.create(data);
          swalSuccess("Success", "Sale log created successfully!");
        } else if (current.id === 'health') {
          await api.health.treatments.create(data);
          swalSuccess("Success", "Treatment log created successfully!");
        } else if (current.id === 'vaccine') {
          const payload = { ...data };
          if (!payload.date) {
            payload.date = new Date().toISOString();
          }
          await api.health.vaccinations.create(payload);
          swalSuccess("Success", "Vaccination log created successfully!");
        }
      }
      try {
        sessionStorage.removeItem('__livestock_tag_cache__');
      } catch (err) {
        console.error("Non-blocking cache bust error:", err);
      }
      await fetchLogs();
    } else {
      // Local Storage Fallback for auxiliary logs
      if (isEditing) {
        const updated = logs.map(log => {
          if (log.id === selectedEntry.id) {
            return { ...log, ...data };
          }
          return log;
        });
        saveToStorage(updated);
        swalSuccess("Success", "Record updated successfully!");
      } else {
        const now = new Date();
        const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        const newLogs = [{
          ...data,
          id: new Date().getTime(),
          entryDate: formattedDate
        }, ...logs];
        saveToStorage(newLogs);
        swalSuccess("Success", "Record created successfully!");
      }
    }
    closeAllModals();
  } catch (error) {
    console.error("Save error:", error);
    swalError("Backend Error", (typeof error === 'string' ? error : error.message) || "Failed to save data. Please check backend schema.");
  } finally {
    setIsLoading(false);
  }
};






  /* ---------- EXPORT EXCEL ---------- */
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(current.name);

    worksheet.columns = [
      { header: "Date", key: "entryDate", width: 15 },
      ...currentFields.map(field => ({
        header: field.label,
        key: field.name,
        width: 20
      }))
    ];

    filteredLogs.forEach(log => {
      worksheet.addRow({
        entryDate: log.entryDate,
        ...currentFields.reduce((acc, field) => {
          acc[field.name] = log[field.name];
          return acc;
        }, {})
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
    a.download = `AnimalDetails_${current.name}.xlsx`;
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

    const columns = ["Date", ...currentFields.map(f => f.label)];
    const rows = filteredLogs.map(log => [
      log.entryDate,
      ...currentFields.map(f => log[f.name])
    ]);

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
      doc.text(`Animal Details - ${current.name}`, 75, 26);

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

      doc.save(`AnimalDetails_${current.name}.pdf`);
    };

    img.onerror = () => {
      // Fallback if logo fails to load (draw text at original position)
      doc.setFontSize(16);
      doc.setTextColor(22, 34, 63);
      doc.setFont("helvetica", "bold");
      doc.text(`Animal Details - ${current.name}`, 20, 25);

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

      doc.save(`AnimalDetails_${current.name}.pdf`);
    };
  };

  const handleDelete = async () => {
    const confirmed = await swalConfirm("Delete Record?", "Permanent delete this record?");
    if (confirmed) {
      setIsLoading(true);
      try {
        const entryId = selectedEntry.id || selectedEntry._id;
        if (['livestock', 'crossing', 'shed', 'purchase', 'sale', 'health', 'vaccine'].includes(current.id)) {
          if (current.id === 'livestock') {
            await api.cattle.delete(entryId);
            swalSuccess("Deleted", "Cattle deleted successfully!");
          } else if (current.id === 'crossing') {
            await api.crossing.delete(entryId);
            swalSuccess("Deleted", "Crossing log deleted successfully!");
          } else if (current.id === 'shed') {
            await api.shed.delete(entryId);
            swalSuccess("Deleted", "Shed log deleted successfully!");
          } else if (current.id === 'purchase') {
            await api.purchase.delete(entryId);
            swalSuccess("Deleted", "Purchase log deleted successfully!");
          } else if (current.id === 'sale') {
            await api.sale.delete(entryId);
            swalSuccess("Deleted", "Sale log deleted successfully!");
          } else if (current.id === 'health') {
            await api.health.treatments.delete(entryId);
            swalSuccess("Deleted", "Treatment log deleted successfully!");
          } else if (current.id === 'vaccine') {
            await api.health.vaccinations.delete(entryId);
            swalSuccess("Deleted", "Vaccination log deleted successfully!");
          }
          try {
            sessionStorage.removeItem('__livestock_tag_cache__');
          } catch (err) {
            console.error("Non-blocking cache bust error:", err);
          }
          await fetchLogs();
        } else {
          const filtered = logs.filter(log => log.id !== selectedEntry.id);
          saveToStorage(filtered);
          swalSuccess("Deleted", "Record deleted successfully!");
        }
        closeAllModals();
      } catch (error) {
        console.error("Delete error:", error);
        swalError("Error", "Failed to delete record.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const clearAllFilters = () => {
  setFilters([{ field: "entryDate", value: "" }]);
  setCurrentPage(1); // reset pagination too
};

  const closeAllModals = () => {
    setShowForm(false);
    setSelectedEntry(null);
    setIsEditing(false);
  };




const getLiveAge = (dob, storedAge, endDate, type) => {
  if (!dob) return storedAge || "-";

  const birth = parseDateString(dob);
  if (!birth || isNaN(birth.getTime())) return storedAge || "-";
  const today = endDate ? parseDateString(endDate) : new Date();

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const age = `${years} Y ${months} M ${days} D`;

  //  OPTIONAL (better UX)
  if (endDate) {
    if (type === "sold") return `${age} (Sold)`;
    if (type === "dead") return `${age} (Dead)`;
    if (type === "calved") return `${age} (Calved)`;
  }

  return age;
};





const getShedFromLivestock = (tagValue) => {
  try {
    const cached = sessionStorage.getItem('__livestock_tag_cache__');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.list)) {
        const cleanTag = String(tagValue).trim().toUpperCase();
        const found = parsed.list.find(item => {
          const itemTag = String(item.tag_id || item.tag || '').trim().toUpperCase();
          return itemTag === cleanTag;
        });
        if (found) {
          return found.shed || found.shedId || "";
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
  return "";
};


  return (
    <div className="w-full h-full flex flex-col text-black bg-white px-0 md:px-0">
      <div className="flex-none">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 md:mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#16223F] opacity-80">Animal Details</h1>
            <p className="text-black opacity-60 italic">Module: {current.name}</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {/* EXCEL BUTTON */}
            <button 
              onClick={exportExcel} 
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2 text-sm"
            >
              📊 Excel
            </button>

            {/* PDF BUTTON */}
            <button 
              onClick={exportPDF} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold shadow-md hover:bg-red-700 transition-all flex items-center gap-2 text-sm"
            >
              📄 PDF
            </button>

            
            <button
    onClick={() => setShowFilters(!showFilters)}
    className={`relative px-4 py-2 rounded-lg font-bold border transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-md 
      ${showFilters 
        ? 'bg-[#D1867D]/10 border-[#D1867D]/20 text-[#16223F] hover:bg-[#D1867D]/20' 
        : 'bg-white border-gray-300 hover:bg-gray-50'}
    `}
  >
    {showFilters ? '✕ Hide Filter' : '🔍 Filters '}

    {/*  FILTER COUNT BADGE */}
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
              className="hidden md:block bg-[#16223F] text-white px-5 py-2 rounded-lg font-bold shadow-lg hover:bg-[#16223F]/90 transition-all text-sm"
            >
              + Add Entry
            </button>
          </div>
        </header>


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
          <div key={index} className="flex flex-col gap-2">

            {/* FIELD */}
            <select
              className="px-2 py-1.5 border rounded-lg text-sm"
              value={f.field}
              onChange={(e) => {
                const updated = [...filters];
                updated[index].field = e.target.value;
                updated[index].value = "";
                updated[index].from = "";
                updated[index].to = "";
                setFilters(updated);
              }}
            >
              <option value="entryDate">Date</option>
              {currentFields.map(field => (
                <option key={field.name} value={field.name}>
                  {field.label}
                </option>
              ))}
            </select>

            {/* VALUE */}
            {(() => {
              const fieldConfig = currentFields.find(field => field.name === f.field);

              // 📅 DATE RANGE FIELD
              if (f.field.toLowerCase().includes("date")) {
                return (
                  <div className="flex gap-2">

                    {/* FROM */}
                    <input
                      type="date"
                      className="px-2 py-1.5 border rounded-lg text-sm w-full"
                      value={
                        f.from
                          ? f.from.split("/").reverse().join("-")
                          : ""
                      }
                      onChange={(e) => {
                        const date = e.target.value;

                        const formatted = date
                          ? `${date.split("-")[2]}/${date.split("-")[1]}/${date.split("-")[0]}`
                          : "";

                        const updated = [...filters];
                        updated[index].from = formatted;
                        setFilters(updated);
                      }}
                    />

                    {/* TO */}
                    <input
                      type="date"
                      className="px-2 py-1.5 border rounded-lg text-sm w-full"
                      value={
                        f.to
                          ? f.to.split("/").reverse().join("-")
                          : ""
                      }
                      onChange={(e) => {
                        const date = e.target.value;

                        const formatted = date
                          ? `${date.split("-")[2]}/${date.split("-")[1]}/${date.split("-")[0]}`
                          : "";

                        const updated = [...filters];
                        updated[index].to = formatted;
                        setFilters(updated);
                      }}
                    />

                  </div>
                );
              }

              // 🔢 NUMBER FIELD
              if (fieldConfig?.type === "number") {
                return (
                  <input
                    type="number"
                    placeholder="Enter number..."
                    className="px-2 py-1.5 border rounded-lg text-sm"
                    value={f.value}
                    onChange={(e) => {
                      const updated = [...filters];
                      updated[index].value = e.target.value;
                      setFilters(updated);
                    }}
                  />
                );
              }

              // 📋 SELECT FIELD
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

              // ✏️ DEFAULT TEXT
              return (
                <input
                  type="text"
                  placeholder="Enter value..."
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
                setFilters(updated.length ? updated : [{ field: "entryDate", value: "", from: "", to: "" }]);
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
      </div>

      {/* Newly Purchased Animals Action Deck */}
      {current.id === 'livestock' && pendingPurchases && pendingPurchases.length > 0 && (
        <div className="mb-6 p-5 bg-gradient-to-br from-[#16223F]/5 via-white to-[#D1867D]/5 border border-dashed border-[#D1867D]/40 rounded-2xl shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📥</span>
              <h2 className="text-lg font-bold text-[#16223F]">Newly Purchased Animals ({pendingPurchases.length})</h2>
              <span className="bg-[#D1867D] text-white text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full animate-pulse">
                Pending Profile Completion
              </span>
            </div>
          </div>
          <p className="text-xs text-black opacity-60 mb-4 leading-relaxed">
            These animals have been recently recorded under **Purchase Logs** and have entered the farm. Click **Complete Profile** on any card below to input their breed, age, gender, and parenting details to officially register them into the active herd registry.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingPurchases.map(animal => (
              <div 
                key={animal._id || animal.id} 
                className="bg-white border border-gray-100 hover:border-[#D1867D]/30 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-mono text-xs font-black text-[#16223F] bg-gray-100 px-2 py-1 rounded-md">
                      TAG ID: {animal.tag || animal.tag_id}
                    </span>
                    <span className="text-[10px] font-semibold text-black opacity-40">
                      {animal.purchaseDate ? formatDateToDDMMYYYY(animal.purchaseDate) : '-'}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-black opacity-70 mb-4">
                    <div className="flex justify-between">
                      <span className="opacity-60">Farm Assigned:</span>
                      <span className="font-bold text-[#16223F]">
                        {(() => {
                          if (!animal.farmId) return '-';
                          const fm = farmsList.find(f => f._id === animal.farmId || f.id === animal.farmId || f.code === animal.farmId);
                          return fm ? (fm.name || fm.code) : animal.farmId;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Seller:</span>
                      <span className="font-semibold text-gray-800 truncate max-w-[120px]">{animal.purchaseFrom || '-'}</span>
                    </div>
                    {animal.purchasePrice > 0 && (
                      <div className="flex justify-between">
                        <span className="opacity-60">Price:</span>
                        <span className="font-bold text-emerald-600">₹{Number(animal.purchasePrice).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedEntry(animal);
                    setIsEditing(true);
                    setShowForm(true);
                  }}
                  className="w-full bg-[#16223F] hover:bg-[#D1867D] text-white font-bold text-xs py-2 rounded-lg transition-all duration-200 ease-in-out shadow-sm hover:shadow"
                >
                  Complete Profile
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Newly Born Calves Action Deck */}
      {current.id === 'livestock' && pendingCalves && pendingCalves.length > 0 && (
        <div className="mb-6 p-5 bg-gradient-to-br from-[#16223F]/5 via-white to-[#D1867D]/5 border border-dashed border-emerald-500/40 rounded-2xl shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🍼</span>
              <h2 className="text-lg font-bold text-[#16223F]">Newly Born Calves ({pendingCalves.length})</h2>
              <span className="bg-emerald-600 text-white text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full animate-pulse">
                Pending Birth Registry
              </span>
            </div>
          </div>
          <p className="text-xs text-black opacity-60 mb-4 leading-relaxed">
            These calves have been recently recorded via **Crossing Log Calving Events**. Click **Register Calf** on any card below to input their gender, breed, current shed assignment, and officially register them into the active herd.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingCalves.map(animal => (
              <div 
                key={animal._id || animal.id} 
                className="bg-white border border-gray-100 hover:border-emerald-500/30 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-mono text-xs font-black text-[#16223F] bg-gray-100 px-2 py-1 rounded-md">
                      TAG ID: {animal.tag || animal.tag_id}
                    </span>
                    <span className="text-[10px] font-semibold text-black opacity-40">
                      {animal.dateOfBirth ? formatDateToDDMMYYYY(animal.dateOfBirth) : '-'}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-black opacity-70 mb-4">
                    <div className="flex justify-between">
                      <span className="opacity-60">Farm Assigned:</span>
                      <span className="font-bold text-[#16223F]">
                        {(() => {
                          if (!animal.farmId) return '-';
                          const fm = farmsList.find(f => f._id === animal.farmId || f.id === animal.farmId || f.code === animal.farmId);
                          return fm ? (fm.name || fm.code) : animal.farmId;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Dame ID (Mother):</span>
                      <span className="font-semibold text-gray-800 truncate max-w-[120px]">{animal.dameId || '-'}</span>
                    </div>
                    {animal.sireId && (
                      <div className="flex justify-between">
                        <span className="opacity-60">Sire ID (Father):</span>
                        <span className="font-semibold text-gray-800 truncate max-w-[120px]">{animal.sireId}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedEntry(animal);
                    setIsEditing(true);
                    setShowForm(true);
                  }}
                  className="w-full bg-[#16223F] hover:bg-emerald-600 text-white font-bold text-xs py-2 rounded-lg transition-all duration-200 ease-in-out shadow-sm hover:shadow"
                >
                  Register Calf
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="flex-1 overflow-auto bg-white border border-gray-200 rounded-xl shadow-sm relative">
        <table className="w-full text-left min-w-[600px] relative">
          <thead className="sticky top-0 z-10 bg-gray-50 text-[#16223F] uppercase text-[10px] font-black tracking-widest shadow-sm">
            <tr>
              <th className="p-4 border-b">Date</th>
              {currentFields.map(f => <th key={f.name} className="p-4 border-b">{f.label}</th>)}
              <th className="p-4 border-b w-10 text-center"></th>
            </tr>
          </thead>
         <tbody className="divide-y divide-gray-100">
  {isLoading ? (
    <SkeletonLoader type="table" columns={currentFields.length + 2} />
  ) : paginatedLogs.length > 0 ? (
    paginatedLogs.map(log => (
      <tr 
        key={log.id}
        className={`
          cursor-pointer group transition-colors
          hover:bg-[#D1867D]/5
          ${["DEAD", "DECEASED"].includes(String(log.status).toUpperCase()) ? "bg-red-50" : ""}
          ${String(log.status).toUpperCase() === "SOLD" ? "bg-[#FFC145]/5" : ""}
        `}
        onClick={() => setSelectedEntry(log)}
      >

        {/* DATE */}
        <td className="p-4 text-sm text-black font-sans whitespace-nowrap">
          {log.entryDate}
        </td>

        {currentFields.map(f => {

          // AGE
          if (f.name === "age") {
            const isInactive = ["SOLD", "DECEASED", "DEAD"].includes(String(log.status).toUpperCase());
            return (
              <td key={f.name} className="p-4 font-semibold text-black whitespace-nowrap">
                {getLiveAge(
                  log.dob,
                  log.age,
                  isInactive ? log.soldDate || log.deadDate || log.updatedAt : null,
                  String(log.status).toUpperCase() === "SOLD"
                    ? "sold"
                    : ["DEAD", "DECEASED"].includes(String(log.status).toUpperCase())
                    ? "dead"
                    : null
                )}
              </td>
            );
          }

          // PREGNANT AGE
          if (f.name === "Pregnant age" || f.name === "pregnantAge") {
            const isPreg = (log.pregnancyStatus || log["pregnancy status"]) === "Positive";
            if (!isPreg) {
              return (
                <td key={f.name} className="p-4 font-semibold text-black whitespace-nowrap">
                  -
                </td>
              );
            }

            return (
              <td key={f.name} className="p-4 font-semibold text-black whitespace-nowrap">
                {getLiveAge(
                  log.crossingDate || log["crossingDate"],
                  log.pregnantAge || log["Pregnant age"],
                  log.actualCalvingDate || log["actual calving date"],
                  "calved"
                )}
              </td>
            );
          }

          // STATUS
          if (f.name === "status") {
            const isSold = String(log.status).toUpperCase() === "SOLD";
            const isDead = ["DEAD", "DECEASED"].includes(String(log.status).toUpperCase());
            return (
              <td key={f.name} className="p-4 font-semibold whitespace-nowrap">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold
                    ${
                      isSold
                        ? "bg-[#FFC145]/10 text-[#16223F] border border-[#FFC145]/20"
                        : isDead
                        ? "bg-red-50 text-red-700 border border-red-100/50"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-100/50"
                    }
                  `}
                >
                  {log.status}
                </span>
              </td>
            );
          }

          // DEFAULT
          if (f.name === "farmId") {
            const rawFarmId = log.farmId;
            let displayVal = "Unknown";
            if (rawFarmId) {
              if (typeof rawFarmId === 'object') {
                displayVal = rawFarmId.name || rawFarmId.code || "Unknown";
              } else {
                const foundFarm = farmsList.find(farm => (farm._id || farm.id) === rawFarmId || farm.code === rawFarmId);
                displayVal = foundFarm ? foundFarm.name : rawFarmId;
              }
            }
            return (
              <td key={f.name} className="p-4 font-semibold text-[#16223F] whitespace-nowrap">
                {displayVal}
              </td>
            );
          }

          if (f.type === "date" || f.name.toLowerCase().includes("date") || f.name === "dob" || f.name === "dateOfBirth") {
            const rawDate = log[f.name];
            const dateDisplay = rawDate ? formatDateToDDMMYYYY(rawDate) : "-";
            return (
              <td key={f.name} className="p-4 font-semibold text-black whitespace-nowrap">
                {dateDisplay}
              </td>
            );
          }

          return (
            <td key={f.name} className="p-4 font-semibold text-black whitespace-nowrap">
              {log[f.name]}
            </td>
          );
        })}

        <td className="p-4 text-gray-400 group-hover:text-[#D1867D] text-xl font-bold text-center transition-colors whitespace-nowrap">
          ⋮
        </td>

      </tr>
    ))
  ) : (
    <tr>
      <td
        colSpan={currentFields.length + 2}
        className="p-12 text-center text-black text-sm font-medium opacity-50"
      >
        No records found for {current.name}.
      </td>
    </tr>
  )}
</tbody>
        </table>
      </div>



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


      {/* Action Popover */}
      {selectedEntry && !showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-[320px] transform transition-all">
            <h3 className="font-bold text-lg mb-4 text-center text-black">Manage Record</h3>
            <div className="space-y-2">

  {/* ✅ NEW VIEW BUTTON */}
  <button 
    onClick={() => {
      setViewMode(true);
    }}
    className="w-full flex items-center justify-center gap-2 bg-gray-400 text-white py-3 rounded-xl font-semibold hover:bg-gray-500 transition-all"
  >
    👁️ View Details
  </button>

  <button 
    onClick={() => { setIsEditing(true); setShowForm(true); }} 
    className="w-full flex items-center justify-center gap-2 bg-[#D1867D] text-white py-3 rounded-xl font-semibold hover:bg-[#D1867D]/90 shadow-lg shadow-[#D1867D]/10 transition-all"
  >
    ✏️ Edit Entry
  </button>

  <button 
    onClick={handleDelete} 
    className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-xl font-semibold hover:bg-red-100 transition-all"
  >
    🗑️ Delete Entry
  </button>

  <button 
    onClick={() => setSelectedEntry(null)} 
    className="w-full text-black opacity-50 py-2 hover:opacity-100 transition-colors"
  >
    Close Menu
  </button>

</div>
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
        Animal Details
      </h3>

      {/* DATA DISPLAY */}
     
      <div className="mt-4 border-t pt-4 space-y-3 text-sm text-black">

  {/* DATE */}
  <div className="flex justify-between border-b pb-2">
    <span className="font-semibold text-gray-500">Date</span>
    <span className="text-right">{selectedEntry.entryDate}</span>
  </div>

  {/* FIELDS */}
  {currentFields.map(field => {
    let displayVal = selectedEntry[field.name] || "-";
    if (field.name === "farmId") {
      const rawFarmId = selectedEntry.farmId;
      if (rawFarmId) {
        if (typeof rawFarmId === 'object') {
          displayVal = rawFarmId.name || rawFarmId.code || "Unknown";
        } else {
          const foundFarm = farmsList.find(farm => (farm._id || farm.id) === rawFarmId || farm.code === rawFarmId);
          displayVal = foundFarm ? foundFarm.name : rawFarmId;
        }
      }
    } else if (field.name === "age") {
      const isInactive = ["SOLD", "DECEASED", "DEAD"].includes(String(selectedEntry.status).toUpperCase());
      displayVal = getLiveAge(
        selectedEntry.dob || selectedEntry.dateOfBirth,
        selectedEntry.age,
        isInactive ? selectedEntry.soldDate || selectedEntry.deadDate || selectedEntry.updatedAt : null,
        String(selectedEntry.status).toUpperCase() === "SOLD"
          ? "sold"
          : ["DEAD", "DECEASED"].includes(String(selectedEntry.status).toUpperCase())
          ? "dead"
          : null
      );
    } else if (field.type === "date" || field.name.toLowerCase().includes("date") || field.name === "dob" || field.name === "dateOfBirth") {
      const rawDate = selectedEntry[field.name];
      displayVal = rawDate ? formatDateToDDMMYYYY(rawDate) : "-";
    }
    return (
      <div key={field.name} className="flex justify-between border-b pb-2">
        <span className="font-semibold text-gray-500">
          {field.label}
        </span>
        <span className="text-right font-medium text-[#16223F]">
          {displayVal}
        </span>
      </div>
    );
  })}

</div>

      {/* CLOSE BUTTON */}
      <button
        onClick={() => setViewMode(false)}
        className="mt-6 w-full bg-gray-300 py-2 rounded-lg font-semibold"
      >
        Close
      </button>

    </div>
  </div>
)}
          </div>
        </div>
      )}

      
      {showForm && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-200 p-4">

    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      
      <LogForm 
        title={
          selectedEntry?.isPendingDetails
            ? selectedEntry.onboardingType === 'CALVING'
              ? "🍼 Register Newborn Calf Profile"
              : "📥 Complete Purchased Animal Profile"
            : isEditing
            ? `Update ${current.name}`
            : `New ${current.name}`
        } 
        fields={currentFields} 
        initialData={(() => {
          if (!isEditing || !selectedEntry) return {};
          let base = { ...selectedEntry };
          if (base.isPendingDetails && base.onboardingType === 'CALVING') {
            base.farmBorn = base.farmBorn || 'Yes';
            if (!base.cattleType || base.cattleType === 'PENDING') {
              base.cattleType = String(base.animalType).toUpperCase().includes('BUFFALO') ? 'Buffalo Calf' : 'Cow Calf';
            }
          }
          return base;
        })()} 
        existingRecords={logs}
        onSubmit={handleSave} 
        onClose={closeAllModals} 
      />

    </div>

  </div>
)}
{/* MOBILE FLOATING ADD BUTTON */}
{/* MOBILE FLOATING ADD BUTTON */}
{!showForm &&
 !selectedEntry &&
 !viewMode &&
 !showFilters && (
  <div className="md:hidden fixed bottom-20 right-6 z-[100]">

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

export default AnimalDetailspg;