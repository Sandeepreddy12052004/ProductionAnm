import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";
import SkeletonLoader from './SkeletonLoader';

// ---------------------------------------------------------------------------
// Capacity colour helpers
// ---------------------------------------------------------------------------

/**
 * Returns a Tailwind gradient class string based on usage percentage.
 * green (< 85%) → orange (≥ 85%) → red (≥ 95%)
 * @param {number} pct
 * @returns {string}
 */
function capacityBarColor(pct) {
  if (pct >= 95) return 'from-red-500 to-red-600';
  if (pct >= 85) return 'from-orange-400 to-orange-500';
  return 'from-emerald-400 to-emerald-500';
}

/**
 * Returns a text colour class based on usage percentage.
 * @param {number} pct
 * @returns {string}
 */
function capacityTextColor(pct) {
  if (pct >= 95) return 'text-red-600';
  if (pct >= 85) return 'text-orange-500';
  return 'text-emerald-600';
}

/**
 * Returns a badge background class based on usage percentage.
 * @param {number} pct
 * @returns {string}
 */
function capacityBadgeBg(pct) {
  if (pct >= 95) return 'bg-red-50 border-red-200/60 text-red-700';
  if (pct >= 85) return 'bg-orange-50 border-orange-200/60 text-orange-700';
  return 'bg-emerald-50 border-emerald-200/60 text-emerald-700';
}

// ---------------------------------------------------------------------------
// Capacity progress bar sub-component
// ---------------------------------------------------------------------------

/**
 * CapacityBar renders the occupancy progress bar with animated fill.
 * @param {{ occupied: number, maxCapacity: number, usagePercent: number }} props
 */
function CapacityBar({ occupied, maxCapacity, usagePercent }) {
  const pct = typeof usagePercent === 'number' ? usagePercent : 0;
  const displayPct = Math.min(100, pct);

  return (
    <div className="mt-4 mb-1">
      {/* Label row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-black text-[#5d7399] uppercase tracking-wider">
          Capacity
        </span>
        <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${capacityBadgeBg(pct)}`}>
          {pct.toFixed(1)}% used
        </span>
      </div>

      {/* Occupied / Remaining stat row */}
      <div className="flex items-center justify-between mb-2.5 text-xs font-bold text-[#5d7399]">
        <span>
          <span className={`font-black ${capacityTextColor(pct)}`}>{occupied}</span>
          {' '}Live Cattle
          {maxCapacity > 0 && (
            <> &nbsp;|&nbsp; <span className="text-[#071437] font-black">{Math.max(0, maxCapacity - occupied)}</span> Remaining</>
          )}
        </span>
        <span className="font-bold text-[#a0aec0]">
          / {maxCapacity} capacity
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2.5 bg-[#eef2f7] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${capacityBarColor(pct)} transition-all duration-700 ease-out`}
          style={{ width: `${displayPct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main FarmsPg component
// ---------------------------------------------------------------------------

const FarmsPg = () => {
  const router = useRouter();

  const [farms, setFarms] = useState([]);
  const [capacityMap, setCapacityMap] = useState({});  // farmId → capacity payload
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    location: ""
  });
  const [editingId, setEditingId] = useState(null);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchFarms = useCallback(async () => {
    setIsFetching(true);
    try {
      const farmsData = await api.farms.getAll();

      // Exception-proof: always work with an array
      const cleanFarms = Array.isArray(farmsData)
        ? farmsData
        : (farmsData?.data ?? []);

      setFarms(cleanFarms);

      // Fetch capacity for every farm in parallel, but silently — don't block the
      // page render if one farm's capacity call fails or is firewall-blocked.
      const capacityResults = await Promise.allSettled(
        cleanFarms.map(async (farm) => {
          const farmId = farm._id || farm.id;
          if (!farmId) return null;
          const result = await api.farms.getCapacity(farmId);
          // Absorb firewall-blocked or forbidden responses silently
          if (!result || result.firewallBlocked || result.forbidden) return null;
          return { farmId: String(farmId), data: result };
        })
      );

      /** @type {Record<string, any>} */
      const newCapacityMap = {};
      for (const settled of capacityResults) {
        if (settled.status === 'fulfilled' && settled.value) {
          newCapacityMap[settled.value.farmId] = settled.value.data;
        }
      }
      setCapacityMap(newCapacityMap);
    } catch (err) {
      console.error('[FarmsPg] fetchFarms error:', err);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchFarms();
  }, [fetchFarms]);

  // ---------------------------------------------------------------------------
  // Form handlers
  // ---------------------------------------------------------------------------

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      swalError("Error", "Farm Name and Code are required.");
      return;
    }

    setIsLoading(true);
    try {
      if (editingId) {
        await api.farms.update(editingId, formData);
        swalSuccess("Success", "Farm updated successfully!");
      } else {
        await api.farms.create(formData);
        swalSuccess("Success", "Farm created successfully!");
      }
      setFormData({ name: "", code: "", address: "", location: "" });
      setEditingId(null);
      setShowForm(false);
      fetchFarms();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to save farm.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (farm) => {
    setFormData({
      name: farm.name || "",
      code: farm.code || "",
      address: farm.address || "",
      location: farm.location || ""
    });
    setEditingId(farm._id || farm.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await swalConfirm("Delete Farm?", "This action cannot be undone.");
    if (!confirmed) return;

    try {
      await api.farms.delete(id);
      swalSuccess("Deleted", "Farm deleted successfully");
      fetchFarms();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to delete farm.");
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col bg-[#f7f9fc]">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex-none flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#071437] tracking-tight">
            Farm Management
          </h1>
          <p className="text-[#5d7399] mt-1 text-sm font-semibold">
            Create, view, and monitor live capacity across all farms.
          </p>
        </div>
        <button
          id="create-farm-btn"
          onClick={() => {
            setFormData({ name: "", code: "", address: "", location: "" });
            setEditingId(null);
            setShowForm(true);
          }}
          className="bg-[#071437] hover:bg-[#0d1f4d] text-white px-5 py-2.5 rounded-2xl font-bold text-lg shadow-lg transition-all duration-200 hover:scale-[1.02]"
        >
          + Create New Farm
        </button>
      </div>

      {/* ── FARM CARDS GRID ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {isFetching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonLoader type="block" height="h-48" />
            <SkeletonLoader type="block" height="h-48" />
            <SkeletonLoader type="block" height="h-48" />
          </div>
        ) : farms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {farms.map((farm) => {
              const farmId = String(farm._id || farm.id || '');
              const capacity = capacityMap[farmId];

              // Capacity values with safe defaults
              const occupied    = capacity?.occupied    ?? 0;
              const maxCapacity = capacity?.maxCapacity ?? 0;
              const usagePercent= capacity?.usagePercent?? 0;
              const hasCapacity = maxCapacity > 0;

              return (
                <div
                  key={farmId || farm.code}
                  onClick={() => router.push(`/farm/${farm.code.toLowerCase()}`)}
                  className="bg-white rounded-[2rem] p-7 border border-[#e3e8f2] shadow-sm hover:shadow-2xl hover:shadow-[#16223F]/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col group relative overflow-hidden"
                >
                  {/* Decorative background blob */}
                  <div className="absolute -top-6 -right-6 w-32 h-32 bg-[#f0f4f8] rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500 -z-10" />

                  {/* ── Card Header ────────────────────────────────────────── */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-black text-[#071437] tracking-tight">
                        {farm.name}
                      </h3>
                      <p className="text-[#5d7399] font-bold text-sm tracking-widest uppercase mt-1">
                        {farm.code}
                      </p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-[#f0f4f8] flex items-center justify-center text-3xl shadow-inner group-hover:-rotate-12 transition-transform duration-300">
                      🏠
                    </div>
                  </div>

                  {/* ── Location ───────────────────────────────────────────── */}
                  <div className="flex items-start gap-2 mb-4 text-[#53698c]">
                    <span className="text-base opacity-80 mt-0.5">📍</span>
                    <p className="font-semibold leading-relaxed text-sm">
                      {farm.address || 'No address provided'}
                      {farm.location && (
                        <><br /><span className="text-[#071437] font-black">{farm.location}</span></>
                      )}
                    </p>
                  </div>

                  {/* ── Capacity Engine Tile ────────────────────────────────── */}
                  {hasCapacity ? (
                    <CapacityBar
                      occupied={occupied}
                      maxCapacity={maxCapacity}
                      usagePercent={usagePercent}
                    />
                  ) : (
                    <div className="mt-3 mb-1 flex items-center gap-2 text-[#a0aec0] text-xs font-bold">
                      <span>📦</span>
                      <span>No sheds configured yet</span>
                    </div>
                  )}

                  {/* ── Quick Stats Row ─────────────────────────────────────── */}
                  {capacity?.sheds && Array.isArray(capacity.sheds) && capacity.sheds.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {capacity.sheds.slice(0, 4).map((shed) => (
                        <span
                          key={shed.shedId}
                          className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#f0f4f8] text-[#5d7399] border border-[#e3e8f2]"
                        >
                          {shed.code}: {shed.occupied}/{shed.capacity}
                        </span>
                      ))}
                      {capacity.sheds.length > 4 && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#f0f4f8] text-[#5d7399] border border-[#e3e8f2]">
                          +{capacity.sheds.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* ── Action Buttons ──────────────────────────────────────── */}
                  <div className="flex gap-4 mt-auto pt-5 border-t border-[#edf1f7] relative z-20 mt-5">
                    <button
                      id={`edit-farm-${farmId}`}
                      onClick={(e) => { e.stopPropagation(); handleEdit(farm); }}
                      className="flex-1 py-3 rounded-xl bg-[#f0f4f8] text-[#071437] font-black hover:bg-[#071437] hover:text-white transition-all shadow-sm hover:shadow-md text-sm"
                    >
                      Edit
                    </button>
                    <button
                      id={`delete-farm-${farmId}`}
                      onClick={(e) => { e.stopPropagation(); handleDelete(farmId); }}
                      className="flex-1 py-3 rounded-xl bg-red-50 text-red-600 font-black hover:bg-red-600 hover:text-white transition-all shadow-sm hover:shadow-md text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-[#e3e8f2] shadow-sm">
            <div className="text-4xl mb-4 opacity-50">🚜</div>
            <h3 className="text-xl font-bold text-[#071437] mb-2">No Farms Found</h3>
            <p className="text-[#5d7399]">Get started by creating your first farm.</p>
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT MODAL ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[30px] p-8 w-full max-w-lg shadow-2xl relative">

            {/* Close icon */}
            <button
              id="close-farm-form-btn"
              onClick={() => setShowForm(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-all font-bold"
            >
              ✕
            </button>

            <h2 className="text-3xl font-black text-[#071437] mb-8 pr-10">
              {editingId ? 'Edit Farm' : 'Create Farm'}
            </h2>

            <div className="space-y-5">
              {/* Farm Name */}
              <div>
                <label className="block mb-2 text-sm font-bold text-[#53698c]">
                  Farm Name *
                </label>
                <input
                  id="farm-name-input"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Happy Valley Farm"
                  className="w-full border border-[#dbe4f0] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                />
              </div>

              {/* Farm Code */}
              <div>
                <label className="block mb-2 text-sm font-bold text-[#53698c]">
                  Farm Code *
                </label>
                <input
                  id="farm-code-input"
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="e.g. HVF"
                  className="w-full border border-[#dbe4f0] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block mb-2 text-sm font-bold text-[#53698c]">
                  Address
                </label>
                <input
                  id="farm-address-input"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street Address"
                  className="w-full border border-[#dbe4f0] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                />
              </div>

              {/* Location / City */}
              <div>
                <label className="block mb-2 text-sm font-bold text-[#53698c]">
                  Location / City
                </label>
                <input
                  id="farm-location-input"
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="City, State"
                  className="w-full border border-[#dbe4f0] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button
                id="save-farm-btn"
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1 bg-[#071437] hover:bg-[#0d1f4d] text-white py-4 rounded-2xl font-black text-lg transition-all disabled:opacity-50"
              >
                {isLoading ? "Saving..." : "Save Farm"}
              </button>
              <button
                id="cancel-farm-btn"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-[#eef2f7] hover:bg-[#e3e8f0] text-[#071437] py-4 rounded-2xl font-black text-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmsPg;
