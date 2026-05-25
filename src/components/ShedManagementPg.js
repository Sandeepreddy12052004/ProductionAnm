import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";

const ShedManagementPg = () => {
  const [sheds, setSheds] = useState([]);
  const [farms, setFarms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [formData, setFormData] = useState({
    farmId: "",
    code: "",
    lines: 0,
    capacity: 0,
    status: "ACTIVE"
  });
  const [editingId, setEditingId] = useState(null);

  const fetchShedsAndFarms = async () => {
    setIsFetching(true);
    try {
      const [shedsData, farmsData] = await Promise.all([
        api.sheds.getAll(),
        api.farms.getAll()
      ]);
      setSheds(shedsData || []);
      setFarms(farmsData || []);
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
      const selectedFarm = farms.find(f => (f._id || f.id) === formData.farmId);
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
        await api.sheds.create(payload);
        swalSuccess("Success", "Shed created successfully!");
      }
      setFormData({ farmId: "", code: "", lines: 0, capacity: 0, status: "ACTIVE" });
      setEditingId(null);
      setShowForm(false);
      fetchShedsAndFarms();
    } catch (err) {
      console.error(err);
      swalError("Error", err.response?.data?.message || err.message || "Failed to save shed.");
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
      status: shed.status || "ACTIVE"
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

  const getFarmName = (fId) => {
    if (!fId) return 'Unknown';
    if (typeof fId === 'object') return fId.name || fId.code;
    const farm = farms.find(f => (f._id || f.id) === fId);
    return farm ? farm.name : fId;
  };

  return (
    <div className="p-4 md:p-8 w-full bg-transparent text-slate-800">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
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
            setFormData({ farmId: "", code: "", lines: 0, capacity: 0, status: "ACTIVE" });
            setEditingId(null);
            setShowForm(true);
          }}
          className="bg-[#16223F] hover:bg-[#2a3f75] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-2"
        >
          <span>+ Add Shed</span>
        </button>
      </div>

      {/* TABLE */}
      <div className="border border-gray-200 rounded-xl shadow-sm overflow-x-auto bg-white">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-[#16223F]/5 text-[#16223F] uppercase text-[10px] font-black tracking-widest">
            <tr>
              <th className="p-4 border-b">Farm</th>
              <th className="p-4 border-b">Shed No</th>
              <th className="p-4 border-b">Rows</th>
              <th className="p-4 border-b">Capacity</th>
              <th className="p-4 border-b">Status</th>
              <th className="p-4 border-b text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isFetching ? (
              // SKELETON LOADER
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse border-b border-gray-100">
                    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-12"></div></td>
                    <td className="p-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    <td className="p-4"><div className="h-6 bg-slate-200 rounded-full w-20"></div></td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      <div className="h-8 bg-slate-200 rounded-lg w-16"></div>
                      <div className="h-8 bg-slate-200 rounded-lg w-20"></div>
                    </td>
                  </tr>
                ))}
              </>
            ) : sheds.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-16 text-center">
                  <h3 className="text-lg font-bold text-gray-700">No Sheds Found</h3>
                  <p className="text-gray-500 mt-2 text-sm">Get started by creating a new shed above.</p>
                </td>
              </tr>
            ) : (
              sheds.map((shed, idx) => (
              <tr
                key={shed._id || shed.id || idx}
                className="hover:bg-[#D1867D]/5 transition-colors"
              >
                <td className="p-4 text-sm font-bold text-black">{getFarmName(shed.farmId)}</td>
                <td className="p-4 text-sm font-bold text-[#D1867D]">Shed {shed.code}</td>
                <td className="p-4 text-sm">{shed.lines}</td>
                <td className="p-4 text-sm">{shed.capacity}</td>
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
        <div className="fixed inset-0 bg-[#071437]/20 backdrop-blur-sm z-50 flex justify-end">
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
    </div>
  );
};

export default ShedManagementPg;
