import { useState, useEffect } from "react";
import LogForm from "@/components/LogForm";
import { swalSuccess, swalError, swalConfirm } from "@/utils/swal";
import SkeletonLoader from "./SkeletonLoader";
import { api } from "@/utils/api";
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
} from "lucide-react";

export default function CattleManagementPg({
  moduleConfig,
}) {
  const [dynamicFields, setDynamicFields] = useState(moduleConfig?.fields || []);
  const [cattleData, setCattleData] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  
  // Dynamic Filters State
  const [filters, setFilters] = useState([{ field: "tag", value: "" }]);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const statusStyles = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    PREGNANT: "bg-violet-50 text-violet-700 border border-violet-100",
    SICK: "bg-red-50 text-red-700 border border-red-100",
    DRY: "bg-orange-50 text-orange-700 border border-orange-100",
    PENDING: "bg-amber-50 text-amber-700 border border-amber-100",
  };

  const fetchCattleData = async () => {
    setIsFetching(true);
    try {
      const res = await api.cattle.getAll();
      const raw = Array.isArray(res) ? res : (res?.data ?? []);
      setCattleData(raw);
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to retrieve cattle records from server.");
    } finally {
      setIsFetching(false);
    }
  };

  // Fetch options for Select fields (breeds, sheds, farms)
  useEffect(() => {
    let isMounted = true;

    const loadOptions = async () => {
      try {
        const [breedsRes, shedsRes, farmsRes] = await Promise.all([
          api.breeds.getAll(),
          api.sheds.getAll(),
          api.farms.getAll()
        ]);

        if (isMounted) {
          const breedList = Array.isArray(breedsRes) ? breedsRes : (breedsRes?.data ?? []);
          const breedOpts = breedList.filter(b => b.status !== false).map(b => b.name).filter(Boolean);

          const shedList = Array.isArray(shedsRes) ? shedsRes : (shedsRes?.data ?? []);
          const shedOpts = shedList.map(s => s.name || s.code).filter(Boolean);

          const farmList = Array.isArray(farmsRes) ? farmsRes : (farmsRes?.data ?? []);
          const farmOpts = farmList.map(f => ({ label: f.name, value: f._id || f.id }));

          setDynamicFields(prev => prev.map(f => {
            if (f.name === 'breed') return { ...f, options: breedOpts };
            if (f.name === 'shed') return { ...f, options: shedOpts };
            if (f.name === 'farmId') return { ...f, options: farmOpts };
            return f;
          }));
        }
      } catch (err) {
        console.error("Failed to load options for cattle registration", err);
      }
    };

    loadOptions();
    fetchCattleData();

    return () => { isMounted = false; };
  }, [moduleConfig]);

  const handleAdd = async (data) => {
    setIsLoading(true);
    try {
      const resolvedShed = data.shed && data.shed !== '' && data.shed !== '-' ? data.shed : (data.shedId || '-');
      const resolvedType = data.cattleType || data.animalType || 'COW';
      const payload = {
        ...data,
        tag: data.tag || data.tagId,
        code: data.code || `CTL-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        farmId: data.farmId || null,
        shed: resolvedShed,
        shedId: resolvedShed,
        cattleType: resolvedType,
        animalType: resolvedType,
      };

      await api.cattle.create(payload);
      swalSuccess("Success", "Cattle added successfully!");
      setShowAddModal(false);
      fetchCattleData();
    } catch (err) {
      console.error(err);
      swalError("Error", typeof err === 'string' ? err : "Failed to add cattle record.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (data) => {
    setIsLoading(true);
    try {
      const id = selectedAnimal?.id || selectedAnimal?._id;
      const payload = { 
        ...data, 
        tagId: data.tag || data.tagId 
      };

      await api.cattle.update(id, payload);
      swalSuccess("Success", "Cattle updated successfully!");
      setShowEditModal(false);
      setSelectedAnimal(null);
      fetchCattleData();
    } catch (err) {
      console.error(err);
      swalError("Error", typeof err === 'string' ? err : "Failed to update cattle.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    const id = selectedAnimal?.id || selectedAnimal?._id;
    if (!id) return;
    const confirmed = await swalConfirm("Delete Cattle?", "Are you sure you want to permanently delete this cattle record?");
    if (confirmed) {
      setIsLoading(true);
      try {
        await api.cattle.delete(id);
        swalSuccess("Deleted", "Cattle record deleted successfully!");
        setShowActionModal(false);
        setSelectedAnimal(null);
        fetchCattleData();
      } catch (err) {
        console.error(err);
        swalError("Error", "Failed to delete cattle.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const clearAllFilters = () => {
    setFilters([{ field: "tag", value: "" }]);
    setCurrentPage(1);
  };

  const activeFilterCount = filters.filter(
    (f) => (Array.isArray(f.value) ? f.value.length > 0 : (f.value && String(f.value).trim() !== "")) || f.from || f.to
  ).length;

  const filteredData = cattleData.filter((item) => {
    // Search query match (tag, breed, gender)
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (item.tag || item.tag_id || "").toLowerCase().includes(q) ||
      (item.breed || "").toLowerCase().includes(q) ||
      (item.gender || "").toLowerCase().includes(q);

    if (!matchesSearch) return false;

    // Filter array condition matches
    return filters.every((f) => {
      // 📅 DATE RANGE FILTER (if any date field exists in config)
      if (f.field.toLowerCase().includes("date") || f.field.toLowerCase() === "dob" || f.field.toLowerCase() === "dateofbirth") {
        if (!f.from && !f.to) return true;

        const val = item[f.field];
        if (!val) return false;

        const currentVal = new Date(val);
        if (isNaN(currentVal.getTime())) return false;
        currentVal.setHours(0, 0, 0, 0);

        if (f.from) {
          const fromDate = new Date(f.from);
          if (!isNaN(fromDate.getTime())) {
            fromDate.setHours(0, 0, 0, 0);
            if (currentVal < fromDate) return false;
          }
        }

        if (f.to) {
          const toDate = new Date(f.to);
          if (!isNaN(toDate.getTime())) {
            toDate.setHours(0, 0, 0, 0);
            if (currentVal > toDate) return false;
          }
        }

        return true;
      }

      // 🔢 RANGE FILTER FOR AGE AND MILK YIELD
      if (f.field === "age" || f.field === "milk") {
        if (!f.from && !f.to) return true;

        const valStr = String(item[f.field] || "").trim();
        const valNum = parseFloat(valStr.replace(/[^0-9.]/g, ''));
        if (isNaN(valNum)) return false;

        if (f.from) {
          const fromNum = parseFloat(f.from);
          if (!isNaN(fromNum) && valNum < fromNum) return false;
        }

        if (f.to) {
          const toNum = parseFloat(f.to);
          if (!isNaN(toNum) && valNum > toNum) return false;
        }

        return true;
      }

      // 🔁 MULTI-SELECT CHECKBOX MATCH
      const fieldConfig = dynamicFields.find(field => field.name === f.field);
      if (fieldConfig?.type === "select") {
        const selectedValues = Array.isArray(f.value) ? f.value : (f.value ? [f.value] : []);
        if (selectedValues.length === 0) return true;

        const recordVal = String(item[f.field] || "").toLowerCase();
        return selectedValues.some(v => String(v).toLowerCase() === recordVal || recordVal.includes(String(v).toLowerCase()));
      }

      // ✏️ DEFAULT TEXT
      if (!f.value) return true;
      return String(item[f.field] || "")
        .toLowerCase()
        .includes(f.value.toLowerCase());
    });
  });

  const totalPages = Math.ceil(filteredData.length / recordsPerPage) || 1;
  const startIndex = (currentPage - 1) * recordsPerPage;
  const paginatedData = filteredData.slice(
    startIndex,
    startIndex + recordsPerPage
  );

  return (
    <div className="w-full flex flex-col text-black font-sans">
      {/* HEADER */}
      <div className="mb-5">
        <h1 className="text-3xl font-bold text-[#16223F]">
          {moduleConfig?.name}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage and track cattle records directly connected to unified livestock entries.
        </p>
      </div>

      {/* OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#D1867D]/10 flex items-center justify-center text-2xl shadow-inner">
              🐄
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                Total Cattle
              </p>
              <h2 className="text-3xl font-black text-[#16223F] mt-1">
                {cattleData.length}
              </h2>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#16223F]/5 flex items-center justify-center text-2xl shadow-inner">
              🥛
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                Milking
              </p>
              <h2 className="text-3xl font-black text-[#16223F] mt-1">
                {cattleData.filter((a) => Number(a.milk) > 0).length}
              </h2>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#D1867D]/10 flex items-center justify-center text-2xl shadow-inner">
              🤰
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                Pregnant
              </p>
              <h2 className="text-3xl font-black text-[#16223F] mt-1">
                {cattleData.filter((a) => a.status === "PREGNANT").length}
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          <div className="relative w-full lg:max-w-xl">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search cattle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="
                w-full h-12
                rounded-xl
                border border-slate-200
                bg-slate-50/50
                pl-11 pr-4
                text-sm
                font-semibold
                text-[#16223F]
                outline-none
                focus:bg-white
                focus:border-[#D1867D]
                focus:ring-2
                focus:ring-[#D1867D]/10
                transition-all
                duration-200
              "
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative px-5 h-12 rounded-xl font-bold border transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-md flex items-center gap-2
                ${showFilters 
                  ? 'bg-[#D1867D]/10 border-[#D1867D]/20 text-[#16223F] hover:bg-[#D1867D]/20' 
                  : 'bg-white border-slate-200 text-[#16223F] hover:bg-gray-50'}
              `}
            >
              <Filter size={16} />
              {showFilters ? '✕ Hide Filter' : '🔍 Filters'}

              {/* FILTER COUNT BADGE */}
              {activeFilterCount > 0 && (
                <span className="
                  absolute -top-2 -right-2
                  bg-red-600 text-white
                  text-[10px] font-bold
                  px-1.5 py-0.5
                  rounded-full
                  min-w-[18px]
                  shadow-sm
                ">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="
                h-12 px-5
                rounded-xl
                bg-[#16223F]
                hover:bg-[#16223F]/90
                text-white
                font-bold
                flex items-center gap-2
                shadow-sm
                transition-all
                duration-200
                active:scale-[0.98]
              "
            >
              <Plus size={16} />
              Add Cattle
            </button>
          </div>
        </div>
      </div>

      {/* FILTER MODAL OVERLAY */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="
            bg-white 
            w-full 
            max-w-md 
            rounded-2xl 
            shadow-2xl 
            max-h-[85vh] 
            overflow-y-auto
            p-5
          ">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-[#16223F]">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-700 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-all font-bold"
              >
                ✕
              </button>
            </div>

            {/* FILTER LIST */}
            <div className="space-y-4">
              {filters.map((f, index) => (
                <div key={index} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  {/* FIELD SELECT */}
                  <select
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-semibold text-[#16223F] bg-white outline-none focus:border-[#D1867D]"
                    value={f.field}
                    onChange={(e) => {
                      const updated = [...filters];
                      updated[index].field = e.target.value;
                      updated[index].value = "";
                      updated[index].from = "";
                      updated[index].to = "";
                      setFilters(updated);
                    }}
                  >
                    {dynamicFields.map(field => (
                      <option key={field.name} value={field.name}>
                        {field.label}
                      </option>
                    ))}
                  </select>

                  {/* VALUE INPUTS */}
                  {(() => {
                    const fieldConfig = dynamicFields.find(field => field.name === f.field);

                    // 📅 DATE RANGE FIELD
                    if (f.field.toLowerCase().includes("date") || f.field.toLowerCase() === "dob" || f.field.toLowerCase() === "dateofbirth") {
                      return (
                        <div className="flex gap-2">
                          <input
                            type="date"
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm w-full bg-white text-[#16223F] font-semibold"
                            value={f.from || ""}
                            onChange={(e) => {
                              const updated = [...filters];
                              updated[index].from = e.target.value;
                              setFilters(updated);
                            }}
                          />
                          <input
                            type="date"
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm w-full bg-white text-[#16223F] font-semibold"
                            value={f.to || ""}
                            onChange={(e) => {
                              const updated = [...filters];
                              updated[index].to = e.target.value;
                              setFilters(updated);
                            }}
                          />
                        </div>
                      );
                    }

                    // 🔢 RANGE FIELD FOR AGE AND MILK YIELD
                    if (f.field === "age" || f.field === "milk") {
                      return (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Min..."
                            step="any"
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-[#16223F] font-semibold outline-none focus:border-[#D1867D] w-full"
                            value={f.from || ""}
                            onChange={(e) => {
                              const updated = [...filters];
                              updated[index].from = e.target.value;
                              setFilters(updated);
                            }}
                          />
                          <input
                            type="number"
                            placeholder="Max..."
                            step="any"
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-[#16223F] font-semibold outline-none focus:border-[#D1867D] w-full"
                            value={f.to || ""}
                            onChange={(e) => {
                              const updated = [...filters];
                              updated[index].to = e.target.value;
                              setFilters(updated);
                            }}
                          />
                        </div>
                      );
                    }

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

                  {/* REMOVE BUTTON */}
                  <button
                    onClick={() => {
                      const updated = filters.filter((_, i) => i !== index);
                      setFilters(updated.length ? updated : [{ field: "tag", value: "" }]);
                    }}
                    className="text-red-500 hover:text-red-700 text-xs font-bold self-end mt-1 cursor-pointer transition-colors"
                  >
                    Remove Filter
                  </button>
                </div>
              ))}
            </div>

            {/* ACTIONS */}
            <div className="flex justify-between mt-6 gap-3">
              <button
                onClick={() => setFilters([...filters, { field: "tag", value: "" }])}
                className="flex-1 bg-[#D1867D]/10 text-[#16223F] py-2.5 rounded-xl font-bold text-sm hover:bg-[#D1867D]/20 transition-colors cursor-pointer"
              >
                + Add Filter
              </button>

              <button
                onClick={clearAllFilters}
                className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors cursor-pointer"
              >
                Clear All
              </button>
            </div>

            {/* APPLY BUTTON */}
            <button
              onClick={() => setShowFilters(false)}
              className="mt-4 w-full bg-[#16223F] hover:bg-[#16223F]/90 text-white py-3 rounded-xl font-bold text-sm transition-colors shadow-md cursor-pointer"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="
        bg-white
        rounded-2xl
        border border-gray-200
        shadow-sm
        overflow-hidden
      ">
        {/* TABLE SCROLL */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="
              bg-gray-50
              border-b border-gray-200
            ">
              <tr>
                {dynamicFields.map((field) => (
                  <th
                    key={field.name}
                    className="
                      p-4
                      text-left
                      text-[11px]
                      uppercase
                      font-black
                      tracking-widest
                      text-[#16223F]
                    "
                  >
                    {field.label}
                  </th>
                ))}
                <th className="p-4 border-b w-10 text-center"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isFetching ? (
                <SkeletonLoader type="table" columns={dynamicFields.length + 1} />
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={dynamicFields.length + 1}
                    className="p-16 text-center text-slate-500 text-sm font-semibold"
                  >
                    No cattle found
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => (
                  <tr
                    key={index}
                    onClick={() => {
                      setSelectedAnimal(item);
                      setShowActionModal(true);
                    }}
                    className="
                      border-b border-gray-100
                      hover:bg-[#D1867D]/5
                      transition-colors
                      cursor-pointer
                    "
                  >
                    {dynamicFields.map((field) => {
                      let cellVal = item[field.name];
                      if (field.name === 'farmId') {
                        cellVal = item.farmName || cellVal;
                      }

                      return (
                        <td
                          key={field.name}
                          className="p-4 text-sm font-semibold text-black"
                        >
                          {field.name === "status" ? (
                            <span
                              className={
                                "px-3 py-1 rounded-full text-xs font-bold " +
                                (statusStyles[item.status] || "bg-slate-50 text-slate-700")
                              }
                            >
                              {item.status}
                            </span>
                          ) : (
                            cellVal || "-"
                          )}
                        </td>
                      );
                    })}

                    <td className="p-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnimal(item);
                          setShowActionModal(true);
                        }}
                        className="
                          w-9 h-9
                          rounded-lg
                          bg-gray-100
                          hover:bg-[#D1867D]/10
                          flex items-center justify-center
                          transition-colors
                        "
                      >
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="
          flex items-center justify-between
          px-4 md:px-6
          py-4
          border-t border-gray-200
          bg-white
        ">
          <div className="
            text-[15px]
            text-gray-500
            font-medium
          ">
            Showing{" "}
            <span className="font-semibold text-gray-700">
              {filteredData.length === 0
                ? "0-0"
                : `${startIndex + 1}-${Math.min(
                    startIndex + recordsPerPage,
                    filteredData.length
                  )}`}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-700">
              {filteredData.length}
            </span>{" "}
            records
          </div>

          <div className="flex items-center gap-4">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className={`
                h-10 px-5
                rounded-xl
                border
                text-[15px]
                font-medium
                transition-all
                ${
                  currentPage === 1
                    ? "border-gray-100 text-gray-300 bg-white cursor-not-allowed"
                    : "border-gray-200 text-[#16223F] bg-white hover:bg-slate-50 transition-all duration-200"
                }
              `}
            >
              Prev
            </button>

            <span className="text-[15px] font-bold text-slate-800">
              Page {currentPage}
            </span>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className={`
                h-10 px-5
                rounded-xl
                border
                text-[15px]
                font-medium
                transition-all
                ${
                  currentPage === totalPages
                    ? "border-gray-100 text-gray-300 bg-white cursor-not-allowed"
                    : "border-gray-200 text-[#16223F] bg-white hover:bg-slate-50 transition-all duration-200"
                }
              `}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Action Popover */}
      {showActionModal && selectedAnimal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-[320px] transform transition-all">
            <h3 className="font-bold text-lg mb-4 text-center text-black">Manage Cattle</h3>
            <div className="space-y-2">
              <button 
                onClick={() => {
                  setShowActionModal(false);
                  setShowViewModal(true);
                }}
                className="w-full flex items-center justify-center gap-2 bg-gray-400 text-white py-3 rounded-xl font-semibold hover:bg-gray-500 transition-all"
              >
                👁️ View Details
              </button>

              <button 
                onClick={() => {
                  setShowActionModal(false);
                  setShowEditModal(true);
                }}
                className="w-full flex items-center justify-center gap-2 bg-[#D1867D] text-white py-3 rounded-xl font-semibold hover:bg-[#b06a62] transition-all"
              >
                ✏️ Edit Cattle
              </button>

              <button 
                onClick={handleDelete}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-50"
              >
                🗑️ Delete
              </button>

              <button 
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedAnimal(null);
                }}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {showViewModal && selectedAnimal && (
        <div className="fixed inset-0 bg-[#16223F]/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-7 rounded-3xl shadow-2xl border border-slate-100 w-full max-w-[400px] relative">
            <button
              onClick={() => {
                setShowViewModal(false);
                setSelectedAnimal(null);
              }}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-all font-bold z-10"
              type="button"
            >
              ✕
            </button>

            <h3 className="text-xl font-extrabold mb-5 text-[#16223F] tracking-tight pr-8">Cattle Details</h3>

            <div className="space-y-4 mb-6 text-black">
              {dynamicFields.map(field => {
                let cellVal = selectedAnimal[field.name];
                if (field.name === 'farmId') {
                  cellVal = selectedAnimal.farmName || cellVal;
                }

                return (
                  <div key={field.name} className="border-b border-slate-50 pb-2">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{field.label}</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {field.name === 'status' ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusStyles[selectedAnimal[field.name]] || ''}`}>
                          {selectedAnimal[field.name]}
                        </span>
                      ) : (
                        cellVal || '-'
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                setShowViewModal(false);
                setSelectedAnimal(null);
              }}
              className="w-full bg-[#16223F] hover:bg-[#16223F]/90 text-white font-bold py-3 rounded-xl shadow-md transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {showAddModal && (
        <LogForm
          title="Add Cattle"
          fields={dynamicFields}
          onSubmit={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedAnimal && (
        <LogForm
          title="Edit Cattle"
          fields={dynamicFields}
          initialData={selectedAnimal}
          onSubmit={handleEdit}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAnimal(null);
          }}
        />
      )}
    </div>
  );
}
