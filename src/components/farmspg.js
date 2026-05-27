import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";
import SkeletonLoader from './SkeletonLoader';

const FarmsPg = () => {
  const router = useRouter();
  const [farms, setFarms] = useState([]);
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

  const fetchFarms = async () => {
    setIsFetching(true);
    try {
      const data = await api.farms.getAll();
      setFarms(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col bg-[#f7f9fc]">
      {/* HEADER */}
      <div className="flex-none flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#071437] tracking-tight">
            Farm Management
          </h1>
          <p className="text-[#5d7399] mt-3 text-sm font-semibold">
            Create, view, edit, and delete farms.
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: "", code: "", address: "", location: "" });
            setEditingId(null);
            setShowForm(true);
          }}
          className="bg-[#071437] hover:bg-[#0d1f4d]
          text-white px-5 py-2.5 rounded-2xl
          font-bold text-lg shadow-lg
          transition-all duration-200 hover:scale-[1.02]"
        >
          + Create New Farm
        </button>
      </div>

      {/* GRID LAYOUT */}
      <div className="flex-1 overflow-auto">
        {isFetching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonLoader type="block" height="h-32" />
            <SkeletonLoader type="block" height="h-32" />
            <SkeletonLoader type="block" height="h-32" />
          </div>
        ) : farms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {farms.map(farm => (
              <div
                key={farm._id || farm.id}
                onClick={() => router.push(`/farm/${farm.code.toLowerCase()}`)}
                className="bg-white rounded-[2rem] p-7 border border-[#e3e8f2] shadow-sm hover:shadow-2xl hover:shadow-[#16223F]/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col group relative overflow-hidden"
              >
                {/* Decorative background blob */}
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-[#f0f4f8] rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500 -z-10"></div>

                {/* Header section */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-[#071437] tracking-tight">{farm.name}</h3>
                    <p className="text-[#5d7399] font-bold text-sm tracking-widest uppercase mt-1">{farm.code}</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-[#f0f4f8] flex items-center justify-center text-3xl shadow-inner group-hover:-rotate-12 transition-transform duration-300">
                    🏠
                  </div>
                </div>

                {/* Body section */}
                <div className="flex items-start gap-3 mb-8 text-[#53698c] flex-1">
                  <span className="text-lg opacity-80 mt-0.5">📍</span>
                  <p className="font-semibold leading-relaxed">
                    {farm.address || 'No address provided'} 
                    {farm.location && <><br/><span className="text-[#071437] font-black">{farm.location}</span></>}
                  </p>
                </div>

                {/* Footer section (Buttons) */}
                <div className="flex gap-4 mt-auto pt-6 border-t border-[#edf1f7] relative z-20">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(farm); }}
                    className="flex-1 py-3 rounded-xl bg-[#f0f4f8] text-[#071437] font-black hover:bg-[#071437] hover:text-white transition-all shadow-sm hover:shadow-md text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(farm._id || farm.id); }}
                    className="flex-1 py-3 rounded-xl bg-red-50 text-red-600 font-black hover:bg-red-600 hover:text-white transition-all shadow-sm hover:shadow-md text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-[#e3e8f2] shadow-sm">
            <div className="text-4xl mb-4 opacity-50">🚜</div>
            <h3 className="text-xl font-bold text-[#071437] mb-2">No Farms Found</h3>
            <p className="text-[#5d7399]">Get started by creating your first farm.</p>
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
              Create Farm
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block mb-2 text-sm font-bold text-[#53698c]">
                  Farm Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Happy Valley Farm"
                  className="w-full border border-[#dbe4f0]
                  rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-bold text-[#53698c]">
                  Farm Code *
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="e.g. HVF"
                  className="w-full border border-[#dbe4f0]
                  rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-bold text-[#53698c]">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street Address"
                  className="w-full border border-[#dbe4f0]
                  rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-bold text-[#53698c]">
                  Location / City
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="City, State"
                  className="w-full border border-[#dbe4f0]
                  rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1 bg-[#071437] hover:bg-[#0d1f4d]
                text-white py-4 rounded-2xl
                font-black text-lg transition-all disabled:opacity-50"
              >
                {isLoading ? "Saving..." : "Save Farm"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-[#eef2f7] hover:bg-[#e3e8f0]
                text-[#071437] py-4 rounded-2xl
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

export default FarmsPg;
