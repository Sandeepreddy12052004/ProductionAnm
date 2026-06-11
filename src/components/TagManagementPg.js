import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";
import SkeletonLoader from "./SkeletonLoader";

const TagManagementPg = () => {
  const [activeTab, setActiveTab] = useState("tags");
  const [tags, setTags] = useState([]);
  const [farms, setFarms] = useState([]);
  const [suffixes, setSuffixes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Tag Form state
  const [formData, setFormData] = useState({
    id: null,
    farmId: "",
    code: "",
    type: "COW",
    status: "AVAILABLE",
  });

  // Suffix Form state
  const [suffixFormData, setSuffixFormData] = useState({
    id: null,
    suffix: "",
    animalType: "COW",
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tagsData, farmsData, suffixesData] = await Promise.all([
        api.tags.getAll(),
        api.farms.getAll(),
        api.tags.getAllSuffixes(),
      ]);
      setTags(tagsData || []);
      setFarms(farmsData || []);
      setSuffixes(suffixesData || []);
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to retrieve tag and suffix rules.");
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

  const handleSuffixChange = (e) => {
    setSuffixFormData({
      ...suffixFormData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.farmId) {
      swalError("Error", "Farm selection is required");
      return;
    }
    if (!formData.code.trim()) {
      swalError("Error", "Tag Code is required");
      return;
    }

    setIsLoadingForm(true);
    try {
      const payload = {
        farmId: formData.farmId,
        code: formData.code.trim().toUpperCase(),
        type: formData.type,
        status: formData.status,
      };

      if (formData.id) {
        await api.tags.update(formData.id, payload);
        swalSuccess("Success", "Tag updated successfully");
      } else {
        await api.tags.create(payload);
        swalSuccess("Success", "Tag registered successfully");
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", typeof err === "string" ? err : "Failed to save tag details");
    } finally {
      setIsLoadingForm(false);
    }
  };

  const handleSaveSuffix = async (e) => {
    e.preventDefault();
    if (!suffixFormData.suffix.trim()) {
      swalError("Error", "Suffix is required");
      return;
    }

    setIsLoadingForm(true);
    try {
      const payload = {
        suffix: suffixFormData.suffix.trim().toUpperCase(),
        animalType: suffixFormData.animalType,
      };

      await api.tags.createSuffix(payload);
      swalSuccess("Success", "Suffix Rule saved successfully");
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", typeof err === "string" ? err : "Failed to save suffix rule");
    } finally {
      setIsLoadingForm(false);
    }
  };

  const handleEdit = (tag) => {
    setFormData({
      id: tag.id || tag._id,
      farmId: tag.farmId?._id || tag.farmId || "",
      code: tag.code,
      type: tag.type || "COW",
      status: tag.status || "AVAILABLE",
    });
    setActiveTab("tags");
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await swalConfirm("Delete Tag?", "Are you sure you want to delete this tag? This action cannot be undone.");
    if (!confirmed) return;

    try {
      await api.tags.delete(id);
      swalSuccess("Deleted", "Tag deleted successfully");
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to delete tag record");
    }
  };

  const handleDeleteSuffix = async (id) => {
    const confirmed = await swalConfirm("Delete Suffix Rule?", "Are you sure you want to delete this suffix rule?");
    if (!confirmed) return;

    try {
      await api.tags.deleteSuffix(id);
      swalSuccess("Deleted", "Suffix rule removed successfully");
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to delete suffix rule");
    }
  };

  const filteredTags = tags.filter((tag) => {
    const query = searchQuery.toLowerCase();
    const tagCode = (tag.code || "").toLowerCase();
    const tagType = (tag.type || "").toLowerCase();
    const farmName = (tag.farmId?.name || "").toLowerCase();
    const tagStatus = (tag.status || "").toLowerCase();
    return (
      tagCode.includes(query) ||
      tagType.includes(query) ||
      farmName.includes(query) ||
      tagStatus.includes(query)
    );
  });

  const filteredSuffixes = suffixes.filter((rule) => {
    const query = searchQuery.toLowerCase();
    return (
      (rule.suffix || "").toLowerCase().includes(query) ||
      (rule.animalType || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col bg-transparent text-slate-800 font-sans">
      {/* HEADER SECTION */}
      <div className="flex-none flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#16223F] tracking-tight">
            Tag & Suffix Management
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Register ear tags or configure tag suffixes for auto-detecting livestock types.
          </p>
        </div>

        <button
          onClick={() => {
            if (activeTab === "tags") {
              setFormData({
                id: null,
                farmId: farms[0]?._id || farms[0]?.id || "",
                code: "",
                type: "COW",
                status: "AVAILABLE",
              });
            } else {
              setSuffixFormData({
                id: null,
                suffix: "",
                animalType: "COW",
              });
            }
            setShowForm(true);
          }}
          className="bg-[#16223F] hover:bg-[#2a3f75] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
        >
          <span>
            {activeTab === "tags" ? "+ Register New Tag" : "+ Add Suffix Rule"}
          </span>
        </button>
      </div>

      {/* TABS */}
      <div className="flex gap-4 mb-5 border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab("tags");
            setSearchQuery("");
          }}
          className={`pb-3 text-sm font-black transition-all ${
            activeTab === "tags"
              ? "border-b-2 border-[#16223F] text-[#16223F]"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          🏷️ Tag Registry ({filteredTags.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("suffixes");
            setSearchQuery("");
          }}
          className={`pb-3 text-sm font-black transition-all ${
            activeTab === "suffixes"
              ? "border-b-2 border-[#16223F] text-[#16223F]"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          ⚙️ Tag Suffix Rules ({filteredSuffixes.length})
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            placeholder={
              activeTab === "tags"
                ? "Search tags by code, type, farm, status..."
                : "Search suffix mappings..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-4 text-sm font-semibold text-[#16223F] outline-none focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 transition-all duration-200"
          />
        </div>
      </div>

      {/* CONTENT WRAPPER */}
      <div className="flex-1 overflow-auto border border-gray-200 rounded-xl shadow-sm bg-white relative">
        {activeTab === "tags" ? (
          <>
            {!isLoading && filteredTags.length === 0 && (
              <div className="p-16 text-center">
                <h3 className="text-lg font-bold text-gray-700">No Tags Found</h3>
                <p className="text-gray-500 mt-2 text-sm">Use the register button above to add some tags.</p>
              </div>
            )}
            {(isLoading || filteredTags.length > 0) && (
              <table className="w-full text-left min-w-[700px] relative">
                <thead className="sticky top-0 z-10 bg-gray-50 text-[#16223F] uppercase text-[10px] font-black tracking-widest shadow-sm">
                  <tr>
                    <th className="p-4 border-b">Tag Code</th>
                    <th className="p-4 border-b">Cattle Type</th>
                    <th className="p-4 border-b">Assigned Farm</th>
                    <th className="p-4 border-b text-center">Status</th>
                    <th className="p-4 border-b text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <SkeletonLoader type="table" columns={5} />
                  ) : (
                    filteredTags.map((tag) => (
                      <tr key={tag.id || tag._id} className="hover:bg-[#D1867D]/5 transition-colors">
                        <td className="p-4 text-sm font-black text-black">🏷️ {tag.code}</td>
                        <td className="p-4 text-sm font-bold text-gray-600">{tag.type}</td>
                        <td className="p-4 text-sm font-bold text-gray-600">{tag.farmId?.name || "Unassigned"}</td>
                        <td className="p-4 text-center">
                          <span
                            className={`text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm border ${
                              tag.status === "AVAILABLE"
                                ? "text-emerald-600 bg-emerald-100/50 border-emerald-200/50"
                                : "text-blue-600 bg-blue-100/50 border-blue-200/50"
                            }`}
                          >
                            {tag.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleEdit(tag)}
                              className="text-[11px] bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold px-3 py-1.5 rounded-lg border border-slate-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(tag.id || tag._id)}
                              className="text-[11px] bg-red-50 text-red-600 hover:bg-red-100 font-bold px-3 py-1.5 rounded-lg border border-red-100"
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
            {!isLoading && filteredSuffixes.length === 0 && (
              <div className="p-16 text-center">
                <h3 className="text-lg font-bold text-gray-700">No Suffix Rules Defined</h3>
                <p className="text-gray-500 mt-2 text-sm">Add a new suffix to animal type rule above.</p>
              </div>
            )}
            {(isLoading || filteredSuffixes.length > 0) && (
              <table className="w-full text-left min-w-[500px] relative">
                <thead className="sticky top-0 z-10 bg-gray-50 text-[#16223F] uppercase text-[10px] font-black tracking-widest shadow-sm">
                  <tr>
                    <th className="p-4 border-b">Suffix Ending</th>
                    <th className="p-4 border-b">Maps to Animal Type</th>
                    <th className="p-4 border-b text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <SkeletonLoader type="table" columns={3} />
                  ) : (
                    filteredSuffixes.map((rule) => (
                      <tr key={rule._id || rule.id} className="hover:bg-[#D1867D]/5 transition-colors">
                        <td className="p-4 text-sm font-black text-black">⚙️ {rule.suffix}</td>
                        <td className="p-4 text-sm font-bold text-gray-600">{rule.animalType}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteSuffix(rule._id || rule.id)}
                            className="text-[11px] bg-red-50 text-red-600 hover:bg-red-100 font-bold px-3 py-1.5 rounded-lg border border-red-100"
                          >
                            Remove Rule
                          </button>
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
          <div className="bg-white rounded-[30px] p-8 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-all font-bold"
            >
              ✕
            </button>

            <h2 className="text-2xl font-black text-[#071437] mb-6 pr-10">
              {activeTab === "tags"
                ? formData.id ? "Edit Tag Configuration" : "Register Tag"
                : "Add Suffix Rule"}
            </h2>

            {activeTab === "tags" ? (
              <form onSubmit={handleSave} className="space-y-5">
                {/* farmId */}
                <div>
                  <label className="block mb-2 text-sm font-bold text-[#53698c]">Assign Farm Location</label>
                  <select
                    name="farmId"
                    value={formData.farmId}
                    onChange={handleChange}
                    className="w-full border border-[#dbe4f0] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437] bg-white"
                  >
                    <option value="" disabled>Select Farm...</option>
                    {farms.map((f) => (
                      <option key={f.id || f._id} value={f.id || f._id}>
                        {f.name} ({f.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Code */}
                <div>
                  <label className="block mb-2 text-sm font-bold text-[#53698c]">Tag Code Identifier</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="e.g. TAG-90234"
                    className="w-full border border-[#dbe4f0] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block mb-2 text-sm font-bold text-[#53698c]">Cattle Category</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full border border-[#dbe4f0] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437] bg-white"
                  >
                    <option value="COW">COW</option>
                    <option value="BUFFALO">BUFFALO</option>
                    <option value="CALF">CALF</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block mb-2 text-sm font-bold text-[#53698c]">Tag Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full border border-[#dbe4f0] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437] bg-white"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="ASSIGNED">ASSIGNED</option>
                  </select>
                </div>

                <div className="flex gap-4 mt-8 pt-4 border-t border-[#edf1f7]">
                  <button
                    type="submit"
                    disabled={isLoadingForm}
                    className="flex-1 bg-[#071437] hover:bg-[#0d1f4d] text-white py-4 rounded-2xl font-black text-sm shadow-md transition-all disabled:opacity-50"
                  >
                    {isLoadingForm ? "Saving..." : "Save Tag Record"}
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
            ) : (
              <form onSubmit={handleSaveSuffix} className="space-y-5">
                {/* Suffix input */}
                <div>
                  <label className="block mb-2 text-sm font-bold text-[#53698c]">Suffix Code (e.g. Y, G)</label>
                  <input
                    type="text"
                    name="suffix"
                    value={suffixFormData.suffix}
                    onChange={handleSuffixChange}
                    placeholder="e.g. Y"
                    className="w-full border border-[#dbe4f0] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                  />
                  <p className="text-xs text-gray-400 font-semibold mt-1.5 ml-1">
                    Any tag ending with this letter/symbol will auto-fill the animal type field.
                  </p>
                </div>

                {/* Animal Type mapping dropdown */}
                <div>
                  <label className="block mb-2 text-sm font-bold text-[#53698c]">Maps to Animal Type</label>
                  <select
                    name="animalType"
                    value={suffixFormData.animalType}
                    onChange={handleSuffixChange}
                    className="w-full border border-[#dbe4f0] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437] bg-white"
                  >
                    <option value="COW">COW</option>
                    <option value="BUFFALO">BUFFALO</option>
                    <option value="CALF">CALF</option>
                  </select>
                </div>

                <div className="flex gap-4 mt-8 pt-4 border-t border-[#edf1f7]">
                  <button
                    type="submit"
                    disabled={isLoadingForm}
                    className="flex-1 bg-[#071437] hover:bg-[#0d1f4d] text-white py-4 rounded-2xl font-black text-sm shadow-md transition-all disabled:opacity-50"
                  >
                    {isLoadingForm ? "Saving..." : "Save Suffix Rule"}
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagManagementPg;
