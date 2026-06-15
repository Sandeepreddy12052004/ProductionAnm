import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";
import SkeletonLoader from "./SkeletonLoader";

const HealthManagementPg = () => {
  const [activeTab, setActiveTab] = useState("treatments");
  const [treatments, setTreatments] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Treatment Form state
  const [treatmentFormData, setTreatmentFormData] = useState({
    id: null,
    symptoms: "",
    diagnosis: "",
  });
  const [selectedMedicines, setSelectedMedicines] = useState([""]);

  // Vaccination Form state (Tag ID is set to GENERAL silently)
  const [vaccineFormData, setVaccineFormData] = useState({
    id: null,
    tag_id: "GENERAL",
    vaccinationName: "",
    batchNo: "",
    manufactureDate: "",
    expiryDate: "",
  });

  // Medicine Form state
  const [medicineFormData, setMedicineFormData] = useState({
    id: null,
    name: "",
    type: "Injection",
    description: "",
    status: true,
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [treatmentData, vaccinationData, medicineData] = await Promise.all([
        api.treatments.getAll(),
        api.health.vaccines.getAll(),
        api.medicines.getAll(),
      ]);
      setTreatments(treatmentData || []);
      setVaccinations(vaccinationData || []);
      setMedicines(medicineData || []);
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to retrieve health records.");
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

  const handleMedicineChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMedicineFormData({
      ...medicineFormData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSaveTreatment = async (e) => {
    e.preventDefault();
    if (!treatmentFormData.symptoms.trim()) {
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
      const payload = {
        symptoms: treatmentFormData.symptoms.trim(),
        diagnosis: treatmentFormData.diagnosis.trim(),
        treatment: treatmentString,
      };

      if (treatmentFormData.id) {
        await api.treatments.update(treatmentFormData.id, payload);
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

  const handleSaveVaccine = async (e) => {
    e.preventDefault();
    if (!vaccineFormData.vaccinationName.trim()) {
      swalError("Error", "Vaccine name is required");
      return;
    }

    setIsLoadingForm(true);
    try {
      const payload = {
        vaccinationName: vaccineFormData.vaccinationName.trim(),
        batchNo: vaccineFormData.batchNo.trim(),
        manufactureDate: vaccineFormData.manufactureDate || null,
        expiryDate: vaccineFormData.expiryDate || null,
      };

      if (vaccineFormData.id) {
        await api.health.vaccines.update(vaccineFormData.id, payload);
        swalSuccess("Success", "Vaccine updated successfully");
      } else {
        await api.health.vaccines.create(payload);
        swalSuccess("Success", "Vaccine added successfully");
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", typeof err === "string" ? err : "Failed to save vaccine.");
    } finally {
      setIsLoadingForm(false);
    }
  };

  const handleSaveMedicine = async (e) => {
    e.preventDefault();
    if (!medicineFormData.name.trim()) {
      swalError("Error", "Medicine Name is required");
      return;
    }

    setIsLoadingForm(true);
    try {
      const payload = {
        name: medicineFormData.name.trim(),
        type: medicineFormData.type || "Injection",
        description: medicineFormData.description.trim(),
        status: medicineFormData.status,
      };

      if (medicineFormData.id) {
        await api.medicines.update(medicineFormData.id, payload);
        swalSuccess("Success", "Medicine updated successfully");
      } else {
        await api.medicines.create(payload);
        swalSuccess("Success", "Medicine added successfully");
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", typeof err === "string" ? err : "Failed to save medicine.");
    } finally {
      setIsLoadingForm(false);
    }
  };

  const handleEditTreatment = (log) => {
    setTreatmentFormData({
      id: log.id || log._id,
      symptoms: log.symptoms || "",
      diagnosis: log.diagnosis || "",
    });
    const medsArray = log.treatment ? log.treatment.split(",").map(s => s.trim()).filter(Boolean) : [];
    setSelectedMedicines(medsArray.length > 0 ? medsArray : [""]);
    setActiveTab("treatments");
    setShowForm(true);
  };

  const handleEditVaccine = (log) => {
    const mfgDate = log.manufactureDate ? new Date(log.manufactureDate).toISOString().split("T")[0] : "";
    const expDate = log.expiryDate ? new Date(log.expiryDate).toISOString().split("T")[0] : "";
    setVaccineFormData({
      id: log.id || log._id,
      tag_id: "GENERAL",
      vaccinationName: log.vaccinationName || "",
      batchNo: log.batchNo || "",
      manufactureDate: mfgDate,
      expiryDate: expDate,
    });
    setActiveTab("vaccinations");
    setShowForm(true);
  };

  const handleEditMedicine = (med) => {
    setMedicineFormData({
      id: med.id || med._id,
      name: med.name || "",
      type: med.type || "Injection",
      description: med.description || "",
      status: med.status !== undefined ? med.status : true,
    });
    setActiveTab("medicines");
    setShowForm(true);
  };

  const handleDeleteTreatment = async (id) => {
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

  const handleDeleteVaccine = async (id) => {
    const confirmed = await swalConfirm("Delete Vaccine?", "Are you sure you want to delete this vaccine? This action cannot be undone.");
    if (!confirmed) return;

    try {
      await api.health.vaccines.delete(id);
      swalSuccess("Deleted", "Vaccine removed successfully");
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to delete vaccine");
    }
  };

  const handleDeleteMedicine = async (id) => {
    const confirmed = await swalConfirm("Delete Medicine?", "Are you sure you want to delete this medicine from the registry?");
    if (!confirmed) return;

    try {
      await api.medicines.delete(id);
      swalSuccess("Deleted", "Medicine deleted successfully");
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to delete medicine");
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

  const filteredVaccinations = vaccinations.filter((v) => {
    const query = searchQuery.toLowerCase();
    return (
      (v.vaccinationName || "").toLowerCase().includes(query) ||
      (v.batchNo || "").toLowerCase().includes(query)
    );
  });

  const filteredMedicines = medicines.filter((m) => {
    const query = searchQuery.toLowerCase();
    return (
      (m.name || "").toLowerCase().includes(query) ||
      (m.description || "").toLowerCase().includes(query)
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
                symptoms: "",
                diagnosis: "",
              });
              setSelectedMedicines([""]);
            } else if (activeTab === "vaccinations") {
              setVaccineFormData({
                id: null,
                tag_id: "GENERAL",
                vaccinationName: "",
                batchNo: "",
                manufactureDate: "",
                expiryDate: "",
              });
            } else {
              setMedicineFormData({
                id: null,
                name: "",
                type: "Injection",
                description: "",
                status: true,
              });
            }
            setShowForm(true);
          }}
          className="bg-[#16223F] hover:bg-[#2a3f75] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
        >
          <span>
            + Add{" "}
            {activeTab === "treatments"
              ? "Treatment Record"
              : activeTab === "vaccinations"
              ? "Vaccine"
              : "Medicine"}
          </span>
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h4 className="text-xs font-black text-gray-400 uppercase">Total Treatments</h4>
          <p className="text-2xl font-black text-[#16223F] mt-1">{treatments.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h4 className="text-xs font-black text-gray-400 uppercase">Registered Vaccines</h4>
          <p className="text-2xl font-black text-[#16223F] mt-1">{vaccinations.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h4 className="text-xs font-black text-gray-400 uppercase">Registered Medicines</h4>
          <p className="text-2xl font-black text-emerald-600 mt-1">{medicines.length}</p>
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
          📋 Treatment Management ({filteredTreatments.length})
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
          💉 Vaccination Management ({filteredVaccinations.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("medicines");
            setSearchQuery("");
          }}
          className={`pb-3 text-sm font-black transition-all ${
            activeTab === "medicines"
              ? "border-b-2 border-[#16223F] text-[#16223F]"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          💊 Medicine Management ({filteredMedicines.length})
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5">
        <input
          type="text"
          placeholder={
            activeTab === "treatments"
              ? "Search treatments by symptoms, diagnosis, medicines..."
              : activeTab === "vaccinations"
              ? "Search vaccines by name, batch..."
              : "Search medicines by name, description..."
          }
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
        ) : activeTab === "vaccinations" ? (
          <>
            {!isLoading && filteredVaccinations.length === 0 && (
              <div className="p-16 text-center">
                <h3 className="text-lg font-bold text-gray-700">No Vaccines Registered</h3>
                <p className="text-gray-500 mt-2 text-sm">Create a new vaccine record above.</p>
              </div>
            )}
            {(isLoading || filteredVaccinations.length > 0) && (
              <table className="w-full text-left min-w-[700px] relative">
                <thead className="sticky top-0 z-10 bg-gray-50 text-[#16223F] uppercase text-[10px] font-black tracking-widest shadow-sm">
                  <tr>
                    <th className="p-4 border-b">Vaccine Name</th>
                    <th className="p-4 border-b">Batch No</th>
                    <th className="p-4 border-b">Mfg Date</th>
                    <th className="p-4 border-b">Expiry Date</th>
                    <th className="p-4 border-b text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <SkeletonLoader type="table" columns={5} />
                  ) : (
                    filteredVaccinations.map((log) => (
                      <tr key={log.id || log._id} className="hover:bg-[#D1867D]/5 transition-colors">
                        <td className="p-4 text-sm font-bold text-gray-600">{log.vaccinationName}</td>
                        <td className="p-4 text-sm font-bold text-gray-500">{log.batchNo || "-"}</td>
                        <td className="p-4 text-sm text-gray-500">
                          {log.manufactureDate ? new Date(log.manufactureDate).toLocaleDateString() : "-"}
                        </td>
                        <td className="p-4 text-sm text-gray-500">
                          {log.expiryDate ? new Date(log.expiryDate).toLocaleDateString() : "-"}
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
        ) : (
          <>
            {!isLoading && filteredMedicines.length === 0 && (
              <div className="p-16 text-center">
                <h3 className="text-lg font-bold text-gray-700">No Medicines Registered</h3>
                <p className="text-gray-500 mt-2 text-sm">Add a new medicine to the registry above.</p>
              </div>
            )}
            {(isLoading || filteredMedicines.length > 0) && (
              <table className="w-full text-left min-w-[600px] relative">
                <thead className="sticky top-0 z-10 bg-gray-50 text-[#16223F] uppercase text-[10px] font-black tracking-widest shadow-sm">
                  <tr>
                    <th className="p-4 border-b">Medicine Name</th>
                    <th className="p-4 border-b">Type</th>
                    <th className="p-4 border-b">Description</th>
                    <th className="p-4 border-b text-center">Status</th>
                    <th className="p-4 border-b text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <SkeletonLoader type="table" columns={5} />
                  ) : (
                    filteredMedicines.map((med) => (
                      <tr key={med.id || med._id} className="hover:bg-[#D1867D]/5 transition-colors">
                        <td className="p-4 text-sm font-black text-black">💊 {med.name}</td>
                        <td className="p-4 text-sm font-semibold text-gray-700">{med.type || "-"}</td>
                        <td className="p-4 text-sm font-bold text-gray-600">{med.description || "-"}</td>
                        <td className="p-4 text-center">
                          <span
                            className={`text-[10px] font-black px-2.5 py-1 rounded-full border shadow-sm ${
                              med.status !== false
                                ? "text-emerald-600 bg-emerald-100/50 border-emerald-200/50"
                                : "text-slate-600 bg-slate-100/50 border-slate-200/50"
                            }`}
                          >
                            {med.status !== false ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleEditMedicine(med)}
                              className="text-[11px] bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold px-2.5 py-1.5 rounded-lg border border-slate-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteMedicine(med.id || med._id)}
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
                ? treatmentFormData.id ? "Edit Treatment Record" : "Add Treatment Record"
                : activeTab === "vaccinations"
                ? vaccineFormData.id ? "Edit Vaccine" : "Add Vaccine"
                : medicineFormData.id ? "Edit Medicine" : "Add New Medicine"}
            </h2>

            {activeTab === "treatments" ? (
              <form onSubmit={handleSaveTreatment} className="space-y-4">
                {/* Symptoms */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Symptoms *</label>
                  <input
                    type="text"
                    name="symptoms"
                    value={treatmentFormData.symptoms}
                    onChange={handleTreatmentChange}
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
                    value={treatmentFormData.diagnosis}
                    onChange={handleTreatmentChange}
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
            ) : activeTab === "vaccinations" ? (
              <form onSubmit={handleSaveVaccine} className="space-y-4">
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

                <div className="flex gap-4 mt-6 pt-4 border-t border-[#edf1f7]">
                  <button
                    type="submit"
                    disabled={isLoadingForm}
                    className="flex-1 bg-[#071437] hover:bg-[#0d1f4d] text-white py-3.5 rounded-xl font-black text-sm shadow-md transition-all disabled:opacity-50"
                  >
                    {isLoadingForm ? "Saving..." : "Save Vaccine"}
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
              <form onSubmit={handleSaveMedicine} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Medicine Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={medicineFormData.name}
                    onChange={handleMedicineChange}
                    placeholder="e.g. Paracetamol"
                    className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Type *</label>
                  <select
                    name="type"
                    value={medicineFormData.type || "Injection"}
                    onChange={handleMedicineChange}
                    className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                  >
                    <option value="Injection">Injection</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Liquid">Liquid</option>
                    <option value="Powder">Powder</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block mb-1.5 text-xs font-bold text-[#53698c] uppercase tracking-wider">Description</label>
                  <input
                    type="text"
                    name="description"
                    value={medicineFormData.description}
                    onChange={handleMedicineChange}
                    placeholder="e.g. Pain reliever and fever reducer"
                    className="w-full border border-[#dbe4f0] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                  />
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    id="medicineStatusCheckbox"
                    name="status"
                    checked={medicineFormData.status}
                    onChange={handleMedicineChange}
                    className="w-4 h-4 text-[#071437] border-gray-300 rounded focus:ring-[#071437]"
                  />
                  <label htmlFor="medicineStatusCheckbox" className="text-sm font-bold text-[#071437] cursor-pointer">
                     Active (Available for stock logging)
                  </label>
                </div>

                <div className="flex gap-4 mt-6 pt-4 border-t border-[#edf1f7]">
                  <button
                    type="submit"
                    disabled={isLoadingForm}
                    className="flex-1 bg-[#071437] hover:bg-[#0d1f4d] text-white py-3.5 rounded-xl font-black text-sm shadow-md transition-all disabled:opacity-50"
                  >
                    {isLoadingForm ? "Saving..." : "Save Medicine"}
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
