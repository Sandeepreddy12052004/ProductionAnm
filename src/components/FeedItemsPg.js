import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { swalSuccess, swalError, swalConfirm } from "../utils/swal";
import SkeletonLoader from "./SkeletonLoader";

const FeedItemsPg = () => {
  const [feedItems, setFeedItems] = useState([]);
  const [farms, setFarms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState([{ field: "name", value: "" }]);

  const filterFields = [
    { name: "name", label: "Feed Item Name", type: "text" },
    { name: "description", label: "Description", type: "text" },
    { name: "status", label: "Status", type: "select", options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] }
  ];

  const [formData, setFormData] = useState({
    id: null,
    name: "",
    description: "",
    status: true,
    farmId: "",
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [itemsData, farmsData] = await Promise.all([
        api.feedItems.getAll(),
        api.farms.getAll(),
      ]);
      setFeedItems(itemsData || []);
      setFarms(farmsData || []);
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to retrieve feed items.");
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
      swalError("Error", "Feed Item Name is required");
      return;
    }

    setIsLoadingForm(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
        farmId: formData.farmId || null,
      };

      if (formData.id) {
        await api.feedItems.update(formData.id, payload);
        swalSuccess("Success", "Feed Item updated successfully");
      } else {
        await api.feedItems.create(payload);
        swalSuccess("Success", "Feed Item registered successfully");
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", typeof err === "string" ? err : "Failed to save feed item details");
    } finally {
      setIsLoadingForm(false);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      id: item.id || item._id,
      name: item.name,
      description: item.description || "",
      status: item.status !== undefined ? item.status : true,
      farmId: item.farmId?._id || item.farmId || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await swalConfirm("Delete Feed Item?", "Are you sure you want to delete this feed item? Other modules referencing this type will no longer show it in active selections.");
    if (!confirmed) return;

    try {
      await api.feedItems.delete(id);
      swalSuccess("Deleted", "Feed Item deleted successfully");
      fetchData();
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to delete feed item");
    }
  };

  // Group active filters by field name
  const groupedFilters = {};
  for (const f of filters) {
    const fieldConfig = filterFields.find(field => field.name === f.field);
    const hasValue = fieldConfig?.type === "select"
      ? (f.value && (Array.isArray(f.value) ? f.value.length > 0 : String(f.value).trim() !== ""))
      : (f.value && String(f.value).trim() !== "");
    if (!hasValue) continue;

    if (!groupedFilters[f.field]) {
      groupedFilters[f.field] = [];
    }
    groupedFilters[f.field].push(f);
  }

  const filteredItems = feedItems.filter((item) => {
    let isMatched = true;

    for (const fieldName in groupedFilters) {
      const fieldFilters = groupedFilters[fieldName];
      let matchAnyForField = false;

      for (const f of fieldFilters) {
        let currentMatch = true;

        if (f.field === "status") {
          const selectedValues = Array.isArray(f.value) ? f.value : (f.value ? [f.value] : []);
          if (selectedValues.length > 0) {
            const itemStatus = item.status !== false ? "active" : "inactive";
            const optionMatched = selectedValues.some(v => String(v).toLowerCase() === itemStatus);
            if (!optionMatched) currentMatch = false;
          }
        } else {
          if (f.value) {
            currentMatch = String(item[f.field] || "")
              .toLowerCase()
              .includes(f.value.toLowerCase());
          }
        }

        if (currentMatch) {
          matchAnyForField = true;
          break;
        }
      }

      if (!matchAnyForField) {
        isMatched = false;
        break;
      }
    }
    return isMatched;
  });

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col bg-transparent text-slate-800">
      {/* HEADER SECTION */}
      <div className="flex-none flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#16223F] tracking-tight">
            Feed Items Registry
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Configure dynamic feed types and options that populate daily feeding and stock logs.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              id: null,
              name: "",
              description: "",
              status: true,
              farmId: farms[0]?._id || farms[0]?.id || "",
            });
            setShowForm(true);
          }}
          className="bg-[#16223F] hover:bg-[#2a3f75] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
        >
          <span>+ Add Feed Item</span>
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative px-4 py-2.5 rounded-xl font-bold border text-xs transition-all duration-200 hover:-translate-y-px hover:shadow-md cursor-pointer flex items-center gap-2 ${
              showFilters ? 'bg-[#D1867D]/10 border-[#D1867D]/20 text-[#16223F]' : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            🔍 Filters
            {filters.filter(f => Array.isArray(f.value) ? f.value.length > 0 : String(f.value || '').trim() !== '').length > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {filters.filter(f => Array.isArray(f.value) ? f.value.length > 0 : String(f.value || '').trim() !== '').length}
              </span>
            )}
          </button>
        </div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Registered Feed Types: {filteredItems.length}
        </div>
      </div>

      {/* FILTER OVERLAY MODAL */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white w-full max-w-md rounded-[30px] shadow-2xl max-h-[85vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-[#16223F]">Filters</h3>
              <button onClick={() => setShowFilters(false)} className="text-gray-500 hover:text-black text-xl font-bold cursor-pointer">✕</button>
            </div>
            <div className="space-y-4">
              {filters.map((f, index) => (
                <div key={index} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <select
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-semibold text-[#16223F] bg-white outline-none focus:border-[#D1867D]"
                    value={f.field}
                    onChange={e => {
                      const updated = [...filters];
                      updated[index] = { field: e.target.value, value: '' };
                      setFilters(updated);
                    }}
                  >
                    {filterFields.map(field => (
                      <option key={field.name} value={field.name}>{field.label}</option>
                    ))}
                  </select>

                  {(() => {
                    const fieldConfig = filterFields.find(field => field.name === f.field);

                    // 📋 SELECT FIELD (MULTI-SELECT CHECKBOXES)
                    if (fieldConfig?.type === "select") {
                      const currentSelected = Array.isArray(f.value) ? f.value : (f.value ? [f.value] : []);
                      const options = fieldConfig.options || [];

                      return (
                        <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto bg-white border border-slate-200 rounded-lg p-2.5">
                          {options.map((opt) => {
                            const valStr = typeof opt === 'object' ? opt.value : opt;
                            const labelStr = typeof opt === 'object' ? opt.label : opt;
                            const isChecked = currentSelected.includes(valStr);

                            return (
                              <label key={valStr} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const updated = [...filters];
                                    let nextVal;
                                    if (e.target.checked) {
                                      nextVal = [...currentSelected, valStr];
                                    } else {
                                      nextVal = currentSelected.filter((v) => v !== valStr);
                                    }
                                    updated[index].value = nextVal;
                                    setFilters(updated);
                                  }}
                                  className="w-4 h-4 text-[#16223F] border-gray-300 rounded focus:ring-[#16223F]"
                                />
                                {labelStr}
                              </label>
                            );
                          })}
                        </div>
                      );
                    }

                    // ✏️ DEFAULT TEXT
                    return (
                      <input
                        type="text"
                        placeholder="Enter value..."
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-[#16223F] font-semibold outline-none focus:border-[#D1867D]"
                        value={f.value || ""}
                        onChange={(e) => {
                          const updated = [...filters];
                          updated[index].value = e.target.value;
                          setFilters(updated);
                        }}
                      />
                    );
                  })()}

                  <button
                    onClick={() => {
                      const updated = filters.filter((_, i) => i !== index);
                      setFilters(updated.length ? updated : [{ field: 'name', value: '' }]);
                    }}
                    className="text-red-500 hover:text-red-700 text-xs font-bold self-end mt-1 cursor-pointer transition-colors"
                  >
                    Remove Filter
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-6 gap-3">
              <button
                onClick={() => setFilters([...filters, { field: 'name', value: '' }])}
                className="flex-1 bg-[#D1867D]/10 text-[#16223F] py-2 rounded-lg font-bold text-sm hover:bg-[#D1867D]/20 cursor-pointer"
              >
                + Add Filter
              </button>
              <button
                onClick={() => { setFilters([{ field: 'name', value: '' }]); }}
                className="flex-1 bg-red-100 text-red-600 py-2 rounded-lg font-bold text-sm cursor-pointer"
              >
                Clear
              </button>
            </div>
            <button onClick={() => setShowFilters(false)}
              className="mt-4 w-full bg-[#16223F] hover:bg-[#16223F]/90 text-white py-2.5 rounded-lg font-bold cursor-pointer">
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* CONTENT WRAPPER */}
      <div className="flex-1 overflow-auto border border-gray-200 rounded-xl shadow-sm bg-white relative">
        {!isLoading && filteredItems.length === 0 && (
          <div className="p-16 text-center">
            <h3 className="text-lg font-bold text-gray-700">No Feed Items Found</h3>
            <p className="text-gray-500 mt-2 text-sm">
              Get started by adding custom feed item configurations above.
            </p>
          </div>
        )}

        {(isLoading || filteredItems.length > 0) && (
          <table className="w-full text-left min-w-[600px] relative">
            <thead className="sticky top-0 z-10 bg-gray-50 text-[#16223F] uppercase text-[10px] font-black tracking-widest shadow-sm">
              <tr>
                <th className="p-4 border-b">Feed Item Name</th>
                <th className="p-4 border-b">Description</th>
                <th className="p-4 border-b text-center">Status</th>
                <th className="p-4 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <SkeletonLoader type="table" columns={4} />
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id || item._id} className="hover:bg-[#D1867D]/5 transition-colors">
                    <td className="p-4 text-sm font-black text-black">
                      🌾 {item.name}
                    </td>
                    <td className="p-4 text-sm font-semibold text-gray-500">
                      {item.description || "-"}
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
                          className="text-[11px] bg-red-50 text-red-600 hover:bg-red-100 font-bold px-3 py-1.5 rounded-lg transition-colors border border-red-100"
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
          <div className="bg-white rounded-[30px] p-8 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-all font-bold"
            >
              ✕
            </button>

            <h2 className="text-2xl font-black text-[#071437] mb-6 pr-10">
              {formData.id ? "Edit Feed Item" : "Register Feed Item"}
            </h2>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block mb-2 text-sm font-bold text-[#53698c]">
                  Feed Item Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Cotton Cake"
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
                  placeholder="Details about nutritional properties or storage..."
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
                  {isLoadingForm ? "Saving..." : "Save Feed Item"}
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

export default FeedItemsPg;
