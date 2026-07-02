import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";
import SkeletonLoader from "./SkeletonLoader";
import ModulePageHeader from "./ModulePageHeader";
import { 
  Briefcase, 
  Users, 
  MapPin, 
  Phone, 
  Check, 
  X, 
  Edit3, 
  Trash2, 
  Plus, 
  Search, 
  ArrowRight, 
  Layers,
  Activity
} from "lucide-react";

export default function LaborManagementPg() {
  const [activeTab, setActiveTab] = useState("labors"); // "labors" or "designations"
  const [labors, setLabors] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [farms, setFarms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showLaborForm, setShowLaborForm] = useState(false);
  const [showDesignationForm, setShowDesignationForm] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);

  // Form States
  const [laborForm, setLaborForm] = useState({
    id: null,
    name: "",
    designationId: "",
    farmId: "",
    phone: "",
    status: "ACTIVE",
  });

  const [designationForm, setDesignationForm] = useState({
    id: null,
    name: "",
    description: "",
    status: "ACTIVE",
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Parallel fetches for efficiency
      const [laborsRes, designationsRes, farmsRes] = await Promise.all([
        api.labors.getAll(),
        api.designations.getAll(),
        api.farms.getAll(),
      ]);

      setLabors(Array.isArray(laborsRes) ? laborsRes : (laborsRes?.data ?? []));
      setDesignations(Array.isArray(designationsRes) ? designationsRes : (designationsRes?.data ?? []));
      setFarms(Array.isArray(farmsRes) ? farmsRes : (farmsRes?.data ?? []));
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to retrieve labor management records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Designation Methods ──────────────────────────────────────────────────
  const handleSaveDesignation = async (e) => {
    e.preventDefault();
    if (!designationForm.name.trim()) {
      swalError("Validation Error", "Designation name is required");
      return;
    }

    setIsLoadingForm(true);
    try {
      const payload = {
        name: designationForm.name.trim(),
        description: designationForm.description.trim(),
        status: designationForm.status,
      };

      if (designationForm.id) {
        await api.designations.update(designationForm.id, payload);
        swalSuccess("Success", "Designation updated successfully");
      } else {
        await api.designations.create(payload);
        swalSuccess("Success", "New designation registered successfully");
      }
      setShowDesignationForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", typeof err === "string" ? err : "Failed to save designation");
    } finally {
      setIsLoadingForm(false);
    }
  };

  const handleEditDesignation = (des) => {
    setDesignationForm({
      id: des._id || des.id,
      name: des.name || "",
      description: des.description || "",
      status: des.status || "ACTIVE",
    });
    setShowDesignationForm(true);
  };

  const handleDeleteDesignation = async (id) => {
    // Check if any labor uses this designation
    const count = labors.filter(l => (l.designationId?._id || l.designationId) === id).length;
    if (count > 0) {
      swalError("Cannot Delete", `This designation is currently assigned to ${count} active labor employee(s).`);
      return;
    }

    const confirmed = await swalConfirm("Delete Designation?", "Are you sure you want to permanently delete this designation?");
    if (!confirmed) return;

    try {
      await api.designations.delete(id);
      swalSuccess("Deleted", "Designation soft-deleted successfully");
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to delete designation");
    }
  };

  // ── Labor Methods ────────────────────────────────────────────────────────
  const handleSaveLabor = async (e) => {
    e.preventDefault();
    if (!laborForm.name.trim()) {
      swalError("Validation Error", "Employee name is required");
      return;
    }
    if (!laborForm.designationId) {
      swalError("Validation Error", "Designation selection is required");
      return;
    }
    if (!laborForm.farmId) {
      swalError("Validation Error", "Dairy farm assignment is required");
      return;
    }

    setIsLoadingForm(true);
    try {
      const payload = {
        name: laborForm.name.trim(),
        designationId: laborForm.designationId,
        farmId: laborForm.farmId,
        phone: laborForm.phone.trim(),
        status: laborForm.status,
      };

      if (laborForm.id) {
        await api.labors.update(laborForm.id, payload);
        swalSuccess("Success", "Labor employee records updated successfully");
      } else {
        await api.labors.create(payload);
        swalSuccess("Success", "New labor employee registered successfully");
      }
      setShowLaborForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", typeof err === "string" ? err : "Failed to register labor details");
    } finally {
      setIsLoadingForm(false);
    }
  };

  const handleEditLabor = (lab) => {
    setLaborForm({
      id: lab._id || lab.id,
      name: lab.name || "",
      designationId: lab.designationId?._id || lab.designationId || "",
      farmId: lab.farmId?._id || lab.farmId || "",
      phone: lab.phone || "",
      status: lab.status || "ACTIVE",
    });
    setShowLaborForm(true);
  };

  const handleDeleteLabor = async (id) => {
    const confirmed = await swalConfirm("Delete Employee?", "Are you sure you want to permanently delete this employee record?");
    if (!confirmed) return;

    try {
      await api.labors.delete(id);
      swalSuccess("Deleted", "Employee record soft-deleted successfully");
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to delete employee");
    }
  };

  // Filter lists based on search bar queries
  const filteredLabors = labors.filter((l) => {
    const nameStr = String(l.name || "").toLowerCase();
    const phoneStr = String(l.phone || "").toLowerCase();
    const designationStr = String(l.designationId?.name || "").toLowerCase();
    const farmStr = String(l.farmId?.name || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return nameStr.includes(query) || phoneStr.includes(query) || designationStr.includes(query) || farmStr.includes(query);
  });

  const filteredDesignations = designations.filter((d) => {
    const nameStr = String(d.name || "").toLowerCase();
    const descStr = String(d.description || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return nameStr.includes(query) || descStr.includes(query);
  });

  // Calculate counters
  const totalEmployees = labors.filter(l => l.status === "ACTIVE").length;
  const totalDesignations = designations.filter(d => d.status === "ACTIVE").length;
  const uniqueFarmAssignments = new Set(labors.map(l => l.farmId?._id || l.farmId).filter(Boolean)).size;

  return (
    <div className="p-6 md:p-8 min-h-screen bg-slate-50/50">
      {/* Page Header */}
      <ModulePageHeader
        title="Labor & Designation"
        description="Configure staff roles, register employees, and track workforce placement across active dairy farms."
        actionButton={
          <button
            onClick={() => {
              if (activeTab === "labors") {
                setLaborForm({ id: null, name: "", designationId: "", farmId: "", phone: "", status: "ACTIVE" });
                setShowLaborForm(true);
              } else {
                setDesignationForm({ id: null, name: "", description: "", status: "ACTIVE" });
                setShowDesignationForm(true);
              }
            }}
            className="bg-[#16223F] hover:bg-[#2a3f75] text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-sm transition-all duration-200 active:scale-95 cursor-pointer text-sm"
          >
            <Plus className="w-5 h-5" />
            {activeTab === "labors" ? "Register Employee" : "Add Designation"}
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Employees</p>
            <h3 className="text-2xl font-black text-[#16223F] mt-1">{totalEmployees}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Designations</p>
            <h3 className="text-2xl font-black text-[#16223F] mt-1">{totalDesignations}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <MapPin className="w-7 h-7" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Farms Mapped</p>
            <h3 className="text-2xl font-black text-[#16223F] mt-1">{uniqueFarmAssignments}</h3>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-10">
        {/* Navigation & Search Subheader */}
        <div className="flex flex-col md:flex-row md:items-center justify-between p-5 border-b border-slate-100 gap-4 bg-slate-50/20">
          {/* Aesthetic Toggle Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl self-start">
            <button
              onClick={() => {
                setActiveTab("labors");
                setSearchQuery("");
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "labors"
                  ? "bg-white text-[#16223F] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Employees ({labors.length})
            </button>
            <button
              onClick={() => {
                setActiveTab("designations");
                setSearchQuery("");
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "designations"
                  ? "bg-white text-[#16223F] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Designations ({designations.length})
            </button>
          </div>

          {/* Search Inputs */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${activeTab === "labors" ? "employees, farms..." : "designations..."}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 border border-slate-200/50 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-[#16223F] outline-none focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 transition-all duration-200"
            />
          </div>
        </div>

        {/* Content Lists */}
        {isLoading ? (
          <div className="p-8">
            <SkeletonLoader rows={5} columns={activeTab === "labors" ? 5 : 4} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === "labors" ? (
              // EMPLOYEE LABORS LIST TABLE
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/40 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Designation</th>
                    <th className="py-4 px-6">Contact Phone</th>
                    <th className="py-4 px-6">Assigned Dairy Farm</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLabors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-bold text-sm">
                        No employee records found. Click "Register Employee" to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredLabors.map((lab) => (
                      <tr key={lab._id || lab.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-extrabold text-[#16223F] text-sm">
                          {lab.name}
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-600 font-bold">
                          {lab.designationId?.name || (
                            <span className="text-red-400 font-medium italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-600 font-bold">
                          {lab.phone || (
                            <span className="text-slate-300 font-semibold">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-600 font-bold">
                          {lab.farmId?.name || (
                            <span className="text-red-400 font-medium italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider ${
                              lab.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${lab.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"}`} />
                            {lab.status === "ACTIVE" ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex justify-center items-center gap-2">
                            <button
                              onClick={() => handleEditLabor(lab)}
                              className="p-2 text-slate-400 hover:text-[#16223F] bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                              title="Edit Employee"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteLabor(lab._id || lab.id)}
                              className="p-2 text-red-400 hover:text-red-600 bg-red-50/50 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              // DESIGNATIONS LIST TABLE
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/40 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
                    <th className="py-4 px-6">Designation Title</th>
                    <th className="py-4 px-6">Description</th>
                    <th className="py-4 px-6">Staff Count</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDesignations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-bold text-sm">
                        No designations found. Click "Add Designation" to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredDesignations.map((des) => {
                      const staffCount = labors.filter(l => (l.designationId?._id || l.designationId) === (des._id || des.id)).length;
                      return (
                        <tr key={des._id || des.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6 font-extrabold text-[#16223F] text-sm">
                            {des.name}
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-500 font-bold">
                            {des.description || (
                              <span className="text-slate-300 font-semibold italic">No description</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-sm text-[#16223F] font-black">
                            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-black">
                              {staffCount} Mapped
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider ${
                                des.status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${des.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"}`} />
                              {des.status === "ACTIVE" ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex justify-center items-center gap-2">
                              <button
                                onClick={() => handleEditDesignation(des)}
                                className="p-2 text-slate-400 hover:text-[#16223F] bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                title="Edit Designation"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteDesignation(des._id || des.id)}
                                className="p-2 text-red-400 hover:text-red-600 bg-red-50/50 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                title="Delete Designation"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── Employee Registration / Edit Modal ────────────────────────────────── */}
      {showLaborForm && (
        <div className="fixed inset-0 bg-[#16223F]/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white p-7 rounded-3xl shadow-2xl w-full max-w-[500px] border border-slate-100 relative">
            <button
              onClick={() => setShowLaborForm(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-all font-bold cursor-pointer"
              type="button"
            >
              ✕
            </button>

            <h2 className="text-xl font-extrabold mb-5 text-[#16223F] tracking-tight">
              {laborForm.id ? "Update Employee Details" : "Register Labor Employee"}
            </h2>

            <form onSubmit={handleSaveLabor} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Employee Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={laborForm.name}
                  onChange={(e) => setLaborForm({ ...laborForm, name: e.target.value })}
                  placeholder="Enter employee name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Select Designation <span className="text-red-500">*</span>
                </label>
                <select
                  name="designationId"
                  required
                  value={laborForm.designationId}
                  onChange={(e) => setLaborForm({ ...laborForm, designationId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:bg-white focus:border-[#D1867D] transition-all"
                >
                  <option value="">Choose role designation</option>
                  {designations.map((d) => (
                    <option key={d._id || d.id} value={d._id || d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Assign Dairy Farm <span className="text-red-500">*</span>
                </label>
                <select
                  name="farmId"
                  required
                  value={laborForm.farmId}
                  onChange={(e) => setLaborForm({ ...laborForm, farmId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:bg-white focus:border-[#D1867D] transition-all"
                >
                  <option value="">Select dairy farm</option>
                  {farms.map((f) => (
                    <option key={f._id || f.id} value={f._id || f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  value={laborForm.phone}
                  onChange={(e) => setLaborForm({ ...laborForm, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:bg-white focus:border-[#D1867D] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Active Status
                </label>
                <select
                  name="status"
                  value={laborForm.status}
                  onChange={(e) => setLaborForm({ ...laborForm, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:bg-white focus:border-[#D1867D] transition-all"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isLoadingForm}
                  className="flex-1 bg-[#16223F] hover:bg-[#2a3f75] disabled:bg-slate-200 text-white hover:text-white py-3.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-sm text-sm"
                >
                  {isLoadingForm ? "Saving..." : "Save Details"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLaborForm(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3.5 rounded-xl font-bold transition-all active:scale-95 cursor-pointer text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Designation Creation / Edit Modal ───────────────────────────────── */}
      {showDesignationForm && (
        <div className="fixed inset-0 bg-[#16223F]/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white p-7 rounded-3xl shadow-2xl w-full max-w-[450px] border border-slate-100 relative">
            <button
              onClick={() => setShowDesignationForm(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-all font-bold cursor-pointer"
              type="button"
            >
              ✕
            </button>

            <h2 className="text-xl font-extrabold mb-5 text-[#16223F] tracking-tight">
              {designationForm.id ? "Update Designation Role" : "Add Designation Role"}
            </h2>

            <form onSubmit={handleSaveDesignation} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Designation Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={designationForm.name}
                  onChange={(e) => setDesignationForm({ ...designationForm, name: e.target.value })}
                  placeholder="e.g. Supervisor, Feeder, Milker"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Description / Notes
                </label>
                <textarea
                  name="description"
                  rows={3}
                  value={designationForm.description}
                  onChange={(e) => setDesignationForm({ ...designationForm, description: e.target.value })}
                  placeholder="Role description..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:bg-white focus:border-[#D1867D] transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Active Status
                </label>
                <select
                  name="status"
                  value={designationForm.status}
                  onChange={(e) => setDesignationForm({ ...designationForm, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold outline-none focus:bg-white focus:border-[#D1867D] transition-all"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isLoadingForm}
                  className="flex-1 bg-[#16223F] hover:bg-[#2a3f75] disabled:bg-slate-200 text-white hover:text-white py-3.5 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-sm text-sm"
                >
                  {isLoadingForm ? "Saving..." : "Save Role"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDesignationForm(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3.5 rounded-xl font-bold transition-all active:scale-95 cursor-pointer text-sm"
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
}
