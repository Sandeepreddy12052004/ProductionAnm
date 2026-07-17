import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";
import SkeletonLoader from "./SkeletonLoader";
import ModulePageHeader from "./ModulePageHeader";
import FarmFilterSelector from "./FarmFilterSelector";
import { hasActionPermission } from "../utils/permission";

const TreatmentManagementPg = () => {
  const [treatments, setTreatments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedicines, setSelectedMedicines] = useState([""]);

  const canCreate = hasActionPermission('TREATMENT_MANAGEMENT', 'HEALTH', 'create');
  const canEdit   = hasActionPermission('TREATMENT_MANAGEMENT', 'HEALTH', 'edit');
  const canDelete = hasActionPermission('TREATMENT_MANAGEMENT', 'HEALTH', 'delete');

  // Form state
  const [formData, setFormData] = useState({
    id: null,
    symptoms: "",
    diagnosis: "",
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [treatmentData, medicineData] = await Promise.all([
        api.treatments.getAll().catch(() => []),
        api.medicines.getAll().catch(() => []),
      ]);
      setTreatments(treatmentData || []);
      setMedicines(medicineData || []);
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to retrieve treatment and medicine records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.symptoms.trim()) {
      swalError("Error", "Symptoms are required");
      return;
    }
    const activeMeds = selectedMedicines.map(m => m.trim()).filter(Boolean);
    if (activeMeds.length === 0) {
      swalError("Error", "At least one medicine is required");
      return;
    }
    const treatmentString = activeMeds.join(", ");

    setIsLoadingForm(true);
    try {
      let resolvedFarmId = null;
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          const userFarmId = user.farmId && typeof user.farmId === 'object'
            ? (user.farmId._id || user.farmId.id)
            : user.farmId;
          if (userFarmId && userFarmId !== 'ALL' && String(user.role).toUpperCase() !== 'SUPER_ADMIN') {
            resolvedFarmId = userFarmId;
          }
        }
      } catch (err) {}

      if (!resolvedFarmId) {
        const activeFarm = localStorage.getItem("__active_farm_id__");
        if (activeFarm && activeFarm !== 'ALL') {
          resolvedFarmId = activeFarm;
        }
      }

      const payload = {
        symptoms: formData.symptoms.trim(),
        diagnosis: formData.diagnosis.trim(),
        treatment: treatmentString,
        farmId: resolvedFarmId,
      };

      if (formData.id) {
        await api.treatments.update(formData.id, payload);
        swalSuccess("Success", "Treatment record updated successfully");
      } else {
        await api.treatments.create(payload);
        swalSuccess("Success", "Treatment record added successfully");
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", typeof err === "string" ? err : "Failed to save treatment entry.");
    } finally {
      setIsLoadingForm(false);
    }
  };

  const handleEdit = (log) => {
    setFormData({
      id: log.id || log._id,
      symptoms: log.symptoms || "",
      diagnosis: log.diagnosis || "",
    });
    const medsArray = log.treatment ? log.treatment.split(",").map(s => s.trim()).filter(Boolean) : [];
    setSelectedMedicines(medsArray.length > 0 ? medsArray : [""]);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await swalConfirm("Delete Treatment Record?", "Are you sure you want to delete this treatment record? This action cannot be undone.");
    if (!confirmed) return;

    try {
      await api.treatments.delete(id);
      swalSuccess("Deleted", "Treatment record removed successfully");
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to delete treatment record");
    }
  };

  const filteredTreatments = treatments.filter((t) => {
    const query = searchQuery.toLowerCase();
    return (
      (t.symptoms || "").toLowerCase().includes(query) ||
      (t.diagnosis || "").toLowerCase().includes(query) ||
      (t.treatment || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="w-full flex flex-col bg-transparent text-slate-800">
      {/* HEADER SECTION */}
      <ModulePageHeader
        title="Treatment Management"
        description="Dedicated portal to define symptoms, diagnose issues, and configure medical treatments."
      >
        {canCreate && (
          <button
            onClick={() => {
              setFormData({ id: null, symptoms: "", diagnosis: "" });
              setSelectedMedicines([""]);
              setShowForm(true);
            }}
            className="bg-[#16223F] hover:bg-[#2a3f75] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
          >
            <span>+ Add Treatment Record</span>
          </button>
        )}
      </ModulePageHeader>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h4 className="text-xs font-black text-gray-400 uppercase">Total Treatments</h4>
          <p className="text-2xl font-black text-[#16223F] mt-1">{treatments.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h4 className="text-xs font-black text-gray-400 uppercase">Pending Cases</h4>
          <p className="text-2xl font-black text-red-600 mt-1">
            {treatments.filter(t => t.healthStatus === "Pending" || t.healthStatus === "Critical").length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h4 className="text-xs font-black text-gray-400 uppercase">Completed Cases</h4>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {treatments.filter(t => t.healthStatus === "Completed").length}
          </p>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search treatments by symptoms, diagnosis, medicines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-4 text-sm font-semibold text-[#16223F] outline-none focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 transition-all duration-200"
          />
        </div>
        <div className="flex-none w-full md:w-auto flex justify-end">
          <FarmFilterSelector layout="horizontal" size="md" />
        </div>
      </div>

      {/* CONTENT TABLE */}
      <div className="flex-1 overflow-auto border border-gray-200 rounded-xl shadow-sm bg-white relative">
        {!isLoading && filteredTreatments.length === 0 && (
          <div className="p-16 text-center">
            <h3 className="text-lg font-bold text-gray-700">No Treatments Configured</h3>
            <p className="text-gray-500 mt-2 text-sm">Create a new treatment record above.</p>
          </div>
        )}
        {(isLoading || filteredTreatments.length > 0) && (
          <table className="w-full text-left min-w-[700px] relative">
            <thead className="sticky top-0 z-10 bg-gray-50 text-[#16223F] uppercase text-[10px] font-black tracking-widest shadow-sm">
              <tr>
                <th className="p-4 border-b">Symptoms</th>
                <th className="p-4 border-b">Diagnosis</th>
                <th className="p-4 border-b">Treatment (Medicine)</th>
                <th className="p-4 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <SkeletonLoader type="table" columns={4} />
              ) : (
                filteredTreatments.map((log) => (
                  <tr key={log.id || log._id} className="hover:bg-[#D1867D]/5 transition-colors">
                    <td className="p-4 text-sm font-black text-black">{log.symptoms}</td>
                    <td className="p-4 text-sm font-bold text-gray-600 truncate max-w-[200px]">{log.diagnosis || "-"}</td>
                    <td className="p-4 text-sm text-gray-500 truncate max-w-[350px]">{log.treatment}</td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end">
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(log)}
                            className="text-[11px] bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold px-2.5 py-1.5 rounded-lg border border-slate-200"
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(log.id || log._id)}
                            className="text-[11px] bg-red-50 text-red-600 hover:bg-red-100 font-bold px-2.5 py-1.5 rounded-lg border border-red-100"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[30px] p-8 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-all font-bold"
            >
              ✕
            </button>

            <h2 className="text-2xl font-black text-[#071437] mb-6 pr-10">
              {formData.id ? "Edit Treatment Record" : "Add Treatment Record"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Symptoms */}
              <div>
                <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Symptoms *</label>
                <input
                  type="text"
                  name="symptoms"
                  value={formData.symptoms}
                  onChange={handleChange}
                  placeholder="e.g. Coughing, Fever"
                  className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                />
              </div>

              {/* Diagnosis */}
              <div>
                <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Diagnosis</label>
                <input
                  type="text"
                  name="diagnosis"
                  value={formData.diagnosis}
                  onChange={handleChange}
                  placeholder="e.g. Pneumonia"
                  className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                />
              </div>

              {/* Treatment (Medicines) */}
              <div className="space-y-2">
                <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Treatment (Medicines) *</label>
                {selectedMedicines.map((med, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <select
                      value={med}
                      onChange={(e) => {
                        const updated = [...selectedMedicines];
                        updated[index] = e.target.value;
                        setSelectedMedicines(updated);
                      }}
                      className="flex-1 border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                    >
                      <option value="">-- Select Medicine --</option>
                      {medicines
                        .filter(m => m.status !== false)
                        .map((m) => (
                          <option key={m.id || m._id} value={m.name}>
                            {m.name} ({m.type || "N/A"})
                          </option>
                        ))}
                    </select>
                    {selectedMedicines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = selectedMedicines.filter((_, idx) => idx !== index);
                          setSelectedMedicines(updated);
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-4 py-3 rounded-xl border border-red-200"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedMedicines([...selectedMedicines, ""])}
                  className="text-xs bg-[#eef2f7] hover:bg-[#e3e8f0] text-[#071437] px-4 py-2.5 rounded-xl font-bold transition-all"
                >
                  + Add Medicine
                </button>
              </div>

              <div className="flex gap-4 mt-6 pt-4 border-t border-[#edf1f7]">
                <button
                  type="submit"
                  disabled={isLoadingForm}
                  className="flex-1 bg-[#071437] hover:bg-[#0d1f4d] text-white py-3.5 rounded-xl font-black text-sm shadow-md transition-all disabled:opacity-50"
                >
                  {isLoadingForm ? "Saving..." : "Save Treatment Record"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-[#eef2f7] hover:bg-[#e3e8f0] text-[#071437] py-3.5 rounded-xl font-black text-sm transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TreatmentManagementPg;
