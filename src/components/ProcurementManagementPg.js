import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";
import SkeletonLoader from "./SkeletonLoader";
import ModulePageHeader from "./ModulePageHeader";

const ProcurementManagementPg = () => {
  const [procurementSources, setProcurementSources] = useState([]);
  const [farms, setFarms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    id: null,
    name: "",
    code: "",
    location: "",
    phone: "",
    status: true,
    farmId: "",
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [sourcesData, farmsData] = await Promise.all([
        api.procurementSources.getAll().catch(() => []),
        api.farms.getAll().catch(() => []),
      ]);
      setProcurementSources(sourcesData || []);
      
      let rawFarms = Array.isArray(farmsData) ? farmsData : (farmsData?.data ?? []);
      let finalFarms = Array.isArray(rawFarms) ? rawFarms : [];
      if (!Array.isArray(finalFarms) || finalFarms.length === 0) {
        try {
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            const user = JSON.parse(storedUser);
            const userFarmId = user.farmId && typeof user.farmId === 'object'
              ? (user.farmId._id || user.farmId.id)
              : user.farmId;
            if (userFarmId && userFarmId !== 'ALL') {
              finalFarms = [{ _id: userFarmId, id: userFarmId, name: user.farm || "My Assigned Farm", code: user.farm || "My Assigned Farm" }];
            }
          }
        } catch (e) {}
      }
      setFarms(finalFarms);
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to retrieve procurement sources.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
      swalError("Error", "Procurement Place Name is required");
      return;
    }

    setIsLoadingForm(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        location: formData.location.trim(),
        phone: formData.phone.trim(),
        status: formData.status,
        farmId: formData.farmId || null,
      };

      if (formData.id) {
        await api.procurementSources.update(formData.id, payload);
        swalSuccess("Success", "Procurement source updated successfully");
      } else {
        await api.procurementSources.create(payload);
        swalSuccess("Success", "Procurement source registered successfully");
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", typeof err === "string" ? err : "Failed to save procurement source details");
    } finally {
      setIsLoadingForm(false);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      id: item.id || item._id,
      name: item.name,
      code: item.code || "",
      location: item.location || "",
      phone: item.phone || "",
      status: item.status !== undefined ? item.status : true,
      farmId: item.farmId?._id || item.farmId || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await swalConfirm(
      "Delete Procurement Source?",
      "Are you sure you want to delete this procurement source? It will no longer show in active selections for new logs."
    );
    if (!confirmed) return;

    try {
      await api.procurementSources.delete(id);
      swalSuccess("Deleted", "Procurement source deleted successfully");
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to delete procurement source");
    }
  };

  const filteredItems = procurementSources.filter((item) => {
    const query = searchQuery.toLowerCase();
    const name = (item.name || "").toLowerCase();
    const code = (item.code || "").toLowerCase();
    const location = (item.location || "").toLowerCase();
    const status = item.status !== false ? "active" : "inactive";
    return name.includes(query) || code.includes(query) || location.includes(query) || status.includes(query);
  });

  return (
    <div className="w-full flex flex-col bg-transparent text-slate-800">
      {/* HEADER SECTION */}
      <ModulePageHeader
        title="Procurement Sources Registry"
        description="Configure dynamic places/centers from which milk is fetched, populating daily procurement logs."
      >
        <button
          onClick={() => {
            setFormData({
              id: null,
              name: "",
              code: "",
              location: "",
              phone: "",
              status: true,
              farmId: farms[0]?._id || farms[0]?.id || "",
            });
            setShowForm(true);
          }}
          className="bg-[#16223F] hover:bg-[#2a3f75] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2 animate-fade-in"
        >
          <span>+ Add Procurement Source</span>
        </button>
      </ModulePageHeader>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            placeholder="Search sources by name, code, location, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-4 text-sm font-semibold text-[#16223F] outline-none focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 transition-all duration-200"
          />
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Places: {filteredItems.length}
          </div>
        </div>
      </div>

      {/* CONTENT WRAPPER */}
      <div className="flex-1 overflow-auto border border-gray-200 rounded-xl shadow-sm bg-white relative">
        {!isLoading && filteredItems.length === 0 && (
          <div className="p-16 text-center">
            <h3 className="text-lg font-bold text-gray-700">No Procurement Sources Found</h3>
            <p className="text-gray-500 mt-2 text-sm">
              {procurementSources.length === 0
                ? "Get started by adding custom procurement places above."
                : "No sources match your search query."}
            </p>
          </div>
        )}

        {(isLoading || filteredItems.length > 0) && (
          <table className="w-full text-left min-w-[600px] relative">
            <thead className="sticky top-0 z-10 bg-gray-50 text-[#16223F] uppercase text-[10px] font-black tracking-widest shadow-sm">
              <tr>
                <th className="p-4 border-b">Place Name</th>
                <th className="p-4 border-b">Center Code</th>
                <th className="p-4 border-b">Location</th>
                <th className="p-4 border-b">Phone</th>
                <th className="p-4 border-b">Assigned Farm</th>
                <th className="p-4 border-b text-center">Status</th>
                <th className="p-4 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <SkeletonLoader type="table" columns={7} />
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id || item._id} className="hover:bg-[#D1867D]/5 transition-colors">
                    <td className="p-4 text-sm font-black text-black">
                      🛒 {item.name}
                    </td>
                    <td className="p-4 text-sm font-bold text-slate-600">
                      {item.code ? (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200/50 text-[10px] font-black uppercase">
                          {item.code}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-4 text-sm font-semibold text-gray-500">
                      {item.location || "-"}
                    </td>
                    <td className="p-4 text-sm font-semibold text-gray-500">
                      {item.phone || "-"}
                    </td>
                    <td className="p-4 text-sm font-bold text-slate-600">
                      {item.farmId?.name || item.farmId?.code || "-"}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm border ${
                          item.status === true
                            ? "text-emerald-600 bg-emerald-100/50 border-emerald-200/50"
                            : "text-slate-600 bg-slate-100 border-slate-200"
                        }`}
                      >
                        {item.status === true ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-[11px] bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id || item._id)}
                          className="text-[11px] bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold px-3 py-1.5 rounded-lg transition-colors border border-rose-100"
                        >
                          🗑️ Delete
                        </button>
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
          <div className="bg-white rounded-[30px] p-8 w-full max-w-lg shadow-2xl relative animate-scale-in">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-all font-bold"
            >
              ✕
            </button>

            <h2 className="text-2xl font-black text-[#071437] mb-6 pr-10">
              {formData.id ? "Edit Procurement Source" : "Register Procurement Source"}
            </h2>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block mb-2 text-sm font-bold text-[#53698c]">
                  Place/Center Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Village Collection Point A"
                  className="w-full border border-[#dbe4f0] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                  required
                />
              </div>

              {/* Code */}
              <div>
                <label className="block mb-2 text-sm font-bold text-[#53698c]">
                  Center Code
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="e.g. PC-02"
                  className="w-full border border-[#dbe4f0] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block mb-2 text-sm font-bold text-[#53698c]">
                  Location/Address
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. Sector-3, Highway Road"
                  className="w-full border border-[#dbe4f0] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block mb-2 text-sm font-bold text-[#53698c]">
                  Contact Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. +91 99999 88888"
                  className="w-full border border-[#dbe4f0] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437]"
                />
              </div>

              {/* Farm Assignment */}
              <div>
                <label className="block mb-2 text-sm font-bold text-[#53698c]">
                  Assigned Farm
                </label>
                <select
                  name="farmId"
                  value={formData.farmId}
                  onChange={handleChange}
                  className="w-full border border-[#dbe4f0] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437] bg-white"
                >
                  <option value="">Select Farm</option>
                  {farms.map((f) => (
                    <option key={f._id || f.id} value={f._id || f.id}>
                      {f.name || f.code}
                    </option>
                  ))}
                </select>
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
                  className="w-full border border-[#dbe4f0] rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-[#071437] text-[#071437] bg-white"
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
                  {isLoadingForm ? "Saving..." : "Save Center"}
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

export default ProcurementManagementPg;
