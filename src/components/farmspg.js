import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";

const FarmsPg = () => {
  const [farms, setFarms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    location: ""
  });

  const fetchFarms = async () => {
    try {
      const data = await api.farms.getAll();
      setFarms(data || []);
    } catch (err) {
      console.error(err);
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
      await api.farms.create(formData);
      swalSuccess("Success", "Farm created successfully!");
      setFormData({
        name: "",
        code: "",
        address: "",
        location: ""
      });
      setShowForm(false);
      fetchFarms();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to save farm.");
    } finally {
      setIsLoading(false);
    }
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
    <div className="p-8 bg-[#f7f9fc] min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-2xl font-black text-[#071437] tracking-tight">
            Farm Management
          </h1>
          <p className="text-[#5d7399] mt-3 text-sm font-semibold">
            Create, view, edit, and delete farms.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#071437] hover:bg-[#0d1f4d]
          text-white px-5 py-2.5 rounded-2xl
          font-bold text-lg shadow-lg
          transition-all duration-200 hover:scale-[1.02]"
        >
          + Create New Farm
        </button>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-[30px] overflow-hidden border border-[#e3e8f2] shadow-sm">
        {/* TABLE HEADER */}
        <div className="grid grid-cols-4 px-6 py-4 bg-[#f8fafc]
        text-[#53698c] text-[11px] font-black uppercase tracking-wide">
          <div>Farm Name</div>
          <div>Farm Code</div>
          <div>Address / Location</div>
          <div>Actions</div>
        </div>

        {/* DATA */}
        {farms.length > 0 ? (
          farms.map(farm => (
            <div
              key={farm._id || farm.id}
              className="grid grid-cols-4 items-center
              px-6 py-5 border-t border-[#edf1f7]
              hover:bg-[#fafcff] transition-all"
            >
              <div className="font-bold text-sm text-[#071437]">
                {farm.name}
              </div>
              <div className="font-bold text-sm text-[#5d7399]">
                {farm.code}
              </div>
              <div className="text-xs text-[#5d7399]">
                {farm.address} {farm.location ? `(${farm.location})` : ''}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDelete(farm._id || farm.id)}
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
            No Farms Found
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
