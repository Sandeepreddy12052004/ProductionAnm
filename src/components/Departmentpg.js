import React, { useState } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";
import useSWR from 'swr';

const DepartmentPg = ({ moduleConfig }) => {

  const [showForm, setShowForm] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);

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
    <div className="p-8 bg-[#f7f9fc] min-h-screen">

      {/* HEADER */}
      <div className="flex justify-between items-start mb-10">

        <div>
          <h1 className="text-2xl font-black text-[#071437] tracking-tight">
            Departments
          </h1>

          <p className="text-[#5d7399] mt-3 text-sm font-semibold">
            Create, view, edit, and delete departments.
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="bg-[#071437] hover:bg-[#0d1f4d]
          text-white px-5 py-2.5 rounded-2xl
          font-bold text-lg shadow-lg
          transition-all duration-200 hover:scale-[1.02]"
        >
          + Create New Department
        </button>
      </div>

        {/* LOADING SKELETON */}
        {isLoading && (
          <div className="bg-white rounded-[30px] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-[#eff3f8] animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
            <div className="h-10 bg-slate-100 rounded w-full mb-4"></div>
            <div className="h-10 bg-slate-100 rounded w-full mb-4"></div>
            <div className="h-10 bg-slate-100 rounded w-full"></div>
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && (!departments || departments.length === 0) && (
          <div className="bg-white rounded-[30px] p-16 shadow-[0_10px_30px_rgba(0,0,0,0.03)]
          border border-[#eff3f8] text-center">
            <h3 className="text-xl font-bold text-[#53698c]">
              No Departments Found
            </h3>
            <p className="text-[#899bb5] mt-2">
              Get started by creating a new department above.
            </p>
          </div>
        )}

        {/* DATA TABLE */}
        {!isLoading && departments && departments.length > 0 && (
          <div className="bg-white rounded-[30px] shadow-[0_10px_30px_rgba(0,0,0,0.03)]
          border border-[#eff3f8] overflow-hidden">

            {/* TABLE HEADER */}
            <div className="grid grid-cols-3 px-6 py-4 bg-[#f8fafc]
            text-[#53698c] text-[11px] font-black uppercase tracking-wide">
              <div>Department</div>
              <div>Status</div>
              <div>Actions</div>
            </div>

            {/* DATA */}
            {departments.map(dep => (
              <div
                key={dep.id || dep._id}
                className="grid grid-cols-3 items-center
                px-6 py-5 border-t border-[#edf1f7]
                hover:bg-[#fafcff] transition-all"
              >
                {/* NAME */}
                <div className="font-bold text-sm text-[#071437]">
                  {dep.name}
                </div>

                {/* STATUS */}
                <div className="flex items-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide
                    ${dep.status === true
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {dep.status === true ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                {/* ACTIONS */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDelete(dep.id || dep._id)}
                    className="px-3 py-1.5 rounded-xl
                    bg-red-50 text-red-600 font-bold
                    hover:bg-red-100 transition-all"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

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