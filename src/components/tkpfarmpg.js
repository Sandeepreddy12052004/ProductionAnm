import React, { useState, useEffect } from 'react';
import LogForm from './LogForm';
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const FarmTKP = () => {
  const [activeTab, setActiveTab] = useState('feeding');
  const [showForm, setShowForm] = useState(false);
  const [logs, setLogs] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [showTabDropdown, setShowTabDropdown] = useState(false);
  const [showFAB, setShowFAB] = useState(true);

 const [filters, setFilters] = useState([
  { field: "entryDate", value: "", from: "", to: "" }
]);

const clearAllFilters = () => {
  setFilters([{ field: "entryDate", value: "", from: "", to: "" }]);
};
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const modules = [
    { id: 'health', name: 'Health Log', icon: '🩺', fields: [{name:'tag', label:'Animal ID'}, {name:'diag', label:'Diagnosis'}] },
    { id: 'feeding', name: 'Daily Feeding', icon: '🌾', fields: [{name:'shed', label:'Shed Number', type: 'select', options: ['1', '2', '3', '4']},{name:'Line', label:'Feeding Line', type: 'select', options: ['1', '2', '3', '4','5']},{name:'cattle', label:'Cattle', type: 'select', options: ['Buffalo', 'B.Calf', 'Cow', 'C.Calf']},{name:'type', label:'Feed time', type: 'select', options: ['Morning', 'Evening']}, {name:'Green Grass', label:'Green Grass', type: 'number'},{name:'Dry', label:'Dry', type: 'number'},{name:'C.Cake', label:'C.Cake', type: 'number'}, {name:'Chunni', label:'Chunni', type: 'number'},{name:'Maize', label:'Maize', type: 'number'},{name:'Wheat Bran', label:'Wheat Bran', type: 'number'},{name:'Mineral mixture', label:'Mineral mixture', type: 'number'}] },
    { id: 'grass', name: 'Grass Collection', icon: '🌿', fields: [{name:'area', label:'Source'}, {name:'wt', label:'Weight'}] },
    { id: 'med_inv', name: 'Medicine Inventory', icon: '💊', fields: [{name:'med', label:'Medicine Name'}, {name:'stock', label:'Units'}] },
    { id: 'feed_inv', name: 'Feed Inventory', icon: '📦', fields: [{name:'item', label:'Feed Item'}, {name:'bags', label:'Bags'}] },
    { id: 'milk_prod', name: 'Milk Production', icon: '🥛', fields: [{name:'shed', label:'Shed No.', type: 'select', options: ['1', '2', '3']},{ name: 'line', label: 'Line', type: 'select', options: ['L1', 'L2', 'L3', 'L4','L5']},{name:'tag', label:'Tag ID'}, {name:'liters', label:'Liters'}] },
    { id: 'vaccine', name: 'Vaccination Log', icon: '💉', fields: [{name:'tag', label:'Animal ID'}, {name:'vax', label:'Vaccine Name'}] },
    { id: 'components', name: 'Milk Components', icon: '🔬', fields: [{name:'fat', label:'Fat %'}, {name:'snf', label:'SNF %'}] },
    { id: 'pashudhan', name: 'Bharat Pashudhan', icon: '🇮🇳', fields: [{name:'uid', label:'Pashu ID'}, {name:'status', label:'Portal Status'}] },
  ];

  const current = modules.find(m => m.id === activeTab);

  useEffect(() => {
    const savedData = localStorage.getItem(`tkp_${activeTab}_logs`);
    setLogs(savedData ? JSON.parse(savedData) : []);
    setFilters([{ field: "entryDate", value: "", from: "", to: "" }]);
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


  const saveToStorage = (updatedLogs) => {
    setLogs(updatedLogs);
    localStorage.setItem(`tkp_${activeTab}_logs`, JSON.stringify(updatedLogs));
  };



  const handleSave = (data) => {
    if (isEditing) {
      const updated = logs.map(log => log.id === selectedEntry.id ? { ...log, ...data } : log);
      saveToStorage(updated);
    } else {
      const now = new Date();
      const formattedDate = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
      // CHANGED: Use 'entryDate' to match your UI filter and table column
      // eslint-disable-next-line react-hooks/purity
      const newLogs = [{ ...data, id: Date.now(), entryDate: formattedDate }, ...logs];
      saveToStorage(newLogs);
      // syncToLivestock(data);
    }
    closeAllModals();
  };

  const handleDelete = () => {
    if (window.confirm("Permanent delete this record?")) {
      const filtered = logs.filter(log => log.id !== selectedEntry.id);
      saveToStorage(filtered);
      closeAllModals();
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
      doc.text(`TKP Farm - ${current.name}`, 75, 26);

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
      doc.text(`TKP Farm - ${current.name}`, 20, 25);

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
    <div className="p-0 md:p-0 w-full text-black bg-white min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#16223F] font-sans">TKP Farm</h1>
          <p className="text-black opacity-60 italic">Module: {current.name}</p>
        </div>
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
      </header>

      {/* PILL TABS */}
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
    <span>{current.icon} {current.name}</span>

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
    {modules.map(m => (
      <button
        key={m.id}
        onClick={() => {
          setActiveTab(m.id);
          setShowTabDropdown(false);
        }}
        className={`
          w-full text-left px-4 py-2 text-sm
          hover:bg-gray-100 transition
          ${activeTab === m.id ? 'bg-[#D1867D]/10 text-[#16223F] font-bold' : ''}
        `}
      >
        {m.icon} {m.name}
      </button>
    ))}
  </div>

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
setFilters([{ field: "entryDate", value: "", from: "", to: "" }]);                }}
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
            onClick={() => setFilters([...filters, { field: "entryDate", value: "" , from: "", to: "" }])}
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

      {/* Data Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-full md:min-w-[600px]">
          <thead className="bg-gray-50 text-black uppercase text-[10px] font-black tracking-widest">
            <tr>
              <th className="p-4 border-b">Date</th>
              {current.fields.map(f => <th key={f.name} className="p-4 border-b">{f.label}</th>)}
              <th className="p-4 border-b w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedLogs.length > 0 ? (
              paginatedLogs.map(log => (
                <tr 
                  key={log.id} 
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
              <button onClick={() => setSelectedEntry(null)} className="w-full text-black opacity-50 py-2 hover:opacity-100 transition-colors">Close Menu</button>
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
 !showTabDropdown && (
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