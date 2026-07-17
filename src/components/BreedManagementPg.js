import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";
import SkeletonLoader from "./SkeletonLoader";
import { hasActionPermission } from "../utils/permission";

const BreedManagementPg = () => {
  const [breeds, setBreeds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const canCreate = hasActionPermission('BREED_MANAGEMENT', 'CATTLE', 'create');
  const canEdit   = hasActionPermission('BREED_MANAGEMENT', 'CATTLE', 'edit');
  const canDelete = hasActionPermission('BREED_MANAGEMENT', 'CATTLE', 'delete');

  const [formData, setFormData] = useState({
    id: null,
    name: "",
    description: "",
    status: true,
  });

  const fetchBreeds = async () => {
    setIsLoading(true);
    try {
      const data = await api.breeds.getAll();
      setBreeds(data || []);
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to retrieve breeds.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBreeds();
  }, []);

  const handleChange = (e) => {
    const value = e.target.name === "status"
      ? e.target.value === "true"
      : e.target.value;

    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      swalError("Error", "Breed Name is required");
      return;
    }

    setIsLoadingForm(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
      };

      if (formData.id) {
        await api.breeds.update(formData.id, payload);
        swalSuccess("Success", "Breed updated successfully");
      } else {
        await api.breeds.create(payload);
        swalSuccess("Success", "Breed registered successfully");
      }
      setShowForm(false);
      fetchBreeds();
    } catch (err) {
      console.error(err);
      swalError("Error", typeof err === "string" ? err : "Failed to save breed details");
    } finally {
      setIsLoadingForm(false);
    }
  };

  const handleEdit = (breed) => {
    setFormData({
      id: breed.id || breed._id,
      name: breed.name,
      description: breed.description || "",
      status: breed.status !== undefined ? breed.status : true,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await swalConfirm("Delete Breed?", "Are you sure you want to delete this breed? Cattle referencing this breed will no longer show it in active selections.");
    if (!confirmed) return;

    try {
      await api.breeds.delete(id);
      swalSuccess("Deleted", "Breed deleted successfully");
      fetchBreeds();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to delete breed");
    }
  };

  const filteredBreeds = breeds.filter((breed) => {
    const query = searchQuery.toLowerCase();
    const name = (breed.name || "").toLowerCase();
    const description = (breed.description || "").toLowerCase();
    const status = breed.status !== false ? "active" : "inactive";
    return name.includes(query) || description.includes(query) || status.includes(query);
  });

  return (
    <div className="w-full flex flex-col bg-transparent text-slate-800">
      {/* HEADER SECTION */}
      <div className="flex-none flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#16223F] tracking-tight">
            Breed Management
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Configure dynamic cattle breeds to populate options in livestock management forms.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setFormData({ id: null, name: "", description: "", status: true });
              setShowForm(true);
            }}
            className="bg-[#16223F] hover:bg-[#2a3f75] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
          >
            <span>+ Add Breed</span>
          </button>
        )}
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            placeholder="Search breeds by name, description, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-4 text-sm font-semibold text-[#16223F] outline-none focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 transition-all duration-200"
          />
        </div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Registered Breeds: {filteredBreeds.length}
        </div>
      </div>

      {/* CONTENT WRAPPER */}
      <div className="flex-1 overflow-auto border border-gray-200 rounded-xl shadow-sm bg-white relative">
        {!isLoading && filteredBreeds.length === 0 && (
          <div className="p-16 text-center">
            <h3 className="text-lg font-bold text-gray-700">No Breeds Found</h3>
            <p className="text-gray-500 mt-2 text-sm">
              {breeds.length === 0
                ? "Get started by adding custom breed configurations above."
                : "No breeds match your search query."}
            </p>
          </div>
        )}

        {(isLoading || filteredBreeds.length > 0) && (
          <table className="w-full text-left min-w-[600px] relative">
            <thead className="sticky top-0 z-10 bg-gray-50 text-[#16223F] uppercase text-[10px] font-black tracking-widest shadow-sm">
              <tr>
                <th className="p-4 border-b">Breed Name</th>
                <th className="p-4 border-b">Description</th>
                <th className="p-4 border-b text-center">Status</th>
                <th className="p-4 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <SkeletonLoader type="table" columns={4} />
              ) : (
                filteredBreeds.map((breed) => (
                  <tr key={breed.id || breed._id} className="hover:bg-[#D1867D]/5 transition-colors">
                    <td className="p-4 text-sm font-black text-black">
                      🧬 {breed.name}
                    </td>
                    <td className="p-4 text-sm font-semibold text-gray-500">
                      {breed.description || "-"}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm border ${
                          breed.status === true
                            ? "text-emerald-600 bg-emerald-100/50 border-emerald-200/50"
                            : "text-slate-600 bg-slate-100 border-slate-200"
                        }`}
                      >
                        {breed.status === true ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end">
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(breed)}
                            className="text-[11px] bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
                          >
                            ✏️ Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(breed.id || breed._id)}
                            className="text-[11px] bg-red-50 text-red-600 hover:bg-red-100 font-bold px-3 py-1.5 rounded-lg transition-colors border border-red-100"
                          >
                            🗑️ Delete
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
          <div className="bg-white rounded-[30px] p-8 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-all font-bold"
            >
              ✕
            </button>

            <h2 className="text-2xl font-black text-[#071437] mb-6 pr-10">
              {formData.id ? "Edit Breed" : "Register Breed"}
            </h2>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block mb-2 text-sm font-bold text-[#53698c]">
                  Breed Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Holstein Friesian"
                  className="w-full border border-[#dbe4f0] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block mb-2 text-sm font-bold text-[#53698c]">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Details about origin, purity, characteristics..."
                  className="w-full border border-[#dbe4f0] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437] resize-none"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block mb-2 text-sm font-bold text-[#53698c]">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full border border-[#dbe4f0] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                >
                  <option value={true}>ACTIVE</option>
                  <option value={false}>INACTIVE</option>
                </select>
              </div>

              <div className="flex gap-4 mt-8 pt-4 border-t border-[#edf1f7]">
                <button
                  type="submit"
                  disabled={isLoadingForm}
                  className="flex-1 bg-[#071437] hover:bg-[#0d1f4d] text-white py-4 rounded-2xl font-black text-sm shadow-md transition-all disabled:opacity-50"
                >
                  {isLoadingForm ? "Saving..." : "Save Breed"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-[#eef2f7] hover:bg-[#e3e8f0] text-[#071437] py-4 rounded-2xl font-black text-sm transition-all"
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

export default BreedManagementPg;
