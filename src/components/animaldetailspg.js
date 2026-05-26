import React, { useState, useEffect } from 'react';
import { useRouter } from "next/router";
import LogForm from './LogForm';
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { api } from '@/utils/api';
import { swalSuccess, swalError, swalConfirm } from '@/utils/swal';



const AnimalDetailspg = ({ moduleConfig }) => {

const router = useRouter();

const [showForm, setShowForm] = useState(false);
const [logs, setLogs] = useState([]);
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
  { id: 'livestock', name: 'Live Stock', icon: '🐄', path: '/animals' },
  { id: 'crossing', name: 'Crossing Log', icon: '🧬', path: '/crossing' },
  { id: 'shed', name: 'Shed Log', icon: '🏠', path: '/shed' },
  { id: 'purchase', name: 'Purchase Log', icon: '📥', path: '/purchase' },
  { id: 'sale', name: 'Sale Log', icon: '📤', path: '/sale' }
];

const [dynamicShedOptions, setDynamicShedOptions] = useState(null);

useEffect(() => {
  const hasShedField = (moduleConfig?.fields || []).some(f => ['shed', 'oldShed', 'newShed'].includes(f.name));
  if (hasShedField) {
    api.sheds.getAll().then(sheds => {
      setDynamicShedOptions(sheds.map(s => s.name));
    }).catch(console.error);
  }
}, [moduleConfig?.id]);

const current = moduleConfig || { id: 'unknown', name: 'Unknown', fields: [] };
const currentFields = current.fields.map(f => {
  if (['shed', 'oldShed', 'newShed'].includes(f.name) && dynamicShedOptions) {
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
    } else {
      const savedData = localStorage.getItem(storageKey);
      data = savedData ? JSON.parse(savedData) : [];
    }
    setLogs(Array.isArray(data) ? data : []);
  } catch (e) {
    console.error(`Error loading logs for ${current.id}:`, e);
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

  const birth = new Date(dob);
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


const syncToLivestock = (data) => {
  const tagValue = data.tag || data.tagNo;
  if (!tagValue) return;

  const livestockKey = "global_livestock_logs";
  const existing = JSON.parse(localStorage.getItem(livestockKey)) || [];

  const alreadyExists = existing.some(item => item.tag === tagValue);

  if (!alreadyExists) {
    const newEntry = {
      id: new Date().getTime(),
      tag: tagValue,
      shed: data.newShed ,
      breed: data.breed || "-",
      entryDate: new Date().toLocaleDateString("en-GB")
    };

    const updated = [newEntry, ...existing];
    localStorage.setItem(livestockKey, JSON.stringify(updated));
  }
};


const handleSave = async (data) => {
  setIsLoading(true);
  try {
    if (current.id === 'livestock' || current.id === 'crossing') {
      if (isEditing) {
        if (current.id === 'livestock') {
          const payload = { ...data, tagId: data.tag || data.tagId };
          await api.cattle.update(selectedEntry.id || selectedEntry._id, payload);
          swalSuccess("Success", "Cattle details updated successfully!");
        } else if (current.id === 'crossing') {
          await api.crossing.update(selectedEntry.id || selectedEntry._id, data);
          swalSuccess("Success", "Crossing log updated successfully!");
        }
      } else {
        if (current.id === 'livestock') {
          // Prevent MongoDB duplicate key error on farmId_1_code_1 by ensuring uniqueness
          const payload = { 
            ...data,
            tagId: data.tag || data.tagId,
            code: data.code || `CTL-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            farmId: data.farmId || (moduleConfig.farmCode) || (router.query.code) || 'UNKNOWN_FARM'
          };
          await api.cattle.create(payload);
          swalSuccess("Success", "Cattle registered successfully!");
        } else if (current.id === 'crossing') {
          await api.crossing.create(data);
          swalSuccess("Success", "Crossing log created successfully!");
        }
      }
      await fetchLogs();
    } else {
      // Local Storage Fallback for auxiliary logs (shed, purchase, sale)
      if (current.id === "shed") {
        const tagValue = data.tag;
        const livestockKey = "global_livestock_logs";
        const livestock = JSON.parse(localStorage.getItem(livestockKey)) || [];
        const existingAnimal = livestock.find(item => item.tag === tagValue);
        if (existingAnimal) {
          data.oldShed = existingAnimal.shed || data.oldShed;
          existingAnimal.shed = data.newShed;
          localStorage.setItem(livestockKey, JSON.stringify(livestock));
        }
      }

      if (current.id === "purchase") {
        const livestockKey = "global_livestock_logs";
        const livestock = JSON.parse(localStorage.getItem(livestockKey)) || [];
        const alreadyExists = livestock.some(item => item.tag === data.tag);
        if (alreadyExists) {
          swalError("Error", `Tag "${data.tag}" already exists in Livestock`);
          return;
        }
        const newAnimal = {
          id: new Date().getTime(),
          tag: data.tag,
          breed: data.breed || "-",
          gender: data.gender || "-",
          shed: data.shed || "-",
          dob: data.dob || "",
          status: "Active",
          entryDate: new Date().toLocaleDateString("en-GB")
        };
        localStorage.setItem(livestockKey, JSON.stringify([newAnimal, ...livestock]));

        if (data.shed) {
          const shedKey = "global_shed_logs";
          const existingShedLogs = JSON.parse(localStorage.getItem(shedKey)) || [];
          const newShedEntry = {
            id: new Date().getTime(),
            tag: data.tag,
            shiftingDate: new Date().toISOString().split('T')[0],
            oldShed: "-",
            newShed: data.shed,
            reason: "Purchase Entry",
            entryDate: new Date().toLocaleDateString("en-GB")
          };
          localStorage.setItem(shedKey, JSON.stringify([newShedEntry, ...existingShedLogs]));
        }
      }

      if (current.id === "sale") {
        const livestock = JSON.parse(localStorage.getItem("global_livestock_logs")) || [];
        const exists = livestock.find(item => item.tag === data.tag);
        if (!exists) {
          swalError("Error", `Tag "${data.tag}" not found in Livestock`);
          return;
        }
        const alreadySold = logs.some(
          log => log.tag === data.tag && (!isEditing || log.id !== selectedEntry?.id)
        );
        if (alreadySold) {
          swalError("Error", `Tag "${data.tag}" is already sold`);
          return;
        }
      }

      if (isEditing) {
        const updated = logs.map(log => {
          if (log.id === selectedEntry.id) {
            const updatedData = { ...log, ...data };
            if (updatedData.status === "Dead" && !updatedData.deadDate) {
              updatedData.deadDate = new Date().toISOString();
            }
            if (updatedData.status === "Dead") {
              const livestockKey = "global_livestock_logs";
              const livestock = JSON.parse(localStorage.getItem(livestockKey)) || [];
              const updatedLivestock = livestock.map(item => {
                if (item.tag === updatedData.tag) {
                  return { ...item, status: "Dead", deadDate: updatedData.deadDate };
                }
                return item;
              });
              localStorage.setItem(livestockKey, JSON.stringify(updatedLivestock));
            }
            return { ...updatedData, age: calculateAge(updatedData.dob) };
          }
          return log;
        });
        saveToStorage(updated);
      } else {
        const now = new Date();
        const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        const newLogs = [{
          ...data,
          age: calculateAge(data.dob),
          id: new Date().getTime(),
          entryDate: formattedDate
        }, ...logs];
        saveToStorage(newLogs);
        syncToLivestock(data);

        if (current.id === "livestock" && data.status === "Dead") {
          const livestockKey = "global_livestock_logs";
          const livestock = JSON.parse(localStorage.getItem(livestockKey)) || [];
          const updated = livestock.map(item => {
            if (item.tag === data.tag) {
              return { ...item, status: "Dead", deadDate: new Date().toISOString() };
            }
            return item;
          });
          localStorage.setItem(livestockKey, JSON.stringify(updated));
        }

        if (current.id === "sale") {
          const livestockKey = "global_livestock_logs";
          const livestock = JSON.parse(localStorage.getItem(livestockKey)) || [];
          const updated = livestock.map(item => {
            if (item.tag === data.tag) {
              return { ...item, status: "Sold", soldDate: new Date().toISOString() };
            }
            return item;
          });
          localStorage.setItem(livestockKey, JSON.stringify(updated));
        }

        if (current.id === "livestock" && data.shed) {
          const shedKey = "global_shed_logs";
          const existingShedLogs = JSON.parse(localStorage.getItem(shedKey)) || [];
          const newShedEntry = {
            id: new Date().getTime(),
            tag: data.tag,
            shiftingDate: new Date().toISOString().split('T')[0],
            oldShed: "-",
            newShed: data.shed,
            reason: "New animal Entry",
            entryDate: new Date().toLocaleDateString("en-GB")
          };
          localStorage.setItem(shedKey, JSON.stringify([newShedEntry, ...existingShedLogs]));
        }
      }
    }
    closeAllModals();
  } catch (error) {
    console.error("Save error:", error.message || error);
    swalError("Backend Error", error.message || "Failed to save data. Please check backend schema.");
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
        if (current.id === 'livestock') {
          await api.cattle.delete(entryId);
          swalSuccess("Deleted", "Cattle deleted successfully!");
          await fetchLogs();
        } else if (current.id === 'crossing') {
          await api.crossing.delete(entryId);
          swalSuccess("Deleted", "Crossing log deleted successfully!");
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

  const birth = new Date(dob);
  const today = endDate ? new Date(endDate) : new Date();

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
  const livestock = JSON.parse(localStorage.getItem("global_livestock_logs")) || [];
  const found = livestock.find(item => item.tag === tagValue);
  return found ? found.shed : "";
};


  return (
    // <div className="p-0 md:p-0 w-full text-black bg-white min-h-screen">
    <div className="w-full text-black bg-white min-h-screen px-0 md:px-0">
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

        {/* PILL TABS */}
        <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
          {modules.map(m => (
            <button
              key={m.id}
              onClick={() => router.push(m.path)}
              className={`px-5 py-2 rounded-full text-xs font-bold border transition-all ${
                current.id === m.id 
                  ? 'bg-[#16223F] text-white border-[#16223F] shadow-md' 
                  : 'bg-white text-black border-gray-300 hover:bg-gray-100 hover:shadow-sm'
              }`}
            >
              {m.icon} {m.name}
            </button>
          ))}
        </div>

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

      {/* Table Section */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-[#16223F]/5 text-[#16223F] uppercase text-[10px] font-black tracking-widest">
            <tr>
              <th className="p-4 border-b">Date</th>
              {currentFields.map(f => <th key={f.name} className="p-4 border-b">{f.label}</th>)}
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
        key={log.id}
        className={`
          cursor-pointer group transition-colors
          hover:bg-[#D1867D]/5
          ${log.status === "Dead" ? "bg-red-50" : ""}
          ${log.status === "Sold" ? "bg-[#FFC145]/5" : ""}
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
            return (
              <td key={f.name} className="p-4 font-semibold text-black whitespace-nowrap">
                {getLiveAge(
                  log.dob,
                  log.age,
                  log.soldDate || log.deadDate,
                  log.status === "Sold"
                    ? "sold"
                    : log.status === "Dead"
                    ? "dead"
                    : null
                )}
              </td>
            );
          }

          // PREGNANT AGE
          if (f.name === "Pregnant age") {
            if (log["pregnancy status"] !== "Positive") {
              return (
                <td key={f.name} className="p-4 font-semibold text-black whitespace-nowrap">
                  -
                </td>
              );
            }

            return (
              <td key={f.name} className="p-4 font-semibold text-black whitespace-nowrap">
                {getLiveAge(
                  log["crossingDate"],
                  log["Pregnant age"],
                  log["actual calving date"],
                  "calved"
                )}
              </td>
            );
          }

          // STATUS
          if (f.name === "status") {
            return (
              <td key={f.name} className="p-4 font-semibold whitespace-nowrap">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold
                    ${
                      log.status === "Sold"
                        ? "bg-[#FFC145]/10 text-[#16223F] border border-[#FFC145]/20"
                        : log.status === "Dead"
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
    
    <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
      
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
  {currentFields.map(field => (
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
        title={isEditing ? `Update ${current.name}` : `New ${current.name}`} 
        fields={currentFields} 
        initialData={isEditing ? selectedEntry : {}} 
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