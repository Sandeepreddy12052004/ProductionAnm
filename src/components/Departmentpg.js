import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";

const DepartmentPg = ({ moduleConfig }) => {

  const [departments, setDepartments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    status: true
  });

  const fetchDepartments = async () => {
    try {
      const data = await api.departments.getAll();
      setDepartments(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

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

    setIsLoading(true);
    try {
      await api.departments.create(formData);
      swalSuccess("Success", "Department created successfully");
      setFormData({ name: "", status: true });
      setShowForm(false);
      fetchDepartments();
    } catch (err) {
      console.error(err);
      swalError("Error", err.response?.data?.message || err.message || "Failed to create department");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await swalConfirm("Delete Department?", "This action cannot be undone.");
    if (!confirmed) return;
    
    try {
      await api.departments.delete(id);
      swalSuccess("Deleted", "Department deleted successfully");
      fetchDepartments();
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

      {/* TABLE CARD */}
      <div className="bg-white rounded-[30px] overflow-hidden border border-[#e3e8f2] shadow-sm">

        {/* TABLE HEADER */}
        <div className="grid grid-cols-3 px-6 py-4 bg-[#f8fafc]
        text-[#53698c] text-[11px] font-black uppercase tracking-wide">

          <div>Department</div>
          <div>Status</div>
          <div>Actions</div>
        </div>

        {/* DATA */}
        {departments.length > 0 ? (

          departments.map(dep => (

            <div
              key={dep.id}
              className="grid grid-cols-3 items-center
              px-6 py-5 border-t border-[#edf1f7]
              hover:bg-[#fafcff] transition-all"
            >

              {/* NAME */}
              <div className="font-bold text-sm text-[#071437]">
                {dep.name}
              </div>

              <div className="flex items-center">
                <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide
                  ${dep.status
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {dep.status ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-3">

                <button
                  onClick={() => handleDelete(dep._id || dep.id)}
                  className="px-3 py-1.5 rounded-xl
                  bg-blue-50 text-blue-600 font-bold
                  hover:bg-blue-100 transition-all"
                >
                  ✏ Edit
                </button>

                <button
                  onClick={() => handleDelete(dep.id)}
                  className="px-3 py-1.5 rounded-xl
                  bg-red-50 text-red-600 font-bold
                  hover:bg-red-100 transition-all"
                >
                  🗑 Delete
                </button>

              </div>

            </div>

          ))

        ) : (

          <div className="p-20 text-center text-[#94a3b8] font-semibold text-lg">
            No Departments Found
          </div>

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
                disabled={isLoading}
                className="flex-1 bg-[#071437] hover:bg-[#0d1f4d]
                text-white py-4 rounded-2xl
                font-black text-lg transition-all disabled:opacity-50"
              >
                {isLoading ? "Saving..." : "Save Department"}
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