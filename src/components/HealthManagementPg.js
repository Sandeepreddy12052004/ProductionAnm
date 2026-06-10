import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";
import SkeletonLoader from "./SkeletonLoader";

const HealthManagementPg = () => {
  const [activeTab, setActiveTab] = useState("treatments");
  const [treatments, setTreatments] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Treatment Form state
  const [treatmentFormData, setTreatmentFormData] = useState({
    id: null,
    tag_id: "",
    symptoms: "",
    diagnosis: "",
    treatment: "",
    healthStatus: "Pending",
    cost: "",
    startDate: new Date().toISOString().split("T")[0],
    remarks: "",
  });

  // Vaccination Form state
  const [vaccineFormData, setVaccineFormData] = useState({
    id: null,
    tag_id: "",
    vaccinationName: "",
    batchNo: "",
    manufactureDate: "",
    expiryDate: "",
    treatmentOrStatus: "Completed",
    remarks: "",
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [treatmentData, vaccinationData] = await Promise.all([
        api.health.treatments.getAll(),
        api.health.vaccinations.getAll(),
      ]);
      setTreatments(treatmentData || []);
      setVaccinations(vaccinationData || []);
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to retrieve health and vaccination records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTreatmentChange = (e) => {
    setTreatmentFormData({
      ...treatmentFormData,
      [e.target.name]: e.target.value,
    });
  };

  const handleVaccineChange = (e) => {
    setVaccineFormData({
      ...vaccineFormData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveTreatment = async (e) => {
    e.preventDefault();
    if (!treatmentFormData.tag_id.trim()) {
      swalError("Error", "Tag ID is required");
      return;
    }
    if (!treatmentFormData.symptoms.trim()) {
      swalError("Error", "Symptoms are required");
      return;
    }
    if (!treatmentFormData.treatment.trim()) {
      swalError("Error", "Treatment/Action Taken is required");
      return;
    }

    setIsLoadingForm(true);
    try {
      const payload = {
        tag_id: treatmentFormData.tag_id.trim().toUpperCase(),
        tagId: treatmentFormData.tag_id.trim().toUpperCase(),
        symptoms: treatmentFormData.symptoms.trim(),
        diagnosis: treatmentFormData.diagnosis.trim(),
        treatment: treatmentFormData.treatment.trim(),
        healthStatus: treatmentFormData.healthStatus,
        cost: treatmentFormData.cost ? Number(treatmentFormData.cost) : 0,
        startDate: treatmentFormData.startDate,
        remarks: treatmentFormData.remarks.trim(),
      };

      if (treatmentFormData.id) {
        await api.health.treatments.update(treatmentFormData.id, payload);
        swalSuccess("Success", "Treatment log updated successfully");
      } else {
        await api.health.treatments.create(payload);
        swalSuccess("Success", "Treatment log added successfully");
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", typeof err === "string" ? err : "Failed to save treatment entry. Make sure the Tag ID exists in the active Live Stock registry.");
    } finally {
      setIsLoadingForm(false);
    }
  };

  const handleSaveVaccine = async (e) => {
    e.preventDefault();
    if (!vaccineFormData.tag_id.trim()) {
      swalError("Error", "Tag ID is required");
      return;
    }
    if (!vaccineFormData.vaccinationName.trim()) {
      swalError("Error", "Vaccine name is required");
      return;
    }

    setIsLoadingForm(true);
    try {
      const payload = {
        tag_id: vaccineFormData.tag_id.trim().toUpperCase(),
        vaccinationName: vaccineFormData.vaccinationName.trim(),
        batchNo: vaccineFormData.batchNo.trim(),
        manufactureDate: vaccineFormData.manufactureDate || null,
        expiryDate: vaccineFormData.expiryDate || null,
        treatmentOrStatus: vaccineFormData.treatmentOrStatus,
        remarks: vaccineFormData.remarks.trim(),
      };

      if (vaccineFormData.id) {
        await api.health.vaccinations.update(vaccineFormData.id, payload);
        swalSuccess("Success", "Vaccination log updated successfully");
      } else {
        await api.health.vaccinations.create(payload);
        swalSuccess("Success", "Vaccination log added successfully");
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", typeof err === "string" ? err : "Failed to save vaccination entry. Make sure the Tag ID exists in the active Live Stock registry.");
    } finally {
      setIsLoadingForm(false);
    }
  };

  const handleEditTreatment = (log) => {
    const formattedDate = log.startDate ? new Date(log.startDate).toISOString().split("T")[0] : "";
    setTreatmentFormData({
      id: log.id || log._id,
      tag_id: log.tag_id || log.tagId || "",
      symptoms: log.symptoms || "",
      diagnosis: log.diagnosis || "",
      treatment: log.treatment || "",
      healthStatus: log.healthStatus || "Pending",
      cost: log.cost || "",
      startDate: formattedDate,
      remarks: log.remarks || "",
    });
    setActiveTab("treatments");
    setShowForm(true);
  };

  const handleEditVaccine = (log) => {
    const mfgDate = log.manufactureDate ? new Date(log.manufactureDate).toISOString().split("T")[0] : "";
    const expDate = log.expiryDate ? new Date(log.expiryDate).toISOString().split("T")[0] : "";
    setVaccineFormData({
      id: log.id || log._id,
      tag_id: log.tag_id || log.tagId || "",
      vaccinationName: log.vaccinationName || "",
      batchNo: log.batchNo || "",
      manufactureDate: mfgDate,
      expiryDate: expDate,
      treatmentOrStatus: log.treatmentOrStatus || "Completed",
      remarks: log.remarks || "",
    });
    setActiveTab("vaccinations");
    setShowForm(true);
  };

  const handleDeleteTreatment = async (id) => {
    const confirmed = await swalConfirm("Delete Treatment Record?", "Are you sure you want to delete this treatment log? This action cannot be undone.");
    if (!confirmed) return;

    try {
      await api.health.treatments.delete(id);
      swalSuccess("Deleted", "Treatment log removed successfully");
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to delete treatment record");
    }
  };

  const handleDeleteVaccine = async (id) => {
    const confirmed = await swalConfirm("Delete Vaccination Record?", "Are you sure you want to delete this vaccination log? This action cannot be undone.");
    if (!confirmed) return;

    try {
      await api.health.vaccinations.delete(id);
      swalSuccess("Deleted", "Vaccination log removed successfully");
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to delete vaccination record");
    }
  };

  const filteredTreatments = treatments.filter((t) => {
    const query = searchQuery.toLowerCase();
    return (
      (t.tag_id || "").toLowerCase().includes(query) ||
      (t.symptoms || "").toLowerCase().includes(query) ||
      (t.diagnosis || "").toLowerCase().includes(query) ||
      (t.treatment || "").toLowerCase().includes(query) ||
      (t.healthStatus || "").toLowerCase().includes(query)
    );
  });

  const filteredVaccinations = vaccinations.filter((v) => {
    const query = searchQuery.toLowerCase();
    return (
      (v.tag_id || "").toLowerCase().includes(query) ||
      (v.vaccinationName || "").toLowerCase().includes(query) ||
      (v.batchNo || "").toLowerCase().includes(query) ||
      (v.treatmentOrStatus || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col bg-transparent text-slate-800">
      {/* HEADER SECTION */}
      <div className="flex-none flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#16223F] tracking-tight">
            Health & Medical Management
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Centralized health monitoring, treatment journals, and dynamic immunization plans.
          </p>
        </div>

        <button
          onClick={() => {
            if (activeTab === "treatments") {
              setTreatmentFormData({
                id: null,
                tag_id: "",
                symptoms: "",
                diagnosis: "",
                treatment: "",
                healthStatus: "Pending",
                cost: "",
                startDate: new Date().toISOString().split("T")[0],
                remarks: "",
              });
            } else {
              setVaccineFormData({
                id: null,
                tag_id: "",
                vaccinationName: "",
                batchNo: "",
                manufactureDate: "",
                expiryDate: "",
                treatmentOrStatus: "Completed",
                remarks: "",
              });
            }
            setShowForm(true);
          }}
          className="bg-[#16223F] hover:bg-[#2a3f75] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
        >
          <span>+ Add {activeTab === "treatments" ? "Treatment Log" : "Vaccination Log"}</span>
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h4 className="text-xs font-black text-gray-400 uppercase">Vaccinations Done</h4>
          <p className="text-2xl font-black text-[#16223F] mt-1">{vaccinations.length}</p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-4 mb-5 border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab("treatments");
            setSearchQuery("");
          }}
          className={`pb-3 text-sm font-black transition-all ${
            activeTab === "treatments"
              ? "border-b-2 border-[#16223F] text-[#16223F]"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          📋 Treatment Logs ({filteredTreatments.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("vaccinations");
            setSearchQuery("");
          }}
          className={`pb-3 text-sm font-black transition-all ${
            activeTab === "vaccinations"
              ? "border-b-2 border-[#16223F] text-[#16223F]"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          💉 Vaccination Logs ({filteredVaccinations.length})
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5">
        <input
          type="text"
          placeholder={`Search ${activeTab === "treatments" ? "treatments by tag, symptoms, status..." : "vaccinations by tag, name, batch..."}`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-4 text-sm font-semibold text-[#16223F] outline-none focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 transition-all duration-200"
        />
      </div>

      {/* CONTENT TABLE */}
      <div className="flex-1 overflow-auto border border-gray-200 rounded-xl shadow-sm bg-white relative">
        {activeTab === "treatments" ? (
          <>
            {!isLoading && filteredTreatments.length === 0 && (
              <div className="p-16 text-center">
                <h3 className="text-lg font-bold text-gray-700">No Treatments Logged</h3>
                <p className="text-gray-500 mt-2 text-sm">Create a new treatment log record above.</p>
              </div>
            )}
            {(isLoading || filteredTreatments.length > 0) && (
              <table className="w-full text-left min-w-[900px] relative">
                <thead className="sticky top-0 z-10 bg-gray-50 text-[#16223F] uppercase text-[10px] font-black tracking-widest shadow-sm">
                  <tr>
                    <th className="p-4 border-b">Animal Tag ID</th>
                    <th className="p-4 border-b">Symptoms</th>
                    <th className="p-4 border-b">Diagnosis</th>
                    <th className="p-4 border-b">Treatment</th>
                    <th className="p-4 border-b">Cost (₹)</th>
                    <th className="p-4 border-b">Date</th>
                    <th className="p-4 border-b text-center">Status</th>
                    <th className="p-4 border-b text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <SkeletonLoader type="table" columns={8} />
                  ) : (
                    filteredTreatments.map((log) => (
                      <tr key={log.id || log._id} className="hover:bg-[#D1867D]/5 transition-colors">
                        <td className="p-4 text-sm font-black text-black">🐄 {log.tag_id}</td>
                        <td className="p-4 text-sm font-bold text-gray-600 truncate max-w-[150px]">{log.symptoms}</td>
                        <td className="p-4 text-sm font-bold text-gray-600 truncate max-w-[150px]">{log.diagnosis || "-"}</td>
                        <td className="p-4 text-sm text-gray-500 truncate max-w-[150px]">{log.treatment}</td>
                        <td className="p-4 text-sm font-bold text-gray-800">₹{log.cost || 0}</td>
                        <td className="p-4 text-sm text-gray-500">
                          {log.startDate ? new Date(log.startDate).toLocaleDateString() : "-"}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`text-[10px] font-black px-2.5 py-1 rounded-full border shadow-sm ${
                              log.healthStatus === "Completed"
                                ? "text-emerald-600 bg-emerald-100/50 border-emerald-200/50"
                                : log.healthStatus === "Critical"
                                ? "text-red-600 bg-red-100/50 border-red-200/50 animate-pulse"
                                : "text-amber-600 bg-amber-100/50 border-amber-200/50"
                            }`}
                          >
                            {log.healthStatus || "Pending"}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleEditTreatment(log)}
                              className="text-[11px] bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold px-2.5 py-1.5 rounded-lg border border-slate-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTreatment(log.id || log._id)}
                              className="text-[11px] bg-red-50 text-red-600 hover:bg-red-100 font-bold px-2.5 py-1.5 rounded-lg border border-red-100"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </>
        ) : (
          <>
            {!isLoading && filteredVaccinations.length === 0 && (
              <div className="p-16 text-center">
                <h3 className="text-lg font-bold text-gray-700">No Vaccinations Logged</h3>
                <p className="text-gray-500 mt-2 text-sm">Create a new vaccination record above.</p>
              </div>
            )}
            {(isLoading || filteredVaccinations.length > 0) && (
              <table className="w-full text-left min-w-[900px] relative">
                <thead className="sticky top-0 z-10 bg-gray-50 text-[#16223F] uppercase text-[10px] font-black tracking-widest shadow-sm">
                  <tr>
                    <th className="p-4 border-b">Animal Tag ID</th>
                    <th className="p-4 border-b">Vaccine Name</th>
                    <th className="p-4 border-b">Batch No</th>
                    <th className="p-4 border-b">Mfg Date</th>
                    <th className="p-4 border-b">Expiry Date</th>
                    <th className="p-4 border-b text-center">Status</th>
                    <th className="p-4 border-b text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <SkeletonLoader type="table" columns={7} />
                  ) : (
                    filteredVaccinations.map((log) => (
                      <tr key={log.id || log._id} className="hover:bg-[#D1867D]/5 transition-colors">
                        <td className="p-4 text-sm font-black text-black">🐄 {log.tag_id}</td>
                        <td className="p-4 text-sm font-bold text-gray-600">{log.vaccinationName}</td>
                        <td className="p-4 text-sm font-bold text-gray-500">{log.batchNo || "-"}</td>
                        <td className="p-4 text-sm text-gray-500">
                          {log.manufactureDate ? new Date(log.manufactureDate).toLocaleDateString() : "-"}
                        </td>
                        <td className="p-4 text-sm text-gray-500">
                          {log.expiryDate ? new Date(log.expiryDate).toLocaleDateString() : "-"}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`text-[10px] font-black px-2.5 py-1 rounded-full border shadow-sm ${
                              log.treatmentOrStatus === "Completed"
                                ? "text-emerald-600 bg-emerald-100/50 border-emerald-200/50"
                                : "text-amber-600 bg-amber-100/50 border-amber-200/50"
                            }`}
                          >
                            {log.treatmentOrStatus || "Completed"}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleEditVaccine(log)}
                              className="text-[11px] bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold px-2.5 py-1.5 rounded-lg border border-slate-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteVaccine(log.id || log._id)}
                              className="text-[11px] bg-red-50 text-red-600 hover:bg-red-100 font-bold px-2.5 py-1.5 rounded-lg border border-red-100"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </>
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
              {activeTab === "treatments"
                ? treatmentFormData.id ? "Edit Treatment Log" : "Log Animal Treatment"
                : vaccineFormData.id ? "Edit Vaccination Log" : "Log Immunization Event"}
            </h2>

            {activeTab === "treatments" ? (
              <form onSubmit={handleSaveTreatment} className="space-y-4">
                {/* tag_id */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Animal Tag ID *</label>
                  <input
                    type="text"
                    name="tag_id"
                    value={treatmentFormData.tag_id}
                    onChange={handleTreatmentChange}
                    placeholder="e.g. CO-892"
                    className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                  />
                </div>

                {/* Symptoms */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Symptoms *</label>
                  <input
                    type="text"
                    name="symptoms"
                    value={treatmentFormData.symptoms}
                    onChange={handleTreatmentChange}
                    placeholder="e.g. Cough, High Temperature"
                    className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                  />
                </div>

                {/* Diagnosis */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Diagnosis / Health Condition</label>
                  <input
                    type="text"
                    name="diagnosis"
                    value={treatmentFormData.diagnosis}
                    onChange={handleTreatmentChange}
                    placeholder="e.g. Mild Pneumonia"
                    className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                  />
                </div>

                {/* Treatment */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Treatment / Action Taken *</label>
                  <input
                    type="text"
                    name="treatment"
                    value={treatmentFormData.treatment}
                    onChange={handleTreatmentChange}
                    placeholder="e.g. Administered antibiotic booster"
                    className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                  />
                </div>

                {/* Cost */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Total Treatment Cost (₹)</label>
                  <input
                    type="number"
                    name="cost"
                    value={treatmentFormData.cost}
                    onChange={handleTreatmentChange}
                    placeholder="e.g. 1200"
                    className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                  />
                </div>

                {/* startDate */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Log Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={treatmentFormData.startDate}
                    onChange={handleTreatmentChange}
                    className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                  />
                </div>

                {/* healthStatus */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Current Health Status</label>
                  <select
                    name="healthStatus"
                    value={treatmentFormData.healthStatus}
                    onChange={handleTreatmentChange}
                    className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Remarks / Notes</label>
                  <textarea
                    name="remarks"
                    rows={2}
                    value={treatmentFormData.remarks}
                    onChange={handleTreatmentChange}
                    className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437] resize-none"
                  />
                </div>

                <div className="flex gap-4 mt-6 pt-4 border-t border-[#edf1f7]">
                  <button
                    type="submit"
                    disabled={isLoadingForm}
                    className="flex-1 bg-[#071437] hover:bg-[#0d1f4d] text-white py-3.5 rounded-xl font-black text-sm shadow-md transition-all disabled:opacity-50"
                  >
                    {isLoadingForm ? "Saving..." : "Save Treatment Entry"}
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
            ) : (
              <form onSubmit={handleSaveVaccine} className="space-y-4">
                {/* tag_id */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Animal Tag ID *</label>
                  <input
                    type="text"
                    name="tag_id"
                    value={vaccineFormData.tag_id}
                    onChange={handleVaccineChange}
                    placeholder="e.g. CO-892"
                    className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                  />
                </div>

                {/* Vaccine Name */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Vaccine Name *</label>
                  <input
                    type="text"
                    name="vaccinationName"
                    value={vaccineFormData.vaccinationName}
                    onChange={handleVaccineChange}
                    placeholder="e.g. Foot & Mouth Disease (FMD)"
                    className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                  />
                </div>

                {/* Batch No */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Batch Number</label>
                  <input
                    type="text"
                    name="batchNo"
                    value={vaccineFormData.batchNo}
                    onChange={handleVaccineChange}
                    placeholder="e.g. BAT-908"
                    className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                  />
                </div>

                {/* manufactureDate */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Manufacture Date</label>
                  <input
                    type="date"
                    name="manufactureDate"
                    value={vaccineFormData.manufactureDate}
                    onChange={handleVaccineChange}
                    className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                  />
                </div>

                {/* expiryDate */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Expiry Date</label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={vaccineFormData.expiryDate}
                    onChange={handleVaccineChange}
                    className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                  />
                </div>

                {/* treatmentOrStatus */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Immunization Status</label>
                  <select
                    name="treatmentOrStatus"
                    value={vaccineFormData.treatmentOrStatus}
                    onChange={handleVaccineChange}
                    className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                  >
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Remarks</label>
                  <textarea
                    name="remarks"
                    rows={2}
                    value={vaccineFormData.remarks}
                    onChange={handleVaccineChange}
                    className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437] resize-none"
                  />
                </div>

                <div className="flex gap-4 mt-6 pt-4 border-t border-[#edf1f7]">
                  <button
                    type="submit"
                    disabled={isLoadingForm}
                    className="flex-1 bg-[#071437] hover:bg-[#0d1f4d] text-white py-3.5 rounded-xl font-black text-sm shadow-md transition-all disabled:opacity-50"
                  >
                    {isLoadingForm ? "Saving..." : "Save Immunization Log"}
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthManagementPg;
