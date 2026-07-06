
import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { swalSuccess, swalError, swalConfirm } from '../utils/swal';
import SkeletonLoader from './SkeletonLoader';
import { 
  Map, 
  Tractor, 
  Plus, 
  Edit, 
  Trash2, 
  X,
  Layers,
  FileText,
  User,
  Phone,
  Calendar,
  MapPin
} from 'lucide-react';

export default function LandManagementPg() {
  const [lands, setLands] = useState([]);
  const [farms, setFarms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [userRole, setUserRole] = useState('');
  const [userFarmId, setUserFarmId] = useState('');

  // Modals state
  const [showLandForm, setShowLandForm] = useState(false);
  const [editingLand, setEditingLand] = useState(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [farmFilter, setFarmFilter] = useState('ALL');

  // Form state
  const [landFormData, setLandFormData] = useState({
    name: '',
    code: '',
    farmId: '',
    totalArea: '',
    unit: 'Acres',
    location: '',
    description: '',
    ownershipType: 'OWNED',
    landownerName: '',
    landownerPhone: '',
    rentAmount: '',
    paymentInterval: 'Monthly',
    leaseStartDate: '',
    leaseEndDate: ''
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

      const [landsData, farmsData] = await Promise.all([
        api.lands.getAll(),
        api.farms.getAll()
      ]);

      setLands(Array.isArray(landsData) ? landsData : (landsData?.data ?? []));
      setFarms(Array.isArray(farmsData) ? farmsData : (farmsData?.data ?? []));
    } catch (error) {
      console.error('Failed to fetch land management data', error);
      swalError('Error', 'Failed to retrieve data from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Set default farm for land form when farms are loaded
  useEffect(() => {
    if (farms.length > 0 && !landFormData.farmId) {
      if (userRole !== 'SUPER_ADMIN' && userFarmId) {
        setLandFormData(prev => ({ ...prev, farmId: userFarmId }));
      } else {
        setLandFormData(prev => ({ ...prev, farmId: farms[0]._id }));
      }
    }
  }, [farms, userRole, userFarmId]);

  const handleOpenCreateModal = () => {
    setEditingLand(null);
    setLandFormData({
      name: '',
      code: '',
      farmId: userRole !== 'SUPER_ADMIN' && userFarmId ? userFarmId : (farms[0]?._id || ''),
      totalArea: '',
      unit: 'Acres',
      location: '',
      description: '',
      ownershipType: 'OWNED',
      landownerName: '',
      landownerPhone: '',
      rentAmount: '',
      paymentInterval: 'Monthly',
      leaseStartDate: '',
      leaseEndDate: ''
    });
    setShowLandForm(true);
  };

  const handleOpenEditModal = (land) => {
    setEditingLand(land);
    setLandFormData({
      name: land.name,
      code: land.code,
      farmId: land.farmId?._id || land.farmId || '',
      totalArea: land.totalArea.toString(),
      unit: land.unit,
      location: land.location || '',
      description: land.description || '',
      ownershipType: land.ownershipType || 'OWNED',
      landownerName: land.landownerName || '',
      landownerPhone: land.landownerPhone || '',
      rentAmount: land.rentAmount ? land.rentAmount.toString() : '',
      paymentInterval: land.paymentInterval || 'Monthly',
      leaseStartDate: land.leaseStartDate ? new Date(land.leaseStartDate).toISOString().substring(0, 10) : '',
      leaseEndDate: land.leaseEndDate ? new Date(land.leaseEndDate).toISOString().substring(0, 10) : ''
    });
    setShowLandForm(true);
  };

  const handleSaveLand = async (e) => {
    e.preventDefault();
    if (!landFormData.name.trim() || !landFormData.code.trim() || !landFormData.totalArea) {
      swalError('Validation Error', 'Please fill in all required fields.');
      return;
    }

    if (landFormData.ownershipType === 'LEASED' && !landFormData.landownerName.trim()) {
      swalError('Validation Error', 'Landowner Name is required for leased land.');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      ...landFormData,
      totalArea: parseFloat(landFormData.totalArea),
      rentAmount: landFormData.ownershipType === 'LEASED' ? parseFloat(landFormData.rentAmount || '0') : 0,
      leaseStartDate: landFormData.ownershipType === 'LEASED' && landFormData.leaseStartDate ? new Date(landFormData.leaseStartDate).toISOString() : null,
      leaseEndDate: landFormData.ownershipType === 'LEASED' && landFormData.leaseEndDate ? new Date(landFormData.leaseEndDate).toISOString() : null
    };

    try {
      if (editingLand) {
        await api.lands.update(editingLand._id, payload);
        swalSuccess('Success', 'Land specifications updated successfully.');
      } else {
        await api.lands.create(payload);
        swalSuccess('Success', 'Land area defined successfully.');
      }
      setShowLandForm(false);
      fetchData();
    } catch (error) {
      console.error(error);
      swalError('Error', typeof error === 'string' ? error : 'Failed to save land details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLand = async (id) => {
    const confirmed = await swalConfirm('Delete Land?', 'Are you sure you want to delete this land area?');
    if (!confirmed) return;

    try {
      await api.lands.delete(id);
      swalSuccess('Deleted', 'Land parcel removed successfully.');
      fetchData();
    } catch (error) {
      console.error(error);
      swalError('Error', 'Failed to delete land.');
    }
  };

  const handleRegrow = async (land) => {
    const confirmed = await swalConfirm('Regrow Grass?', 'Are you sure you want to reset the harvested/utilized grass acreage for this land back to 0.00 for the next cycle?');
    if (!confirmed) return;
    try {
      await api.lands.update(land._id, { lastRegrownAt: new Date().toISOString() });
      swalSuccess('Success', 'Grass cycle reset successfully. Available area is restored.');
      fetchData();
    } catch (err) {
      console.error(err);
      swalError('Error', 'Failed to reset grass cycle.');
    }
  };

  const handleUpdateStatus = async (land, status) => {
    try {
      await api.lands.update(land._id, { status });
      swalSuccess('Status Updated', `Land status changed to ${status}.`);
      fetchData();
    } catch (error) {
      console.error(error);
      swalError('Error', 'Failed to update status.');
    }
  };

  // Calculations for stats
  const totalLandCount = lands.length;
  const availableLandsCount = lands.filter(l => l.status === 'AVAILABLE').length;
  const leasedLandsCount = lands.filter(l => l.ownershipType === 'LEASED').length;
  
  const totalAreaAcres = lands.reduce((sum, land) => {
    let area = land.totalArea;
    if (land.unit === 'Hectares') area = land.totalArea * 2.47105;
    if (land.unit === 'Sq Meters') area = land.totalArea * 0.000247105;
    return sum + area;
  }, 0);

  // Filters logic
  const filteredLands = lands.filter((land) => {
    const matchesSearch = 
      (land.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (land.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (land.landownerName || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || land.status === statusFilter;
    
    const landFarmId = land.farmId?._id || land.farmId;
    const matchesFarm = farmFilter === 'ALL' || landFarmId === farmFilter;

    return matchesSearch && matchesStatus && matchesFarm;
  });

  const leasedLandsOnly = lands.filter((land) => {
    if (land.ownershipType !== 'LEASED') return false;
    const matchesSearch = 
      (land.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (land.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (land.landownerName || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const landFarmId = land.farmId?._id || land.farmId;
    const matchesFarm = farmFilter === 'ALL' || landFarmId === farmFilter;
    return matchesSearch && matchesFarm;
  });

  const activeStyle = "border-[#D1867D] text-[#D1867D] border-b-2 font-black";
  const normalStyle = "border-transparent text-slate-500 hover:text-slate-900 border-b-2 font-bold";

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col bg-transparent text-slate-800 font-sans">
      {/* HEADER SECTION */}
      <div className="flex-none flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#16223F] tracking-tight">
            Land Management
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Define owned or leased lands used for grass cultivation of animals.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="bg-[#16223F] hover:bg-[#2a3f75] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
        >
          <span>+ Define Land Area</span>
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6 flex-none">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Area Cultivated</span>
              <h3 className="text-2xl font-black text-[#16223F] leading-none">
                {totalAreaAcres.toFixed(1)} <span className="text-xs font-bold text-slate-500">Acres</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold">Across {totalLandCount} parcels</p>
            </div>
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Available Areas</span>
              <h3 className="text-2xl font-black text-emerald-600 leading-none">
                {availableLandsCount} <span className="text-xs font-bold text-emerald-400">units</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold">Ready for grass cultivation</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Map className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Leased Parcels</span>
              <h3 className="text-2xl font-black text-blue-600 leading-none">
                {leasedLandsCount} <span className="text-xs font-bold text-blue-400">units</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold">Acquired from landowners</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-200 mb-5 flex-none">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-3 text-sm transition-all ${activeTab === 'all' ? activeStyle : normalStyle}`}
        >
          All Land Parcels
        </button>
        <button
          onClick={() => setActiveTab('leases')}
          className={`px-4 py-3 text-sm transition-all ${activeTab === 'leases' ? activeStyle : normalStyle}`}
        >
          Leased Lands ({leasedLandsCount})
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 flex flex-col md:flex-row gap-4 items-center justify-between flex-none">
        <div className="flex flex-1 flex-col sm:flex-row gap-4 w-full">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search lands by name, code or landowner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-4 text-sm font-semibold text-[#16223F] outline-none focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 transition-all duration-200"
            />
          </div>

          {activeTab === 'all' && (
            <div className="w-full sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm font-semibold text-[#16223F] outline-none focus:bg-white focus:border-[#D1867D] transition-all duration-200"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
          )}

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

      {/* CONTENT REGION */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SkeletonLoader type="card" />
            <SkeletonLoader type="card" />
            <SkeletonLoader type="card" />
          </div>
        ) : activeTab === 'all' ? (
          /* Lands Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLands.map((land) => {
              const landFarm = farms.find(f => f._id === (land.farmId?._id || land.farmId));
              return (
                <div 
                  key={land._id} 
                  className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:border-[#D1867D]/60 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="p-6 space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                          <Map className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-[#16223F] text-md leading-tight truncate max-w-[140px]">{land.name}</h4>
                          <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">{land.code}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border ${
                          land.ownershipType === 'LEASED'
                            ? 'bg-blue-50 text-blue-600 border-blue-100'
                            : 'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                          {land.ownershipType || 'OWNED'}
                        </span>
                        <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full border ${
                          land.status === 'AVAILABLE' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {land.status}
                        </span>
                      </div>
                    </div>

                    {/* Specifications */}
                    {(() => {
                      const utilizedArea = land.utilizedArea || 0;
                      let totalAreaAcres = land.totalArea || 0;
                      if (land.unit === 'Hectares') totalAreaAcres = totalAreaAcres * 2.47105;
                      if (land.unit === 'Sq Meters') totalAreaAcres = totalAreaAcres * 0.000247105;
                      const availableArea = Math.max(0, totalAreaAcres - utilizedArea);
                      return (
                        <div className="space-y-2 text-xs text-slate-600 font-medium">
                          <div className="flex justify-between border-b border-slate-100 pb-1.5">
                            <span className="text-slate-400">Total Area</span>
                            <span className="font-bold text-slate-800">{land.totalArea} {land.unit} {land.unit !== 'Acres' && `(~${totalAreaAcres.toFixed(2)} Acres)`}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1.5">
                            <span className="text-slate-400">Available Grass</span>
                            <span className="font-extrabold text-emerald-600">{availableArea.toFixed(2)} Acres</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-100 pb-1.5">
                            <span className="text-slate-400">Utilized Grass</span>
                            <span className="font-bold text-amber-600">{utilizedArea.toFixed(2)} Acres</span>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="space-y-2 text-xs text-slate-600 font-medium mt-2">
                      <div className="flex justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-slate-400">Enterprise Unit</span>
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <Tractor className="w-3.5 h-3.5 text-slate-400" />
                          {land.farmId?.name || landFarm?.name || 'Unassigned'}
                        </span>
                      </div>
                      {land.location && (
                        <div className="flex items-start gap-2 pt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                          <span className="text-[11px] text-slate-500 line-clamp-1">{land.location}</span>
                        </div>
                      )}
                      {land.description && (
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{land.description}</p>
                        </div>
                      )}
                    </div>

                    {/* Lease Info snippet */}
                    {land.ownershipType === 'LEASED' && land.landownerName && (
                      <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400">Landowner / Lessor</span>
                          {land.rentAmount > 0 && (
                            <span className="text-[11px] font-extrabold text-blue-600">₹{land.rentAmount}/{land.paymentInterval?.toLowerCase().replace('ly', '')}</span>
                          )}
                        </div>
                        <p className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {land.landownerName}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => handleOpenEditModal(land)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 active:scale-95"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteLand(land._id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex gap-1.5 items-center">
                      {(land.utilizedArea || 0) > 0 && (
                        <button
                          onClick={() => handleRegrow(land)}
                          className="bg-teal-50 hover:bg-teal-100 border border-teal-100 text-teal-700 font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all active:scale-95"
                        >
                          🌿 Regrow
                        </button>
                      )}
                      {land.status === 'AVAILABLE' ? (
                        <button
                          onClick={() => handleUpdateStatus(land, 'MAINTENANCE')}
                          className="border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all active:scale-95"
                        >
                          Set Maint.
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(land, 'AVAILABLE')}
                          className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-600 font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all active:scale-95"
                        >
                          Make Available
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredLands.length === 0 && (
              <div className="col-span-full border border-dashed border-slate-200 rounded-[30px] p-16 text-center bg-white">
                <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Map className="w-7 h-7 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">No Land Areas Defined</h3>
                <p className="text-slate-400 text-xs font-semibold mt-1 max-w-sm mx-auto">Define land parcels to manage locations and lease registries.</p>
              </div>
            )}
          </div>
        ) : (
          /* Leases Table View */
          <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Land Parcel</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Landowner Details</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Lease Term</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Rent Cost / Interval</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider">Remaining</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leasedLandsOnly.map((land) => {
                    const now = new Date();
                    const end = land.leaseEndDate ? new Date(land.leaseEndDate) : null;
                    let daysLeft = 0;
                    if (end) {
                      const diffTime = end.getTime() - now.getTime();
                      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    }
                    
                    return (
                      <tr key={land._id} className="hover:bg-slate-50/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                              <Map className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{land.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">{land.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {land.landownerName}
                            </p>
                            {land.landownerPhone && (
                              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                {land.landownerPhone}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-slate-600 space-y-1">
                            <p className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              Start: {land.leaseStartDate ? new Date(land.leaseStartDate).toLocaleDateString() : 'N/A'}
                            </p>
                            <p className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              End: {land.leaseEndDate ? new Date(land.leaseEndDate).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                          ₹{land.rentAmount} <span className="text-[10px] text-slate-400 font-bold uppercase">/ {land.paymentInterval}</span>
                        </td>
                        <td className="px-6 py-4">
                          {end ? (
                            daysLeft > 0 ? (
                              <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                                {daysLeft} days remaining
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full">
                                Expired {Math.abs(daysLeft)} days ago
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">Ongoing</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleOpenEditModal(land)}
                            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg transition-all"
                          >
                            Edit specs
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {leasedLandsOnly.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold text-sm">
                        No active leased lands recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Define/Edit Land Form Modal */}
      {showLandForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-[28px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-[#16223F]">{editingLand ? 'Edit specifications' : 'Define Land Area'}</h3>
                <p className="text-xs text-slate-400 font-semibold">Set land specifications and ownership details.</p>
              </div>
              <button 
                onClick={() => setShowLandForm(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLand} className="p-8 space-y-5 flex-1 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Land Name</label>
                  <input
                    type="text"
                    required
                    value={landFormData.name}
                    onChange={(e) => setLandFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. North Pasture"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#16223F] text-sm text-[#16223F] bg-slate-50/50 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Land Code</label>
                  <input
                    type="text"
                    required
                    value={landFormData.code}
                    onChange={(e) => setLandFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g. LND-001"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#16223F] text-sm text-[#16223F] bg-slate-50/50 focus:bg-white transition-all uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Area</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={landFormData.totalArea}
                    onChange={(e) => setLandFormData(prev => ({ ...prev, totalArea: e.target.value }))}
                    placeholder="e.g. 15.5"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#16223F] text-sm text-[#16223F] bg-slate-50/50 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Unit</label>
                  <select
                    value={landFormData.unit}
                    onChange={(e) => setLandFormData(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#16223F] text-sm font-semibold text-[#16223F] bg-white transition-all"
                  >
                    <option value="Acres">Acres</option>
                    <option value="Hectares">Hectares</option>
                    <option value="Sq Meters">Sq Meters</option>
                  </select>
                </div>
              </div>

              {userRole === 'SUPER_ADMIN' ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Enterprise Farm Unit</label>
                  <select
                    required
                    value={landFormData.farmId}
                    onChange={(e) => setLandFormData(prev => ({ ...prev, farmId: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#16223F] text-sm font-semibold text-[#16223F] bg-white transition-all"
                  >
                    <option value="" disabled>Select Farm</option>
                    {farms.map(f => (
                      <option key={f._id} value={f._id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ownership Type</label>
                  <select
                    value={landFormData.ownershipType}
                    onChange={(e) => setLandFormData(prev => ({ ...prev, ownershipType: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#16223F] text-sm font-semibold text-[#16223F] bg-white transition-all"
                  >
                    <option value="OWNED">Owned (Farm Asset)</option>
                    <option value="LEASED">Leased (Rented from Landowner)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Location / GPS</label>
                  <input
                    type="text"
                    value={landFormData.location}
                    onChange={(e) => setLandFormData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g. GPS section or coordinates"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#16223F] text-sm text-[#16223F] bg-slate-50/50 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Lease Details section - dynamically shown if LEASED */}
              {landFormData.ownershipType === 'LEASED' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 animate-in fade-in duration-200">
                  <h4 className="text-xs font-black text-[#16223F] uppercase tracking-wider border-b border-slate-200 pb-1.5">Lease Details</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Landowner Name</label>
                      <input
                        type="text"
                        required
                        value={landFormData.landownerName}
                        onChange={(e) => setLandFormData(prev => ({ ...prev, landownerName: e.target.value }))}
                        placeholder="e.g. John Smith"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#16223F] text-sm text-[#16223F] bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Landowner Phone</label>
                      <input
                        type="tel"
                        value={landFormData.landownerPhone}
                        onChange={(e) => setLandFormData(prev => ({ ...prev, landownerPhone: e.target.value }))}
                        placeholder="e.g. 555-0100"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#16223F] text-sm text-[#16223F] bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rent Cost (₹)</label>
                      <input
                        type="number"
                        value={landFormData.rentAmount}
                        onChange={(e) => setLandFormData(prev => ({ ...prev, rentAmount: e.target.value }))}
                        placeholder="e.g. 1200"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#16223F] text-sm text-[#16223F] bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Payment Interval</label>
                      <select
                        value={landFormData.paymentInterval}
                        onChange={(e) => setLandFormData(prev => ({ ...prev, paymentInterval: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#16223F] text-sm font-semibold text-[#16223F] bg-white transition-all"
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lease Start Date</label>
                      <input
                        type="date"
                        value={landFormData.leaseStartDate}
                        onChange={(e) => setLandFormData(prev => ({ ...prev, leaseStartDate: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#16223F] text-sm font-semibold text-[#16223F] bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lease End Date</label>
                      <input
                        type="date"
                        value={landFormData.leaseEndDate}
                        onChange={(e) => setLandFormData(prev => ({ ...prev, leaseEndDate: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#16223F] text-sm font-semibold text-[#16223F] bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Description / Soil specs</label>
                <textarea
                  value={landFormData.description}
                  onChange={(e) => setLandFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Notes about grass cultivation, soil type..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#16223F] text-sm text-[#16223F] bg-slate-50/50 focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowLandForm(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#16223F] hover:bg-[#253966] text-white rounded-xl text-xs font-bold shadow flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? 'Saving...' : (editingLand ? 'Save Specs' : 'Define Area')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
