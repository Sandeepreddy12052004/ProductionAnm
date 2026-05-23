import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";

const ShedManagementPg = () => {
  const [sheds, setSheds] = useState([]);
  const [farms, setFarms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    farmId: "",
    code: "",
    lines: 0,
    capacity: 0,
    status: "ACTIVE"
  });
  const [editingId, setEditingId] = useState(null);

  const fetchShedsAndFarms = async () => {
    try {
      const [shedsData, farmsData] = await Promise.all([
        api.sheds.getAll(),
        api.farms.getAll()
      ]);
      setSheds(shedsData || []);
      setFarms(farmsData || []);
    } catch (err) {
      console.error(err);
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
    <div className="p-8 bg-[#f7f9fc] min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-2xl font-black text-[#071437] tracking-tight">
            Shed Management
          </h1>
          <p className="text-[#5d7399] mt-3 text-sm font-semibold">
            Create, view, edit, and manage sheds.
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ farmId: "", code: "", lines: 0, capacity: 0, status: "ACTIVE" });
            setEditingId(null);
            setShowForm(true);
          }}
          className="bg-[#D1867D] hover:bg-[#b06f67] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all"
        >
          + Add Shed
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-700">
          <thead className="bg-[#f9fafb] text-xs uppercase text-gray-500 font-black border-b border-gray-200 tracking-wider">
            <tr>
              <th className="p-4">Farm</th>
              <th className="p-4">Shed No</th>
              <th className="p-4">Rows</th>
              <th className="p-4">Capacity</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sheds.map((shed, idx) => (
              <tr
                key={shed._id || shed.id || idx}
                className="border-b border-gray-100 hover:bg-slate-50 transition-colors"
              >
                <td className="p-4 font-bold">{getFarmName(shed.farmId)}</td>
                <td className="p-4 font-bold text-[#D1867D]">Shed {shed.code}</td>
                <td className="p-4">{shed.lines}</td>
                <td className="p-4">{shed.capacity}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-xs font-bold rounded ${shed.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {shed.status}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button
                    onClick={() => handleEdit(shed)}
                    className="text-blue-600 hover:text-blue-800 font-bold px-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(shed._id || shed.id)}
                    className="text-red-600 hover:text-red-800 font-bold px-2"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {sheds.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-400 font-semibold">
                  No sheds found. Create one to get started!
                </td>
              </tr>
            )}
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
