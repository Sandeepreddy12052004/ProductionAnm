import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";
import SkeletonLoader from './SkeletonLoader';

const ShedManagementPg = () => {
  const [sheds, setSheds] = useState([]);
  const [farms, setFarms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShedForOverview, setSelectedShedForOverview] = useState(null);
  const [cattleData, setCattleData] = useState([]);

  const getFarmName = (fId) => {
    if (!fId) return 'Unknown';
    if (typeof fId === 'object') return fId.name || fId.code;
    const farm = Array.isArray(farms) ? farms.find(f => (f?._id || f?.id) === fId) : null;
    return farm ? farm.name : fId;
  };

  const filteredSheds = sheds.filter((shed) => {
    const query = searchQuery.toLowerCase();
    const farmName = getFarmName(shed.farmId).toLowerCase();
    const code = String(shed.code || "").toLowerCase();
    const status = String(shed.status || "").toLowerCase();
    const remarks = String(shed.remarks || "").toLowerCase();
    const capacity = String(shed.capacity || "").toLowerCase();
    const lines = String(shed.lines || "").toLowerCase();
    
    return (
      farmName.includes(query) ||
      code.includes(query) ||
      status.includes(query) ||
      remarks.includes(query) ||
      capacity.includes(query) ||
      lines.includes(query)
    );
  });


  const [formData, setFormData] = useState({
    farmId: "",
    code: "",
    lines: 0,
    capacity: 0,
    status: "ACTIVE",
    remarks: "",
    lineManagement: "No",
    milking: "No"
  });
  const [editingId, setEditingId] = useState(null);

  const fetchShedsAndFarms = async () => {
    setIsFetching(true);
    try {
      const [shedsData, farmsData, cattleRes] = await Promise.all([
        api.sheds.getAll(),
        api.farms.getAll(),
        api.cattle.getAll().catch(() => [])
      ]);
      setSheds(shedsData || []);
      setFarms(farmsData || []);
      setCattleData(Array.isArray(cattleRes) ? cattleRes : (cattleRes?.data ?? []));
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchShedsAndFarms();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    if (!formData.farmId || !formData.code) {
      swalError("Error", "Farm and Shed No are required.");
      return;
    }

    setIsLoading(true);
    try {
      const selectedFarm = Array.isArray(farms) ? farms.find(f => (f?._id || f?.id) === formData.farmId) : null;
      const farmCode = selectedFarm ? selectedFarm.code : 'UNKNOWN';
      const name = `${farmCode} - Shed ${formData.code}`; // Auto-generate name

      const payload = {
        ...formData,
        name,
        lines: Number(formData.lines),
        capacity: Number(formData.capacity)
      };

      if (editingId) {
        await api.sheds.update(editingId, payload);
        swalSuccess("Success", "Shed updated successfully!");
      } else {
        const isDuplicate = sheds.some(s => {
          const sFarmId = String(s.farmId?._id || s.farmId?.id || s.farmId || "").trim();
          const targetFarmId = String(formData.farmId).trim();
          const sCode = String(s.code).trim().toLowerCase();
          const targetCode = String(formData.code).trim().toLowerCase();
          return sFarmId === targetFarmId && sCode === targetCode;
        });
        
        if (isDuplicate) {
          setIsLoading(false);
          swalError("Duplicate Error", `Shed No ${formData.code} already exists for this farm.`);
          return;
        }

        await api.sheds.create(payload);
        swalSuccess("Success", "Shed created successfully!");
      }
      setFormData({ farmId: "", code: "", lines: 0, capacity: 0, status: "ACTIVE", remarks: "", lineManagement: "No", milking: "No" });
      setEditingId(null);
      setShowForm(false);
      fetchShedsAndFarms();
    } catch (err) {
      console.error(err);
      const errorMsg = typeof err === 'string' ? err : (err.response?.data?.message || err.message || "Failed to save shed.");
      swalError("Error", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (shed) => {
    setFormData({
      farmId: shed.farmId?._id || shed.farmId?.id || shed.farmId || "",
      code: shed.code || "",
      lines: shed.lines || 0,
      capacity: shed.capacity || 0,
      status: shed.status || "ACTIVE",
      remarks: shed.remarks || "",
      lineManagement: shed.lineManagement || "No",
      milking: shed.milking || "No"
    });
    setEditingId(shed._id || shed.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await swalConfirm("Delete Shed?", "This action cannot be undone.");
    if (!confirmed) return;
    
    try {
      await api.sheds.delete(id);
      swalSuccess("Deleted", "Shed deleted successfully");
      fetchShedsAndFarms();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to delete shed.");
    }
  };

  const handleEnableLineManagement = async (shed) => {
    setIsLoading(true);
    try {
      const selectedFarmId = shed.farmId?._id || shed.farmId?.id || shed.farmId || "";
      const farm = Array.isArray(farms) ? farms.find(f => (f?._id || f?.id) === selectedFarmId) : null;
      const farmCode = farm ? farm.code : 'UNKNOWN';
      const name = `${farmCode} - Shed ${shed.code}`;

      await api.sheds.update(shed._id || shed.id, {
        farmId: selectedFarmId,
        code: shed.code || "",
        name,
        lines: shed.lines || 0,
        capacity: shed.capacity || 0,
        status: shed.status || "ACTIVE",
        remarks: shed.remarks || "",
        lineManagement: "Yes",
        milking: shed.milking || "No"
      });
      swalSuccess("Success", "Line management enabled!");
      setSelectedShedForOverview(prev => prev ? { ...prev, lineManagement: 'Yes' } : null);
      fetchShedsAndFarms();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to enable line management.");
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col bg-transparent text-slate-800">
      {/* HEADER SECTION */}
      <div className="flex-none flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#16223F] tracking-tight">
            Shed Management
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Create, view, edit, and manage sheds.
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ farmId: "", code: "", lines: 0, capacity: 0, status: "ACTIVE", remarks: "", lineManagement: "No", milking: "No" });
            setEditingId(null);
            setShowForm(true);
          }}
          className="bg-[#16223F] hover:bg-[#2a3f75] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2"
        >
          <span>+ Add Shed</span>
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            placeholder="Search sheds by farm, code, capacity, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-4 text-sm font-semibold text-[#16223F] outline-none focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 transition-all duration-200"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="flex-1 overflow-auto border border-gray-200 rounded-xl shadow-sm bg-white relative">
        <table className="w-full text-left min-w-[800px] relative">
          <thead className="sticky top-0 z-10 bg-gray-50 text-[#16223F] uppercase text-[10px] font-black tracking-widest shadow-sm">
            <tr>
              <th className="p-4 border-b">Farm</th>
              <th className="p-4 border-b">Shed No</th>
              <th className="p-4 border-b">Rows</th>
              <th className="p-4 border-b">Capacity</th>
              <th className="p-4 border-b">Line Mgt</th>
              <th className="p-4 border-b">Milking</th>
              <th className="p-4 border-b">Status</th>
              <th className="p-4 border-b text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isFetching ? (
              <SkeletonLoader type="table" columns={8} />
            ) : filteredSheds.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-16 text-center">
                  <h3 className="text-lg font-bold text-gray-700">No Sheds Found</h3>
                  <p className="text-gray-500 mt-2 text-sm">
                    {sheds.length === 0 
                      ? "Get started by creating a new shed above." 
                      : "No sheds match your search query."}
                  </p>
                </td>
              </tr>
            ) : (
              filteredSheds.map((shed, idx) => (
              <tr
                key={shed._id || shed.id || idx}
                className="hover:bg-[#D1867D]/5 transition-colors"
              >
                <td className="p-4 text-sm font-bold text-black">{getFarmName(shed.farmId)}</td>
                <td className="p-4 text-sm font-bold text-[#D1867D]">Shed {shed.code}</td>
                <td className="p-4 text-sm">{shed.lines}</td>
                <td className="p-4 text-sm">{shed.capacity}</td>
                <td className="p-4">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border shadow-sm
                    ${shed.lineManagement === 'Yes'
                      ? 'text-purple-600 bg-purple-100/50 border-purple-200/50'
                      : 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                    {shed.lineManagement || "No"}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border shadow-sm
                    ${shed.milking === 'Yes'
                      ? 'text-pink-600 bg-pink-100/50 border-pink-200/50'
                      : 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                    {shed.milking || "No"}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm border
                    ${shed.status === 'ACTIVE' 
                      ? 'text-emerald-600 bg-emerald-100/50 border-emerald-200/50' 
                      : 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                    {shed.status}
                  </span>
                </td>
                <td className="p-4 text-right flex justify-end gap-2">
                  <button
                    onClick={() => setSelectedShedForOverview(shed)}
                    className="text-[11px] bg-purple-50 text-purple-600 hover:bg-purple-100 font-bold px-3 py-1.5 rounded-lg transition-colors border border-purple-100 flex items-center gap-1.5"
                  >
                    <span>👁️</span> Overview
                  </button>
                  <button
                    onClick={() => handleEdit(shed)}
                    className="text-[11px] bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold px-3 py-1.5 rounded-lg transition-colors border border-blue-100 flex items-center gap-1.5"
                  >
                    <span>✏️</span> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(shed._id || shed.id)}
                    className="text-[11px] bg-red-50 text-red-600 hover:bg-red-100 font-bold px-3 py-1.5 rounded-lg transition-colors border border-red-100 flex items-center gap-1.5"
                  >
                    <span>🗑️</span> Delete
                  </button>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {/* SLIDE-OVER FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-[#071437]/20 backdrop-blur-sm z-[200] flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-slide-in-right">
            
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#f9fafb]">
              <h2 className="text-lg font-black text-[#071437]">
                {editingId ? "Edit Shed" : "Add New Shed"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-800 font-bold text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-5">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Farm</label>
                <select
                  name="farmId"
                  value={formData.farmId}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 text-sm font-semibold"
                >
                  <option value="">Select Farm...</option>
                  {farms.map(f => (
                    <option key={f._id || f.id} value={f._id || f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Shed No (Code)</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="e.g. 1"
                  className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Rows (Lines)</label>
                  <input
                    type="number"
                    name="lines"
                    value={formData.lines}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Capacity</label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 text-sm font-semibold"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Line Management</label>
                <select
                  name="lineManagement"
                  value={formData.lineManagement || "No"}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 text-sm font-semibold"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Milking</label>
                <select
                  name="milking"
                  value={formData.milking || "No"}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 text-sm font-semibold"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Remarks</label>
                <textarea
                  name="remarks"
                  value={formData.remarks || ""}
                  onChange={handleChange}
                  placeholder="Enter remarks..."
                  rows="3"
                  className="w-full border border-gray-200 rounded-lg p-3 outline-none focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 text-sm font-semibold resize-none"
                />
              </div>

            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 bg-white border border-gray-200 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1 py-3 bg-[#071437] text-white rounded-lg font-bold text-sm hover:bg-[#0a1b4a] shadow-md disabled:opacity-50"
              >
                {isLoading ? "Saving..." : "Save Shed"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LINE OVERVIEW MODAL */}
      {selectedShedForOverview && (
        <div className="fixed inset-0 bg-[#071437]/45 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-100 animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#f9fafb]">
              <div>
                <h2 className="text-xl font-black text-[#071437]">
                  Line Overview — Shed {selectedShedForOverview.code}
                </h2>
                <p className="text-xs text-gray-500 font-semibold mt-0.5">
                  Farm: {getFarmName(selectedShedForOverview.farmId)} | Code: {selectedShedForOverview.code}
                </p>
              </div>
              <button
                onClick={() => setSelectedShedForOverview(null)}
                className="text-gray-400 hover:text-gray-800 font-black text-xl bg-slate-100 hover:bg-slate-200 rounded-full w-9 h-9 flex items-center justify-center transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/40">
              {selectedShedForOverview.lineManagement === "Yes" ? (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Rows</span>
                      <span className="text-2xl font-black text-[#071437] mt-1">
                        {selectedShedForOverview.lines || 0} Rows
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cattle Count</span>
                      <span className="text-2xl font-black text-[#071437] mt-1">
                        {cattleData.filter(c => String(c.shed || c.shedId || '').trim() === String(selectedShedForOverview.code || '').trim()).length} Animals
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shed Capacity</span>
                      <span className="text-2xl font-black text-[#071437] mt-1">
                        {selectedShedForOverview.capacity || 0} Max
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Occupancy Rate</span>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${selectedShedForOverview.capacity > 0 
                                ? Math.min(100, Math.round((cattleData.filter(c => String(c.shed || c.shedId || '').trim() === String(selectedShedForOverview.code || '').trim()).length / selectedShedForOverview.capacity) * 100)) 
                                : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold text-emerald-600">
                          {selectedShedForOverview.capacity > 0 
                            ? Math.min(100, Math.round((cattleData.filter(c => String(c.shed || c.shedId || '').trim() === String(selectedShedForOverview.code || '').trim()).length / selectedShedForOverview.capacity) * 100)) 
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Lines Rows */}
                  <div className="space-y-5">
                    {Array.from({ length: selectedShedForOverview.lines || 0 }, (_, i) => i + 1).map((rowNum) => {
                      const rowAnimals = cattleData
                        .filter(c => String(c.shed || c.shedId || '').trim() === String(selectedShedForOverview.code || '').trim() && Number(c.lineNo || 0) === rowNum)
                        .sort((a, b) => String(a.tag || '').localeCompare(String(b.tag || '')));

                      return (
                        <div key={rowNum} className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
                          {/* Row Header */}
                          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-extrabold text-sm text-[#071437] uppercase tracking-wider flex items-center gap-2">
                              <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-500" />
                              Row {rowNum}
                            </h3>
                            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                              {rowAnimals.length} {rowAnimals.length === 1 ? 'Animal' : 'Animals'}
                            </span>
                          </div>

                          {/* Row Animals Slider */}
                          <div className="p-5 overflow-x-auto flex gap-4 min-h-[140px] items-center whitespace-nowrap bg-slate-50/20 custom-scrollbar">
                            {rowAnimals.length === 0 ? (
                              <div className="w-full flex justify-center py-4">
                                <span className="text-xs font-bold text-slate-400 border-2 border-dashed border-slate-200 rounded-xl px-6 py-3 bg-white">
                                  📭 No animals assigned to Row {rowNum}
                                </span>
                              </div>
                            ) : (
                              rowAnimals.map((animal) => {
                                const statusStyles = {
                                  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-100",
                                  PREGNANT: "bg-violet-50 text-violet-700 border-violet-100",
                                  EMPTY: "bg-amber-50 text-amber-700 border-amber-100",
                                  PENDING: "bg-orange-50 text-orange-700 border-orange-100",
                                  SOLD: "bg-slate-100 text-slate-600 border-slate-200",
                                  DECEASED: "bg-red-50 text-red-700 border-red-100",
                                };
                                const animalEmoji = String(animal.cattleType || animal.animalType).toUpperCase() === 'BUFFALO' 
                                  ? '🐃' 
                                  : String(animal.cattleType || animal.animalType).toUpperCase() === 'CALF' 
                                    ? '🍼' 
                                    : '🐄';

                                return (
                                  <div 
                                    key={animal._id || animal.id} 
                                    className="flex-shrink-0 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm w-56 flex flex-col justify-between hover:shadow-md hover:border-purple-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xl">{animalEmoji}</span>
                                        <span className="font-extrabold text-[#071437] text-sm tracking-tight">
                                          #{animal.tag || animal.tag_id}
                                        </span>
                                      </div>
                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border shadow-sm ${statusStyles[String(animal.status).toUpperCase()] || 'bg-slate-50 text-slate-700'}`}>
                                        {animal.status}
                                      </span>
                                    </div>
                                    <div className="space-y-1 text-left">
                                      <div className="text-[11px] font-semibold text-slate-500">
                                        Breed: <span className="text-slate-800 font-bold">{animal.breed || '-'}</span>
                                      </div>
                                      <div className="text-[11px] font-semibold text-slate-500">
                                        Gender: <span className="text-slate-800 font-bold">{animal.gender || '-'}</span>
                                      </div>
                                      <div className="text-[11px] font-semibold text-slate-500">
                                        Milk Yield: <span className="text-purple-600 font-extrabold">{animal.milk || '-'} {animal.milk !== '-' ? 'L' : ''}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-5">
                  <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center text-3xl">
                    ⚙️
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#071437]">Line Management Disabled</h3>
                    <p className="text-sm text-gray-500 font-semibold mt-2">
                      Line management is currently disabled for this shed. Enable line management to define the order of animals inside sequential rows/lines.
                    </p>
                  </div>
                  <button
                    onClick={() => handleEnableLineManagement(selectedShedForOverview)}
                    disabled={isLoading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-extrabold py-3 rounded-xl shadow-md hover:-translate-y-0.5 active:scale-95 transition-all text-sm disabled:opacity-50"
                  >
                    {isLoading ? "Enabling..." : "Enable Line Management Now"}
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedShedForOverview(null)}
                className="bg-white border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all cursor-pointer"
              >
                Close Overview
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ShedManagementPg;
