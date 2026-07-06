import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { swalSuccess, swalError, swalConfirm } from '../utils/swal';
import SkeletonLoader from './SkeletonLoader';
import { 
  Snowflake,
  Thermometer,
  Layers,
  Plus,
  Edit,
  Trash2,
  X,
  MapPin,
  FileText,
  AlertTriangle,
  Droplet
} from 'lucide-react';

export default function BmcManagementPg() {
  const [bmcs, setBmcs] = useState([]);
  const [farms, setFarms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [userFarmId, setUserFarmId] = useState('');

  // Modals state
  const [showBmcModal, setShowBmcModal] = useState(false);
  const [editingBmc, setEditingBmc] = useState(null);
  


  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [farmFilter, setFarmFilter] = useState('ALL');

  // Form state
  const [bmcFormData, setBmcFormData] = useState({
    name: '',
    code: '',
    farmId: '',
    capacity: '',
    location: '',
    description: '',
    status: 'ACTIVE'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        setUserRole(u.role || '');
        const fId = u.farmId && typeof u.farmId === 'object' ? (u.farmId._id || u.farmId.id) : u.farmId;
        setUserFarmId(fId || '');
      }

      const [bmcsData, farmsData] = await Promise.all([
        api.bmcs.getAll(),
        api.farms.getAll()
      ]);

      setBmcs(Array.isArray(bmcsData) ? bmcsData : (bmcsData?.data ?? []));
      setFarms(Array.isArray(farmsData) ? farmsData : (farmsData?.data ?? []));
    } catch (error) {
      console.error('Failed to fetch BMC data', error);
      swalError('Error', 'Failed to retrieve Bulk Milk Cooler data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Set default farm for form
  useEffect(() => {
    if (farms.length > 0 && !bmcFormData.farmId) {
      if (userRole !== 'SUPER_ADMIN' && userFarmId) {
        setBmcFormData(prev => ({ ...prev, farmId: userFarmId }));
      } else {
        setBmcFormData(prev => ({ ...prev, farmId: farms[0]._id }));
      }
    }
  }, [farms, userRole, userFarmId]);

  const handleOpenCreateModal = () => {
    setEditingBmc(null);
    let resolvedFarmId = '';
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const u = JSON.parse(storedUser);
      const role = u.role || '';
      const fId = u.farmId && typeof u.farmId === 'object' ? (u.farmId._id || u.farmId.id) : u.farmId;
      if (role !== 'SUPER_ADMIN' && fId) {
        resolvedFarmId = fId;
      }
    }
    if (!resolvedFarmId && farms.length > 0) {
      resolvedFarmId = farms[0]._id;
    }

    setBmcFormData({
      name: '',
      code: '',
      farmId: resolvedFarmId,
      capacity: '',
      location: '',
      description: '',
      status: 'ACTIVE'
    });
    setShowBmcModal(true);
  };

  const handleOpenEditModal = (bmc) => {
    setEditingBmc(bmc);
    setBmcFormData({
      name: bmc.name,
      code: bmc.code,
      farmId: bmc.farmId?._id || bmc.farmId || '',
      capacity: bmc.capacity.toString(),
      location: bmc.location || '',
      description: bmc.description || '',
      status: bmc.status || 'ACTIVE'
    });
    setShowBmcModal(true);
  };

  const handleSaveBmc = async (e) => {
    e.preventDefault();
    
    let resolvedFarmId = bmcFormData.farmId;
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const u = JSON.parse(storedUser);
      const role = u.role || '';
      const fId = u.farmId && typeof u.farmId === 'object' ? (u.farmId._id || u.farmId.id) : u.farmId;
      if (role !== 'SUPER_ADMIN' && fId) {
        resolvedFarmId = fId;
      }
    }

    if (!bmcFormData.name.trim() || !bmcFormData.code.trim() || !bmcFormData.capacity || !resolvedFarmId) {
      swalError('Validation Error', 'Please fill in all required fields (including Enterprise Farm).');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      ...bmcFormData,
      farmId: resolvedFarmId,
      capacity: parseFloat(bmcFormData.capacity)
    };

    try {
      if (editingBmc) {
        await api.bmcs.update(editingBmc._id, payload);
        swalSuccess('Success', 'Bulk Milk Cooler configuration updated.');
      } else {
        await api.bmcs.create(payload);
        swalSuccess('Success', 'Bulk Milk Cooler defined successfully.');
      }
      setShowBmcModal(false);
      fetchData();
    } catch (error) {
      console.error(error);
      swalError('Error', typeof error === 'string' ? error : 'Failed to save Bulk Milk Cooler.');
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleDeleteBmc = async (id) => {
    const confirmed = await swalConfirm('Delete Cooler?', 'Are you sure you want to remove this Bulk Milk Cooler?');
    if (!confirmed) return;

    try {
      await api.bmcs.delete(id);
      swalSuccess('Deleted', 'Cooler removed successfully.');
      fetchData();
    } catch (error) {
      console.error(error);
      swalError('Error', 'Failed to delete cooler.');
    }
  };

  const handleUpdateStatus = async (bmc, status) => {
    try {
      await api.bmcs.update(bmc._id, { status });
      swalSuccess('Status Updated', `Cooler status changed to ${status}.`);
      fetchData();
    } catch (error) {
      console.error(error);
      swalError('Error', 'Failed to update status.');
    }
  };

  // Stats
  const totalCapacity = bmcs.reduce((sum, b) => sum + (b.capacity || 0), 0);
  const totalStored = bmcs.reduce((sum, b) => sum + (b.currentVolume || 0), 0);
  const activeCoolers = bmcs.filter(b => b.status === 'ACTIVE').length;

  // Filter
  const filteredBmcs = bmcs.filter((bmc) => {
    const matchesSearch = 
      (bmc.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bmc.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bmc.location || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || bmc.status === statusFilter;
    
    const bmcFarmId = bmc.farmId && typeof bmc.farmId === 'object' ? (bmc.farmId._id || bmc.farmId.id) : bmc.farmId;
    const matchesFarm = farmFilter === 'ALL' || String(bmcFarmId) === String(farmFilter);

    return matchesSearch && matchesStatus && matchesFarm;
  });

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col bg-transparent text-slate-800 font-sans">
      {/* HEADER SECTION */}
      <div className="flex-none flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#16223F] tracking-tight">
            Bulk Milk Cooler (BMC) Management
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Define Bulk Milk Coolers, manage capacities, storage volumes, and temperature statuses.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="bg-[#16223F] hover:bg-[#2a3f75] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
        >
          <span>+ Define Milk Cooler</span>
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6 flex-none">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Cooling Capacity</span>
              <h3 className="text-2xl font-black text-[#16223F] leading-none">
                {totalCapacity.toLocaleString()} <span className="text-xs font-bold text-slate-500">Liters</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold">Across {bmcs.length} total units</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Stored Milk</span>
              <h3 className="text-2xl font-black text-indigo-600 leading-none">
                {totalStored.toLocaleString()} <span className="text-xs font-bold text-indigo-400">Liters</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold">
                {totalCapacity > 0 ? ((totalStored / totalCapacity) * 100).toFixed(1) : 0}% aggregate utilization
              </p>
            </div>
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Droplet className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Cooling Systems</span>
              <h3 className="text-2xl font-black text-emerald-600 leading-none">
                {activeCoolers} <span className="text-xs font-bold text-emerald-400">units</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold">Ready for daily collections</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Snowflake className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 flex flex-col md:flex-row gap-4 items-center justify-between flex-none">
        <div className="flex flex-1 flex-col sm:flex-row gap-4 w-full">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by name, code or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-4 text-sm font-semibold text-[#16223F] outline-none focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 transition-all duration-200"
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm font-semibold text-[#16223F] outline-none focus:bg-white focus:border-[#D1867D] transition-all duration-200"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>

          {userRole === 'SUPER_ADMIN' && (
            <div className="w-full sm:w-48">
              <select
                value={farmFilter}
                onChange={(e) => setFarmFilter(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm font-semibold text-[#16223F] outline-none focus:bg-white focus:border-[#D1867D] transition-all duration-200"
              >
                <option value="ALL">All Farms</option>
                {farms.map(f => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SkeletonLoader type="card" />
            <SkeletonLoader type="card" />
            <SkeletonLoader type="card" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBmcs.map((bmc) => {
              const bmcFarm = farms.find(f => f._id === (bmc.farmId?._id || bmc.farmId));
              const fillPercentage = bmc.capacity > 0 ? Math.min(((bmc.currentVolume || 0) / bmc.capacity) * 100, 100) : 0;
              
              // Temperature warning: Standard milk cooling target is 2°C - 4°C. Highlight if > 4°C.
              const isTempWarning = bmc.temperature !== undefined && bmc.temperature !== null && bmc.temperature > 4;

              return (
                <div 
                  key={bmc._id} 
                  className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:border-[#D1867D]/60 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="p-6 space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                          <Snowflake className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-[#16223F] text-md leading-tight truncate max-w-[140px]">{bmc.name}</h4>
                          <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">{bmc.code}</span>
                        </div>
                      </div>
                      <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border ${
                        bmc.status === 'ACTIVE' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : bmc.status === 'MAINTENANCE'
                          ? 'bg-amber-50 text-amber-600 border-amber-100'
                          : 'bg-slate-50 text-slate-600 border-slate-100'
                      }`}>
                        {bmc.status}
                      </span>
                    </div>

                    {/* Progress Gauge representing fill level */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>Storage Volume</span>
                        <span>{bmc.currentVolume?.toLocaleString() || 0} / {bmc.capacity?.toLocaleString()} L</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-50">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${fillPercentage}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold text-right">
                        {fillPercentage.toFixed(1)}% full
                      </p>
                    </div>

                    {/* Specifications */}
                    <div className="space-y-2 text-xs text-slate-600 font-medium">
                      {/* Temperature Sensor Reading */}
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Thermometer className="w-3.5 h-3.5 text-slate-400" />
                          Cooler Temp
                        </span>
                        {bmc.temperature !== undefined && bmc.temperature !== null ? (
                          <span className={`font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            isTempWarning 
                              ? 'bg-rose-50 text-rose-600 border border-rose-100 animate-bounce' 
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}>
                            {bmc.temperature}°C
                            {isTempWarning && <AlertTriangle className="w-3 h-3" />}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No sensor data</span>
                        )}
                      </div>

                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-400">Enterprise Unit</span>
                        <span className="font-bold text-slate-800">
                          {bmc.farmId?.name || bmcFarm?.name || 'Unassigned'}
                        </span>
                      </div>

                      {bmc.location && (
                        <div className="flex items-start gap-2 pt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                          <span className="text-[11px] text-slate-500 line-clamp-1">{bmc.location}</span>
                        </div>
                      )}
                      {bmc.description && (
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{bmc.description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => handleOpenEditModal(bmc)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 active:scale-95"
                        title="Edit specifications"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteBmc(bmc._id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 active:scale-95"
                        title="Delete cooler"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex gap-2">
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredBmcs.length === 0 && (
              <div className="col-span-full border border-dashed border-slate-200 rounded-[30px] p-16 text-center bg-white">
                <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Snowflake className="w-7 h-7 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No Bulk Milk Coolers Defined</h3>
                <p className="text-slate-400 text-xs font-semibold mt-1 max-w-sm mx-auto">Define BMC units to index cooling storage capacity.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Define/Edit Cooler Form Modal */}
      {showBmcModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-[28px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-[#16223F]">{editingBmc ? 'Edit specifications' : 'Define Bulk Milk Cooler'}</h3>
                <p className="text-xs text-slate-400 font-semibold">Register or update milk storage capacities.</p>
              </div>
              <button 
                onClick={() => setShowBmcModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBmc} className="p-8 space-y-5 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cooler Name</label>
                  <input
                    type="text"
                    required
                    value={bmcFormData.name}
                    onChange={(e) => setBmcFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Tank A"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#16223F] text-sm text-[#16223F] bg-slate-50/50 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cooler Code</label>
                  <input
                    type="text"
                    required
                    value={bmcFormData.code}
                    onChange={(e) => setBmcFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g. BMC-001"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#16223F] text-sm text-[#16223F] bg-slate-50/50 focus:bg-white transition-all uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Capacity (Liters)</label>
                  <input
                    type="number"
                    required
                    value={bmcFormData.capacity}
                    onChange={(e) => setBmcFormData(prev => ({ ...prev, capacity: e.target.value }))}
                    placeholder="e.g. 5000"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#16223F] text-sm text-[#16223F] bg-slate-50/50 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</label>
                  <select
                    value={bmcFormData.status}
                    onChange={(e) => setBmcFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#16223F] text-sm font-semibold text-[#16223F] bg-white transition-all"
                  >
                    <option value="ACTIVE">Active (Available)</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
              </div>

              {userRole === 'SUPER_ADMIN' ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Enterprise Farm Unit</label>
                  <select
                    required
                    value={bmcFormData.farmId}
                    onChange={(e) => setBmcFormData(prev => ({ ...prev, farmId: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#16223F] text-sm font-semibold text-[#16223F] bg-white transition-all"
                  >
                    <option value="" disabled>Select Farm</option>
                    {farms.map(f => (
                      <option key={f._id} value={f._id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Location / Facility Section</label>
                <input
                  type="text"
                  value={bmcFormData.location}
                  onChange={(e) => setBmcFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. Shed 1, North Side Cooler Station"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#16223F] text-sm text-[#16223F] bg-slate-50/50 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  value={bmcFormData.description}
                  onChange={(e) => setBmcFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Notes about coolant type, manufacturer..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#16223F] text-sm text-[#16223F] bg-slate-50/50 focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBmcModal(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#16223F] hover:bg-[#253966] text-white rounded-xl text-xs font-bold shadow flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? 'Saving...' : (editingBmc ? 'Save Specs' : 'Define Cooler')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
