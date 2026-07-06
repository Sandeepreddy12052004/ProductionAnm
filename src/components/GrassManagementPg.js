import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";
import SkeletonLoader from "./SkeletonLoader";
import ModulePageHeader from "./ModulePageHeader";
import { Edit3, Trash2, Plus, Info, Check, X, MapPin, Hash, Activity } from "lucide-react";

export default function GrassManagementPg() {
  const [records, setRecords] = useState([]);
  const [farms, setFarms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    id: null,
    name: "",
    sourcingTo: "",
    location: "",
    status: "ACTIVE",
    notes: "",
    area: "",
  });

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const res = await api.grassManagement.getAll();
      const raw = Array.isArray(res) ? res : (res?.data ?? []);
      setRecords(raw);
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to retrieve grass sourcing farms.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFarms = async () => {
    try {
      const res = await api.farms.getAll();
      const raw = Array.isArray(res) ? res : (res?.data ?? []);
      setFarms(raw);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchFarms();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      swalError("Validation Error", "Sourcing Farm/Area Name is required");
      return;
    }
    if (!formData.sourcingTo) {
      swalError("Validation Error", "Sourcing To (Destination Farm) is required");
      return;
    }

    setIsLoadingForm(true);
    try {
      const payload = {
        name: formData.name.trim(),
        sourcingTo: formData.sourcingTo,
        location: formData.location.trim(),
        status: formData.status,
        notes: formData.notes.trim(),
        area: formData.area ? Number(formData.area) : null,
      };

      if (formData.id) {
        await api.grassManagement.update(formData.id, payload);
        swalSuccess("Success", "Grass sourcing farm details updated successfully");
      } else {
        await api.grassManagement.create(payload);
        swalSuccess("Success", "New grass sourcing farm registered successfully");
      }
      setShowForm(false);
      fetchRecords();
    } catch (err) {
      console.error(err);
      swalError("Error", typeof err === "string" ? err : "Failed to save sourcing farm details");
    } finally {
      setIsLoadingForm(false);
    }
  };

  const handleEdit = (rec) => {
    setFormData({
      id: rec._id || rec.id,
      name: rec.name || "",
      sourcingTo: rec.sourcingTo?._id || rec.sourcingTo?.id || rec.sourcingTo || "",
      location: rec.location || "",
      status: rec.status || "ACTIVE",
      notes: rec.notes || "",
      area: rec.area || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await swalConfirm(
      "Delete Grass Sourcing Farm?",
      "Are you sure you want to permanently delete this grass sourcing farm definition?"
    );
    if (!confirmed) return;

    try {
      await api.grassManagement.delete(id);
      swalSuccess("Deleted", "Grass sourcing farm definition deleted successfully");
      fetchRecords();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to delete sourcing farm");
    }
  };

  const handleRegrow = async (id, name) => {
    const confirmed = await swalConfirm(
      "Regrow Grass?",
      `Are you sure you want to mark "${name}" for regrowth? This will reset the utilized acreage back to 0 for the next harvest cycle.`
    );
    if (!confirmed) return;

    try {
      await api.grassManagement.update(id, { lastRegrownAt: new Date().toISOString() });
      swalSuccess("Success", `Grass sourcing farm "${name}" is now marked for regrowth. Utilized acres reset to 0.`);
      fetchRecords();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to mark farm for regrowth.");
    }
  };

  const handleResetForm = () => {
    setFormData({
      id: null,
      name: "",
      sourcingTo: farms.length > 0 ? (farms[0]._id || farms[0].id) : "",
      location: "",
      status: "ACTIVE",
      notes: "",
      area: "",
    });
    setShowForm(true);
  };

  // Filtered list search
  const filteredRecords = records.filter((rec) => {
    const query = searchQuery.toLowerCase();
    const name = (rec.name || "").toLowerCase();
    const sourcingToName = (rec.sourcingTo?.name || rec.sourcingTo?.code || "").toLowerCase();
    const location = (rec.location || "").toLowerCase();
    const notes = (rec.notes || "").toLowerCase();
    const status = (rec.status || "").toLowerCase();
    return (
      name.includes(query) ||
      sourcingToName.includes(query) ||
      location.includes(query) ||
      notes.includes(query) ||
      status.includes(query)
    );
  });

  const totalCount = records.length;
  const activeCount = records.filter((r) => r.status === "ACTIVE").length;
  const inactiveCount = records.filter((r) => r.status === "INACTIVE").length;

  return (
    <div className="w-full flex flex-col text-black font-sans min-h-screen bg-transparent">
      {/* HEADER */}
      <ModulePageHeader
        title="Grass Management"
        description="Configure and manage the external farms or fields responsible for grass sourcing and loading."
      />

      {/* OVERVIEW METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Total Sourcing Farms */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-500/10 flex items-center justify-center text-2xl shadow-inner text-slate-600">
              🌿
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Sourcing Farms</p>
              <h2 className="text-2xl font-black text-[#16223F] mt-0.5">{totalCount}</h2>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                Registered locations
              </span>
            </div>
          </div>
        </div>

        {/* Active Sourcing Farms */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-2xl shadow-inner text-emerald-600">
              ✅
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Sourcing Farms</p>
              <h2 className="text-2xl font-black text-emerald-800 mt-0.5">{activeCount}</h2>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                Available for loading
              </span>
            </div>
          </div>
        </div>

        {/* Inactive Sourcing Farms */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-2xl shadow-inner text-rose-600">
              ⚠️
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inactive Sourcing Farms</p>
              <h2 className="text-2xl font-black text-rose-800 mt-0.5">{inactiveCount}</h2>
              <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full mt-1 inline-block">
                Temporarily suspended
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH AND DEFINE SOURCING FARM BUTTON */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <input
            type="text"
            placeholder="Search grass sourcing farms (Name, Destination, Location)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:max-w-md h-12 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-semibold text-[#16223F] outline-none focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 transition-all"
          />
          <button
            onClick={handleResetForm}
            className="w-full md:w-auto h-12 px-6 rounded-xl bg-[#16223F] hover:bg-[#16223F]/90 text-white font-bold flex items-center justify-center gap-2 shadow-sm transition-all duration-200 active:scale-[0.98]"
          >
            <Plus size={16} />
            Define Sourcing Farm
          </button>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#16223F]/5 text-[#16223F] uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
              <tr>
                <th className="p-4 pl-6">Grass Sourcing Farm / Area</th>
                <th className="p-4">Sourcing To (Destination)</th>
                <th className="p-4">Area (Acres)</th>
                <th className="p-4">Location</th>
                <th className="p-4">Status</th>
                <th className="p-4">Notes</th>
                <th className="p-4 pr-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex justify-center items-center py-6">
                      <div className="w-8 h-8 rounded-full border-4 border-[#16223F]/10 border-t-[#16223F] animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((rec) => (
                  <tr key={rec._id || rec.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="font-extrabold text-sm text-[#16223F]">
                        {rec.name}
                      </div>
                    </td>
                    <td className="p-4 text-xs font-bold text-slate-600">
                      {rec.sourcingTo?.name ? `${rec.sourcingTo.name} (${rec.sourcingTo.code})` : "-"}
                    </td>
                    <td className="p-4 text-xs font-semibold text-slate-600">
                      {rec.area !== undefined && rec.area !== null ? (
                        <>
                          <div className="font-extrabold text-[#16223F]">
                            {Math.max(0, rec.area - (rec.utilizedArea || 0)).toFixed(2)} Acres available
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Total: {rec.area} Acres · Utilized: {(rec.utilizedArea || 0).toFixed(2)} Acres
                          </div>
                        </>
                      ) : "-"}
                    </td>
                    <td className="p-4 text-xs font-semibold text-slate-600">
                      {rec.location || "-"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider border ${
                          rec.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-red-50 text-red-700 border-red-100"
                        }`}
                      >
                        {rec.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-500 font-medium max-w-xs truncate">
                      {rec.notes || "-"}
                    </td>
                    <td className="p-4 pr-6">
                      <div className="flex justify-center items-center gap-2">
                        {rec.utilizedArea > 0 && (
                          <button
                            onClick={() => handleRegrow(rec._id || rec.id, rec.name)}
                            className="px-2.5 py-1 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-bold text-[10px] tracking-wide"
                            title="Regrow / Reharvest Grass"
                          >
                            🌿 Regrow
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(rec)}
                          className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(rec._id || rec.id)}
                          className="p-2 text-red-400 hover:text-red-600 bg-red-50/50 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                    No grass sourcing farms defined. Click "Define Sourcing Farm" to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DEFINE SOURCING FARM FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[250] p-4 transition-all duration-300">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-extrabold text-[#16223F]">
                {formData.id ? "✏️ Edit Grass Sourcing Farm" : "🌿 New Grass Sourcing Farm"}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 bg-slate-200/50 rounded-full w-8 h-8 flex items-center justify-center font-black cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Sourcing Farm Name */}
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Sourcing Farm / Area Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="E.g. Sourcing Area Alpha, Leased Land B"
                  className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-semibold text-[#16223F] bg-white outline-none focus:border-[#D1867D] transition-all"
                  required
                />
              </div>

              {/* Sourcing To Dropdown */}
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Sourcing To (Destination Farm) <span className="text-red-500">*</span>
                </label>
                <select
                  name="sourcingTo"
                  value={formData.sourcingTo}
                  onChange={handleChange}
                  className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-semibold text-[#16223F] bg-white outline-none focus:border-[#D1867D] transition-all"
                  required
                >
                  <option value="" disabled>-- Select Destination Farm --</option>
                  {farms.map((f) => (
                    <option key={f._id || f.id} value={f._id || f.id}>
                      {f.name} ({f.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Area */}
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Total Area (Acres)
                </label>
                <input
                  type="number"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  placeholder="E.g. 5, 10"
                  step="any"
                  className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-semibold text-[#16223F] bg-white outline-none focus:border-[#D1867D] transition-all"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Location / Address
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="E.g. Vemula Region, Plot 4"
                  className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-semibold text-[#16223F] bg-white outline-none focus:border-[#D1867D] transition-all"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Availability Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full h-11 px-3.5 border border-slate-200 rounded-xl text-sm font-semibold text-[#16223F] bg-white outline-none focus:border-[#D1867D] transition-all"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Notes / Remarks
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Additional sourcing details, size, grass variety..."
                  rows="3"
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold text-[#16223F] bg-white outline-none focus:border-[#D1867D] transition-all resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-extrabold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoadingForm}
                  className="px-6 py-2.5 rounded-xl bg-[#16223F] hover:bg-[#16223F]/90 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isLoadingForm && (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  )}
                  {formData.id ? "Save Changes" : "Create Farm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
