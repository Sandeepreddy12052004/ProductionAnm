import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import LogForm from './LogForm';
import ExcelJS from "exceljs"; 
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";
import SkeletonLoader from './SkeletonLoader';

const FarmTDR = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('feeding');
  const [showForm, setShowForm] = useState(false);
  const [logs, setLogs] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showFAB, setShowFAB] = useState(true);
  const [hideFABNearBottom, setHideFABNearBottom] = useState(false);
  const [showTabDropdown, setShowTabDropdown] = useState(false);
  const [filters, setFilters] = useState([
    { field: "date", value: "", from: "", to: "" }
  ]);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const modules = [
    {
      id: 'health',
      name: 'Health Log',
      icon: '🩺',
      fields: [
        { name: 'tagId', label: 'Tag ID' },
        { name: 'animalId', label: 'Animal ID' },
        { name: 'shedId', label: 'Shed', type: 'select', options: ['5', '6'] },
        { name: 'symptoms', label: 'Symptoms' },
        { name: 'diagnosis', label: 'Diagnosis/Issue' },
        { name: 'treatment', label: 'Action Taken' },
        { name: 'healthStatus', label: 'Health Status', type: 'select', options: ['Completed', 'Pending', 'Critical'] }
      ]
    },
    {
      id: 'feeding',
      name: 'Daily Feeding',
      icon: '🌾',
      fields: [
        { name: 'shedId', label: 'Shed Number', type: 'select', options: ['5', '6'] },
        { name: 'animalId', label: 'Cattle', type: 'select', options: ['Buffalo', 'B.Calf', 'Cow', 'C.Calf'] },
        { name: 'greenGrass', label: 'Green Grass (KG)', type: 'number' },
        { name: 'dryGrass', label: 'Dry Grass (KG)', type: 'number' },
        { name: 'cottonCake', label: 'C.Cake (KG)', type: 'number' },
        { name: 'chunni', label: 'Chunni (KG)', type: 'number' },
        { name: 'maize', label: 'Maize (KG)', type: 'number' },
        { name: 'wheatBran', label: 'Wheat Bran (KG)', type: 'number' },
        { name: 'salt', label: 'Salt (G)', type: 'number' },
        { name: 'oralCalcium', label: 'Oral Calcium (ML)', type: 'number' },
        { name: 'mineralMixture', label: 'Mineral mixture (G)', type: 'number' }
      ]
    },
    {
      id: 'medicine',
      name: 'Medicine Inventory',
      icon: '💊',
      fields: [
        { name: 'medicineName', label: 'Medicine Name' },
        { name: 'type', label: 'Type', type: 'select', options: ['Injection', 'Tablet', 'Liquid', 'Powder'] },
        { name: 'oldStock', label: 'Old Stock', type: 'number' },
        { name: 'bought', label: 'Bought', type: 'number' },
        { name: 'used', label: 'Used', type: 'number' },
        { name: 'presentStock', label: 'Stock Count', type: 'number' },
        { name: 'purchaseDate', label: 'Purchase Date', type: 'date' },
        { name: 'expiryDate', label: 'Expiry Date', type: 'date' }
      ]
    }
  ];

  const current = modules.find(m => m.id === activeTab);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let data = [];
      if (activeTab === 'health') {
        data = await api.health.treatments.getAll();
      } else if (activeTab === 'feeding') {
        data = await api.operations.dailyFeeding.getAll();
      } else if (activeTab === 'medicine') {
        data = await api.inventory.medicines.getAll();
      } else {
        const savedData = localStorage.getItem(`tdr_${activeTab}_logs`);
        data = savedData ? JSON.parse(savedData) : [];
      }
      if (Array.isArray(data)) {
        const filtered = data.filter(log => {
          const sId = log.shedId || log.shed;
          if (sId) return ['5', '6'].includes(sId.toString());
          
          const fId = log.farmId?.code || log.farmId?.name || log.farmId || log.farm;
          if (fId) return typeof fId === 'string' && fId.toUpperCase().includes('TDR');
          
          return false; // Safely hide unassociated data
        });
        setLogs(filtered);
      } else {
        setLogs([]);
      }
    } catch (e) {
      console.error(`Error loading logs for ${activeTab}:`, e);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (router.query.tab) {
      let tab = router.query.tab;
      if (tab === 'med_inv') {
        tab = 'medicine';
      }
      if (modules.some(m => m.id === tab)) {
        setActiveTab(tab);
      }
    }
  }, [router.query.tab]);

  useEffect(() => {
    fetchLogs();
    setCurrentPage(1);
  }, [activeTab]);
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
  const handleScroll = () => {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const fullHeight = document.body.scrollHeight;

    // distance from bottom
    const distanceFromBottom = fullHeight - (scrollY + windowHeight);

    // hide when near bottom (adjust threshold)
    if (distanceFromBottom < 120) {
      setHideFABNearBottom(true);
    } else {
      setHideFABNearBottom(false);
    }
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


  const filteredLogs = logs.filter(log => {
  return filters.every(f => {

    // 📅 DATE RANGE
    if (f.field.toLowerCase().includes("date")) {
      if (!f.from && !f.to) return true;

      const logDate = log[f.field];
      if (!logDate) return false;

      const [d, m, y] = logDate.split("/");
      const current = new Date(`${y}-${m}-${d}`);

      if (f.from) {
        const [fd, fm, fy] = f.from.split("/");
        const fromDate = new Date(`${fy}-${fm}-${fd}`);
        if (current < fromDate) return false;
      }

      if (f.to) {
        const [td, tm, ty] = f.to.split("/");
        const toDate = new Date(`${ty}-${tm}-${td}`);
        if (current > toDate) return false;
      }

      return true;
    }

    // NORMAL FILTER
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
    localStorage.setItem(`tdr_${activeTab}_logs`, JSON.stringify(updatedLogs));
  };

  const handleSave = async (data) => {
    setIsLoading(true);
    try {
      const payload = { ...data, farm: 'TDR' };
      const entryId = selectedEntry?.id || selectedEntry?._id;
      
      if (isEditing) {
        if (activeTab === 'health') await api.health.treatments.update(entryId, payload);
        else if (activeTab === 'feeding') await api.operations.dailyFeeding.update(entryId, payload);
        else if (activeTab === 'medicine') await api.inventory.medicines.update(entryId, payload);
        else {
          const updated = logs.map(log => log.id === selectedEntry.id ? { ...log, ...data } : log);
          saveToStorage(updated);
        }
        swalSuccess("Success", `${current.name} updated successfully!`);
      } else {
        const now = new Date();
        const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        payload.date = now.toISOString(); // Send ISO string for backend
        payload.entryDate = formattedDate; // Keep formattedDate for frontend table display if needed
        
        if (activeTab === 'health') await api.health.treatments.create(payload);
        else if (activeTab === 'feeding') await api.operations.dailyFeeding.create(payload);
        else if (activeTab === 'medicine') await api.inventory.medicines.create(payload);
        else {
          const newLogs = [{ ...data, id: Date.now(), date: formattedDate }, ...logs];
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

  /* ---------- EXPORT EXCEL ---------- */
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(current.name);

    worksheet.columns = [
      { header: "Date", key: "date", width: 15 },
      ...current.fields.map(field => ({
        header: field.label,
        key: field.name,
        width: 20
      }))
    ];

    filteredLogs.forEach(log => {
      worksheet.addRow({
        date: log.date,
        ...current.fields.reduce((acc, field) => {
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
    a.download = `TDR_${current.name}_Logs.xlsx`;
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
    const rows = filteredLogs.map(log => [
      log.date,
      ...current.fields.map(f => log[f.name])
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
      doc.text(`TDR Farm - ${current.name}`, 75, 26);

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

      doc.save(`TDR_${current.name}_Logs.pdf`);
    };

    img.onerror = () => {
      // Fallback if logo fails to load (draw text at original position)
      doc.setFontSize(16);
      doc.setTextColor(22, 34, 63);
      doc.setFont("helvetica", "bold");
      doc.text(`TDR Farm - ${current.name}`, 20, 25);

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

      doc.save(`TDR_${current.name}_Logs.pdf`);
    };
  };

  const handleDelete = async (id) => {
    const confirmed = await swalConfirm("Delete Record?", "Permanent delete this record?");
    if (confirmed) {
      setIsLoading(true);
      try {
        const entryId = selectedEntry.id || selectedEntry._id;
        if (activeTab === 'health') await api.health.treatments.delete(entryId);
        else if (activeTab === 'feeding') await api.operations.dailyFeeding.delete(entryId);
        else if (activeTab === 'medicine') await api.inventory.medicines.delete(entryId);
        else {
          const filtered = logs.filter(log => log.id !== selectedEntry.id);
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

  const activeFilterCount = filters.filter(
  f => (f.value && f.value.trim() !== "") || f.from || f.to
).length;

  return (
    <div className="w-full h-full flex flex-col text-black bg-white px-0 md:px-0">
      <div className="flex-none">

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#16223F] opacity-80">TDR Farm</h1>
          <p className="text-gray-500 italic">Module: {current.name}</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          
          
          <button 
            onClick={exportExcel} 
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2"
          >
            📊 Excel
          </button>

          
          <button 
            onClick={exportPDF} 
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold shadow-md hover:bg-red-700 transition-all flex items-center gap-2"
          >
            📄 PDF
          </button>

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

          <button onClick={() => { setIsEditing(false); setShowForm(true); }} className="hidden md:block bg-[#16223F] text-white px-5 py-2 rounded-lg font-bold hover:bg-[#16223F]/90 shadow-md transition-all">
            + Add {current.name}
          </button>
        </div>
      </header>

      {/* Tabs and rest of your UI remains exactly the same... */}
      {/* <div className="flex flex-wrap gap-3 mb-8"> */}
      <div className="relative flex items-center gap-2 mb-6 w-full md:w-auto">

  {/* DROPDOWN BUTTON */}
  <button
    onClick={() => setShowTabDropdown(!showTabDropdown)}
    className="flex-1 flex items-center justify-between px-3 py-2 rounded-full border bg-white text-sm font-semibold shadow-sm"
  >
    <span className="truncate">
      {current.icon} {current.name}
    </span>

    <span className={`ml-2 transition-transform ${showTabDropdown ? "rotate-180" : ""}`}>
      ▼
    </span>
  </button>

  {/* MOBILE ADD BUTTON ONLY */}
  <button
    onClick={() => { setIsEditing(false); setShowForm(true); }}
    className="md:hidden shrink-0 px-4 py-2 bg-[#16223F] text-white rounded-full font-bold shadow-md hover:bg-[#16223F]/90"
  >
    + Add
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
      absolute left-0 top-full mt-2 
      w-full md:w-[280px]
      bg-white border rounded-xl shadow-lg z-50
      transition-all duration-300
      ${showTabDropdown 
        ? "opacity-100 translate-y-0" 
        : "opacity-0 -translate-y-4 pointer-events-none"}
    `}
  >
    {modules.map(m => (
      <button
        key={m.id}
        onClick={() => {
          setActiveTab(m.id);
          setShowTabDropdown(false);
          const urlTab = m.id === 'medicine' ? 'med_inv' : m.id;
          router.push({ query: { ...router.query, tab: urlTab } }, undefined, { shallow: true });
        }}
        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
          activeTab === m.id ? "bg-[#D1867D]/10 text-[#16223F] font-bold" : ""
        }`}
      >
        {m.icon} {m.name}
      </button>
    ))}
  </div>

</div>
  


        
      

      {showFilters && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">

    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto p-4">

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-black">Filters</h3>
        <button onClick={() => setShowFilters(false)} className="text-gray-500 text-xl font-bold">✕</button>
      </div>

      <div className="space-y-3">

        {filters.map((f, index) => (
          <div key={index} className="flex flex-col gap-2">

            {/* FIELD */}
            <select
              className="px-2 py-1.5 border rounded-lg text-sm"
              value={f.field}
              onChange={(e) => {
                const updated = [...filters];
                updated[index] = { field: e.target.value, value: "", from: "", to: "" };
                setFilters(updated);
              }}
            >
              <option value="date">Date</option>
              {current.fields.map(field => (
                <option key={field.name} value={field.name}>
                  {field.label}
                </option>
              ))}
            </select>

            {/* VALUE */}
            {f.field.includes("date") ? (
              <div className="flex gap-2">
                <input type="date" className="w-full border rounded px-2 py-1.5"
                  onChange={(e) => {
                    const updated = [...filters];
                    updated[index].from = e.target.value.split("-").reverse().join("/");
                    setFilters(updated);
                  }}
                />
                <input type="date" className="w-full border rounded px-2 py-1.5"
                  onChange={(e) => {
                    const updated = [...filters];
                    updated[index].to = e.target.value.split("-").reverse().join("/");
                    setFilters(updated);
                  }}
                />
              </div>
            ) : (
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
            )}

            <button
              onClick={() => {
                const updated = filters.filter((_, i) => i !== index);
                setFilters(updated.length ? updated : [{ field: "date", value: "", from: "", to: "" }]);
              }}
              className="text-red-600 text-xs font-bold self-end"
            >
              Remove
            </button>

          </div>
        ))}

      </div>

      <div className="flex gap-2 mt-6">
        <button
          onClick={() => setFilters([...filters, { field: "date", value: "", from: "", to: "" }])}
          className="flex-1 bg-[#D1867D]/10 text-[#16223F] py-2 rounded-lg font-bold text-sm hover:bg-[#D1867D]/20"
        >
          + Add Filter
        </button>

        <button
          onClick={() => setFilters([{ field: "date", value: "", from: "", to: "" }])}
          className="flex-1 bg-red-100 text-red-600 py-2 rounded-lg font-bold text-sm"
        >
          Clear
        </button>
      </div>

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

      {/* Table Section */}
      <div className="flex-1 overflow-auto bg-white border border-gray-200 rounded-xl shadow-sm relative">
        <table className="w-full text-left min-w-[600px] relative">
          <thead className="sticky top-0 z-10 bg-gray-50 text-[#16223F] uppercase text-[10px] font-black tracking-widest shadow-sm">
            <tr>
              <th className="p-4 border-b">Date</th>
              {current.fields.map(f => <th key={f.name} className="p-4 border-b">{f.label}</th>)}
              <th className="p-4 border-b w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <SkeletonLoader type="table" columns={columns.length + 1} />
            ) : paginatedLogs.length > 0 ? paginatedLogs.map(log => (
              <tr key={log.id} className="hover:bg-[#D1867D]/5 cursor-pointer group transition-colors" onClick={() => setSelectedEntry(log)}>
                <td className="p-4 text-sm text-gray-600 font-sans">{log.date || log.entryDate}</td>
                {current.fields.map(f => <td key={f.name} className="p-4 font-semibold text-gray-800">{log[f.name]}</td>)}
                <td className="p-4 text-gray-300 group-hover:text-[#D1867D] text-xl font-bold text-center transition-colors">⋮</td>
              </tr>
            )) : (
              <tr><td colSpan={current.fields.length + 2} className="p-12 text-center text-gray-400">No records found for {current.name}.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
    
    <div className="flex justify-between items-center mt-4">

  <p className="text-sm text-gray-600">
    Showing {totalItems === 0 ? 0 : startIndex + 1}–
    {Math.min(endIndex, totalItems)} of {totalItems} records
  </p>

  <div className="flex gap-2">

    <button
      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
      disabled={currentPage === 1}
      
      className="px-4 py-1 rounded-lg border bg-white hover:bg-gray-100 hover:shadow-sm transition"
    >
      Prev
    </button>

    <span className="px-3 py-1 font-semibold">
      Page {currentPage}
    </span>

    <button
      onClick={() => setCurrentPage(prev => prev + 1)}
      disabled={endIndex >= totalItems}
    
      className="px-4 py-1 rounded-lg border bg-white hover:bg-gray-100 hover:shadow-sm transition "
    >
      Next
    </button>

  </div>
</div>


      
      {selectedEntry && !showForm && !viewMode && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-[320px]">
            <h3 className="font-bold text-lg mb-4 text-center text-gray-800">Manage Record</h3>
            {/* <div className="space-y-2"> */}
            <div className="space-y-2">

  {/* ✅ VIEW BUTTON */}
  <button 
    onClick={() => {setViewMode(true);}}
    className="w-full flex items-center justify-center gap-2 bg-gray-500 text-white py-3 rounded-xl font-semibold hover:bg-gray-600 transition-all"
  >
    👁️ View Details
  </button>
              <button onClick={() => { setIsEditing(true); setShowForm(true); }} className="w-full flex items-center justify-center gap-2 bg-[#D1867D] text-white py-3 rounded-xl font-semibold transition-all duration-200 ease-out hover:bg-[#D1867D]/90 hover:shadow-md hover:-translate-y-[1px]">✏️ Edit Entry</button>
              <button onClick={handleDelete} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-xl font-semibold transition-all duration-200 ease-out hover:bg-red-100 hover:shadow-md hover:-translate-y-[1px]">🗑️ Delete Entry</button>
              <button onClick={() => setSelectedEntry(null)} className="w-full text-gray-400 py-2 transition-all duration-200 ease-out hover:text-gray-700 hover:bg-gray-100 rounded-lg">Close</button>
            </div>
          </div>
        </div>
        
      )}
      
      {selectedEntry && viewMode && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    
    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
      
      <h3 className="text-lg font-bold mb-4 text-center text-black">
        {current.name} Details
      </h3>

      {/* DATA DISPLAY */}
      <div className="mt-4 border-t pt-4 space-y-3 text-sm text-black">

        {/* DATE */}
        <div className="flex justify-between border-b pb-2">
          <span className="font-semibold text-gray-500">Date</span>
          <span className="text-right">{selectedEntry.date}</span>
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

      {/* CLOSE */}
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
        <LogForm title={isEditing ? `Update ${current.name}` : `New ${current.name}`} fields={current.fields} initialData={isEditing ? selectedEntry : {}} onSubmit={handleSave} onClose={closeAllModals} />
      )}
      {/* MOBILE FLOATING ADD BUTTON */}
      {!showForm && !selectedEntry && !viewMode && !showFilters && (
        <div
          className={`
            md:hidden fixed right-6 z-[100]
            transition-all duration-300
            ${!showFAB || hideFABNearBottom 
              ? "opacity-0 translate-y-10 pointer-events-none" 
              : "opacity-100 translate-y-0"}
            bottom-20
          `}
        >
          <button
            onClick={() => { setIsEditing(false); setShowForm(true); }}
            className="
              w-14 h-14 
              bg-[#D1867D] text-white 
              rounded-full 
              shadow-[0_10px_25px_rgba(209,134,125,0.4)]
              flex items-center justify-center 
              text-3xl font-bold
              hover:bg-[#D1867D]/95
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

export default FarmTDR;

