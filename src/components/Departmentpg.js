import React, { useState } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";
import useSWR from 'swr';
import SkeletonLoader from './SkeletonLoader';

const DepartmentPg = ({ moduleConfig }) => {

  const [showForm, setShowForm] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    status: true
  });

  // SWR Caching Logic - Stale While Revalidate
  const fetcher = async () => {
    const data = await api.departments.getAll();
    return data || [];
  };

  const { data: departments, error, mutate, isLoading } = useSWR('departments_cache', fetcher, {
    revalidateOnFocus: false, // Prevents flashing when switching tabs
    dedupingInterval: 5000    // Cache for 5 seconds
  });

  const filteredDepartments = (departments || []).filter((dep) => {
    const query = searchQuery.toLowerCase();
    const name = (dep.name || "").toLowerCase();
    const status = dep.status === true ? "active" : "inactive";
    return name.includes(query) || status.includes(query);
  });

  const handleChange = (e) => {
    const value = e.target.name === 'status' 
      ? e.target.value === 'true'
      : e.target.value;

    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleSave = async () => {
    if (!formData.name) {
      swalError("Error", "Department Name is required");
      return;
    }

    setIsLoadingForm(true);
    try {
      await api.departments.create(formData);
      swalSuccess("Success", "Department created successfully");
      setFormData({ name: "", status: true });
      setShowForm(false);
      mutate(); // Trigger SWR revalidation
    } catch (err) {
      console.error(err);
      swalError("Error", err.response?.data?.message || err.message || "Failed to create department");
    } finally {
      setIsLoadingForm(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await swalConfirm("Delete Department?", "This action cannot be undone.");
    if (!confirmed) return;
    
    try {
      await api.departments.delete(id);
      swalSuccess("Deleted", "Department deleted successfully");
      mutate(); // Trigger SWR revalidation
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to delete department");
    }
  };

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col bg-transparent text-slate-800">
      <div className="flex-none flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#16223F] tracking-tight">
            Departments
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Create, view, edit, and delete departments.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({ name: "", status: true });
            setShowForm(true);
          }}
          className="bg-[#16223F] hover:bg-[#2a3f75] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
        >
          <span>+ Create New Department</span>
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            placeholder="Search departments by name, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-4 text-sm font-semibold text-[#16223F] outline-none focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 transition-all duration-200"
          />
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 font-medium flex items-center gap-3">
          ⚠️ {error}
        </div>
      )}

      {/* CONTENT WRAPPER */}
      <div className="flex-1 overflow-auto border border-gray-200 rounded-xl shadow-sm bg-white relative">

        {/* EMPTY STATE */}
        {!isLoading && filteredDepartments.length === 0 && (
          <div className="p-16 text-center">
            <h3 className="text-lg font-bold text-gray-700">
              No Departments Found
            </h3>
            <p className="text-gray-500 mt-2 text-sm">
              {!departments || departments.length === 0 
                ? "Get started by creating a new department above." 
                : "No departments match your search query."}
            </p>
          </div>
        )}

        {/* DATA TABLE */}
        {(isLoading || filteredDepartments.length > 0) && (
          <table className="w-full text-left min-w-[600px] relative">
            <thead className="sticky top-0 z-10 bg-gray-50 text-[#16223F] uppercase text-[10px] font-black tracking-widest shadow-sm">
              <tr>
                <th className="p-4 border-b">Department</th>
                <th className="p-4 border-b text-center">Status</th>
                <th className="p-4 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <SkeletonLoader type="table" columns={3} />
              ) : (
                filteredDepartments.map(dep => (
                <tr key={dep.id || dep._id} className="hover:bg-[#D1867D]/5 transition-colors">
                  <td className="p-4 text-sm font-bold text-black">{dep.name}</td>
                  <td className="p-4 text-center">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm border
                      ${dep.status === true 
                        ? 'text-emerald-600 bg-emerald-100/50 border-emerald-200/50' 
                        : 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                      {dep.status === true ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(dep.id || dep._id)}
                      className="text-[11px] bg-red-50 text-red-600 hover:bg-red-100 font-bold px-3 py-1.5 rounded-lg transition-colors border border-red-100 flex items-center gap-1.5 ml-auto"
                    >
                      <span>🗑️</span> Delete
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {showForm && (

        <div className="fixed inset-0 bg-black/40
        backdrop-blur-sm flex items-center justify-center z-50 p-4">

          <div className="bg-white rounded-[30px]
          p-8 w-full max-w-lg shadow-2xl relative">

            {/* CLOSE ICON */}
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-all font-bold"
            >
              ✕
            </button>

            <h2 className="text-3xl font-black text-[#071437] mb-8 pr-10">
              Create Department
            </h2>

            <div className="space-y-5">

              {/* NAME */}
              <div>
                <label className="block mb-2 text-sm font-bold text-[#53698c]">
                  Department Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Health & Treatment"
                  className="w-full border border-[#dbe4f0]
                  rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                />
              </div>

              {/* STATUS */}
              <div>
                <label className="block mb-2 text-sm font-bold text-[#53698c]">
                  Status
                </label>

                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full border border-[#dbe4f0]
                  rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437] appearance-none"
                >
                  <option value={true}>ACTIVE</option>
                  <option value={false}>INACTIVE</option>
                </select>
              </div>

            </div>

            {/* FOOTER */}
            <div className="flex gap-4 mt-10">

              <button
                onClick={handleSave}
                disabled={isLoadingForm}
                className="flex-1 bg-[#071437] hover:bg-[#0d1f4d]
                text-white py-4 rounded-2xl
                font-black text-lg transition-all disabled:opacity-50"
              >
                {isLoadingForm ? "Saving..." : "Save Department"}
              </button>

              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-[#eef2f7]
                hover:bg-[#e3e8f0]
                text-[#071437]
                py-4 rounded-2xl
                font-black text-lg transition-all"
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

export default DepartmentPg;