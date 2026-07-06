import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { swalSuccess, swalError, swalConfirm } from '../utils/swal';
import SkeletonLoader from './SkeletonLoader';
import { 
  Dna,
  Plus, 
  Edit, 
  Trash2, 
  X,
  Layers,
  Calendar,
  Search,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export default function InseminationManagementPg() {
  const [straws, setStraws] = useState([]);
  const [farms, setFarms] = useState([]);
  const [breeds, setBreeds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [userFarmId, setUserFarmId] = useState('');

  // Modals state
  const [showStrawForm, setShowStrawForm] = useState(false);
  const [editingStraw, setEditingStraw] = useState(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [breedFilter, setBreedFilter] = useState('ALL');
  const [farmFilter, setFarmFilter] = useState('ALL');

  // Form state
  const [formData, setFormData] = useState({
    batchNo: '',
    breed: '',
    noOfStraws: '',
    expiryDate: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    price: '',
    farmId: '',
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

      const [strawsData, farmsData, breedsData] = await Promise.all([
        api.semenStraws.getAll(),
        api.farms.getAll(),
        api.breeds.getAll()
      ]);

      setStraws(Array.isArray(strawsData) ? strawsData : (strawsData?.data ?? []));
      setFarms(Array.isArray(farmsData) ? farmsData : (farmsData?.data ?? []));
      setBreeds(Array.isArray(breedsData) ? breedsData : (breedsData?.data ?? []));
    } catch (error) {
      console.error('Failed to fetch semen straws data', error);
      swalError('Error', 'Failed to retrieve records from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Set default farm for form when farms are loaded
  useEffect(() => {
    if (farms.length > 0 && !formData.farmId) {
      if (userRole !== 'SUPER_ADMIN' && userFarmId) {
        setFormData(prev => ({ ...prev, farmId: userFarmId }));
      } else {
        setFormData(prev => ({ ...prev, farmId: farms[0]._id }));
      }
    }
  }, [farms, userRole, userFarmId]);

  const handleOpenCreateModal = () => {
    setEditingStraw(null);
    setFormData({
      batchNo: '',
      breed: '',
      noOfStraws: '',
      expiryDate: '',
      purchaseDate: '',
      price: '',
      farmId: userRole !== 'SUPER_ADMIN' && userFarmId ? userFarmId : (farms[0]?._id || ''),
      status: 'ACTIVE'
    });
    setShowStrawForm(true);
  };

  const handleOpenEditModal = (straw) => {
    setEditingStraw(straw);
    setFormData({
      batchNo: straw.batchNo,
      breed: straw.breed,
      noOfStraws: straw.noOfStraws,
      expiryDate: straw.expiryDate ? new Date(straw.expiryDate).toISOString().split('T')[0] : '',
      purchaseDate: straw.purchaseDate ? new Date(straw.purchaseDate).toISOString().split('T')[0] : '',
      price: straw.price || '',
      farmId: straw.farmId && typeof straw.farmId === 'object' ? (straw.farmId._id || straw.farmId.id) : (straw.farmId || ''),
      status: straw.status || 'ACTIVE'
    });
    setShowStrawForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await swalConfirm('Are you sure?', 'This will soft delete this semen straw batch record.');
    if (!confirmed) return;

    try {
      await api.semenStraws.delete(id);
      swalSuccess('Deleted', 'Semen straw batch deleted successfully.');
      fetchData();
    } catch (error) {
      console.error(error);
      swalError('Error', 'Failed to delete record.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.batchNo.trim()) return swalError('Validation Error', 'Batch Number is required');
    if (!formData.breed.trim()) return swalError('Validation Error', 'Breed is required');
    if (formData.noOfStraws === '' || Number(formData.noOfStraws) < 0) {
      return swalError('Validation Error', 'Total straws must be 0 or more');
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        noOfStraws: Number(formData.noOfStraws),
        price: formData.price !== '' ? Number(formData.price) : 0,
        expiryDate: formData.expiryDate || null
      };

      if (editingStraw) {
        await api.semenStraws.update(editingStraw._id, payload);
        swalSuccess('Success', 'Semen straw batch updated successfully.');
      } else {
        await api.semenStraws.create(payload);
        swalSuccess('Success', 'Semen straw batch added successfully.');
      }
      setShowStrawForm(false);
      fetchData();
    } catch (error) {
      console.error(error);
      swalError('Error', error.response?.data?.message || 'Failed to save semen straw batch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter logic
  const filteredStraws = straws.filter(s => {
    const matchesSearch = s.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.breed.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesBreed = breedFilter === 'ALL' || s.breed === breedFilter;
    
    const strawFarmId = s.farmId && typeof s.farmId === 'object' ? (s.farmId._id || s.farmId.id) : s.farmId;
    const matchesFarm = farmFilter === 'ALL' || String(strawFarmId) === String(farmFilter);

    return matchesSearch && matchesBreed && matchesFarm;
  });

  // Calculate statistics
  const totalPurchased = filteredStraws.reduce((acc, curr) => acc + (curr.noOfStraws || 0), 0);
  const totalUsed = filteredStraws.reduce((acc, curr) => acc + (curr.usedStraws || 0), 0);
  const totalAvailable = totalPurchased - totalUsed;
  const totalCost = filteredStraws.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.noOfStraws || 0)), 0);

  // Distinct breeds list for filter dropdown
  const uniqueBreeds = Array.from(new Set(straws.map(s => s.breed).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <span className="p-2 bg-[#16223F]/10 text-[#16223F] rounded-xl">
              <Dna className="w-6 h-6 animate-pulse" />
            </span>
            Insemination Management
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage semen straw inventory and track usage for Artificial Insemination.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-5 py-3 bg-[#16223F] hover:bg-[#2a3f75] text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 text-sm"
        >
          <Plus className="w-5 h-5" />
          Add Semen Straw Batch
        </button>
      </div>

      {/* STATS TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Straws</p>
            <h3 className="text-3xl font-black text-slate-800">{totalPurchased}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Used Straws</p>
            <h3 className="text-3xl font-black text-slate-800">{totalUsed}</h3>
          </div>
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Available Straws</p>
            <h3 className="text-3xl font-black text-[#16223F]">{totalAvailable}</h3>
          </div>
          <div className="p-3 bg-[#16223F]/10 text-[#16223F] rounded-xl">
            <Dna className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Batch or Breed..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16223F]/20 focus:border-[#16223F] text-slate-700 font-medium"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Breed Filter */}
          <select
            value={breedFilter}
            onChange={(e) => setBreedFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16223F]/20 focus:border-[#16223F] text-slate-700 font-medium"
          >
            <option value="ALL">All Breeds</option>
            {uniqueBreeds.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Farm Filter (SUPER_ADMIN) */}
          {userRole === 'SUPER_ADMIN' && (
            <select
              value={farmFilter}
              onChange={(e) => setFarmFilter(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16223F]/20 focus:border-[#16223F] text-slate-700 font-medium"
            >
              <option value="ALL">All Farms</option>
              {farms.map(f => (
                <option key={f._id} value={f._id}>{f.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* TABLE/GRID SECTION */}
      {isLoading ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <SkeletonLoader count={5} />
        </div>
      ) : filteredStraws.length === 0 ? (
        <div className="bg-white py-12 px-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="p-4 bg-[#16223F]/10 text-[#16223F] rounded-full w-fit mx-auto">
            <Dna className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-slate-800 mt-4">No Semen Straw Batches found</h4>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2">
            Try adjusting your search criteria, or click "Add Semen Straw Batch" to register a new straw batch.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">Batch Number</th>
                  <th className="px-6 py-4">Breed</th>
                  <th className="px-6 py-4">Straws Remaining</th>
                  <th className="px-6 py-4">Price / Straw</th>
                  <th className="px-6 py-4">Purchase Date</th>
                  <th className="px-6 py-4">Expiry Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                {filteredStraws.map(s => {
                  const rem = s.noOfStraws - s.usedStraws;
                  const isLow = rem <= 5;
                  const isExpired = s.expiryDate && new Date(s.expiryDate) < new Date();

                  return (
                    <tr key={s._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{s.batchNo}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold">
                          {s.breed}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-base font-black ${isLow ? 'text-rose-500' : 'text-slate-800'}`}>
                            {rem}
                          </span>
                          <span className="text-slate-400 font-medium">/ {s.noOfStraws} total</span>
                          {isLow && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                              <AlertTriangle className="w-3 h-3" /> Low Stock
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">₹{s.price || 0}</td>
                      <td className="px-6 py-4 font-medium text-slate-500">
                        {s.purchaseDate ? new Date(s.purchaseDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-medium ${isExpired ? 'text-rose-500 font-bold' : 'text-slate-500'}`}>
                          {s.expiryDate ? new Date(s.expiryDate).toLocaleDateString() : 'N/A'}
                          {isExpired && ' (Expired)'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(s)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-[#16223F] rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(s._id)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-rose-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {showStrawForm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden transform transition-all duration-300 my-8">
            <div className="bg-[#16223F] px-6 py-4 flex justify-between items-center text-white">
              <h3 className="font-black text-lg tracking-tight flex items-center gap-2">
                <Dna className="w-5 h-5" />
                {editingStraw ? 'Edit Semen Straw Batch' : 'Add Semen Straw Batch'}
              </h3>
              <button
                onClick={() => setShowStrawForm(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.batchNo}
                    disabled={!!editingStraw}
                    onChange={(e) => setFormData(prev => ({ ...prev, batchNo: e.target.value }))}
                    placeholder="e.g. BATCH-A20"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16223F]/20 focus:border-[#16223F] font-semibold disabled:bg-slate-100 disabled:text-slate-400 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Breed
                  </label>
                  <select
                    value={formData.breed}
                    required
                    onChange={(e) => setFormData(prev => ({ ...prev, breed: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16223F]/20 focus:border-[#16223F] font-semibold"
                  >
                    <option value="" disabled>Select Breed</option>
                    {breeds.map(b => (
                      <option key={b._id} value={b.name}>{b.name}</option>
                    ))}
                    {breeds.length === 0 && <option value="">No breeds available</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Total Straws Purchased
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.noOfStraws}
                    onChange={(e) => setFormData(prev => ({ ...prev, noOfStraws: e.target.value }))}
                    placeholder="e.g. 50"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16223F]/20 focus:border-[#16223F] font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16223F]/20 focus:border-[#16223F] font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16223F]/20 focus:border-[#16223F] font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Price per Straw (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="e.g. 150"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16223F]/20 focus:border-[#16223F] font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16223F]/20 focus:border-[#16223F] font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                {userRole === 'SUPER_ADMIN' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Assign to Farm
                    </label>
                    <select
                      value={formData.farmId}
                      onChange={(e) => setFormData(prev => ({ ...prev, farmId: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16223F]/20 focus:border-[#16223F] font-semibold"
                    >
                      {farms.map(f => (
                        <option key={f._id} value={f._id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStrawForm(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-bold transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#16223F] hover:bg-[#2a3f75] disabled:bg-[#16223F]/40 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-300 text-sm"
                >
                  {isSubmitting ? 'Saving...' : editingStraw ? 'Update Batch' : 'Add Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
