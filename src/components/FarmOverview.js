import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { api } from '@/utils/api';
import SkeletonLoader from './SkeletonLoader';

export default function FarmOverview({ farmCode }) {
  const [metrics, setMetrics] = useState({
    totalCattle: 0,
    activeSheds: 0,
    sickAnimals: 0,
    milkProduction: 0
  });
  const [farmSheds, setFarmSheds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const [cattle, sheds, treatments, milk, farms] = await Promise.all([
          api.cattle.getAll().catch(() => []),
          api.sheds.getAll().catch(() => []),
          api.health.treatments.getAll().catch(() => []),
          api.milk.collections.getAll().catch(() => []),
          api.farms.getAll().catch(() => [])
        ]);

        const currentFarm = (farms || []).find(f => 
          f.code?.toUpperCase() === farmCode || 
          f.name?.toUpperCase().includes(farmCode)
        );
        const currentFarmId = currentFarm?._id || currentFarm?.id;

        const isCurrentFarm = (item) => {
          if (item.farmId && typeof item.farmId === 'object') {
            const fCode = item.farmId.code || item.farmId.name || '';
            if (fCode.toUpperCase().includes(farmCode)) return true;
            if (currentFarmId && (item.farmId._id === currentFarmId || item.farmId.id === currentFarmId)) return true;
          }
          
          const rawId = typeof item.farmId === 'string' ? item.farmId : (typeof item.farm === 'string' ? item.farm : null);
          if (rawId && currentFarmId && rawId === currentFarmId) {
            return true;
          }

          const itemCode = item.farmId?.code || item.farmId?.name || rawId;
          if (typeof itemCode === 'string' && itemCode.toUpperCase().includes(farmCode)) return true;

          if (typeof item.shed === 'string' && item.shed.toUpperCase().includes(farmCode)) return true;
          
          return false;
        };

        const totalCattle = (cattle || []).filter(isCurrentFarm).length;
        const activeSheds = (sheds || []).filter(s => isCurrentFarm(s) && s.status === 'ACTIVE').length;
        const sickAnimals = (treatments || []).filter(t => isCurrentFarm(t) && t.healthStatus === 'Pending').length;
        
        const farmMilk = (milk || []).filter(isCurrentFarm);
        const milkProduction = farmMilk.reduce((sum, record) => sum + (Number(record.quantity) || 0), 0);

        setMetrics({
          totalCattle,
          activeSheds,
          sickAnimals,
          milkProduction
        });
        
        setFarmSheds((sheds || []).filter(isCurrentFarm));
      } catch (err) {
        console.error("Failed to fetch farm overview metrics", err);
      } finally {
        setLoading(false);
      }
    };

    if (farmCode) {
      fetchMetrics();
    }
  }, [farmCode]);

  // Cleaned up skeleton container to accurately reflect the real grid dimensions
  if (loading) {
    return (
      <div className="w-full h-full overflow-auto pb-8 p-4">
        {/* Top Metric Cards Skeleton */}
        <div className="mb-8">
          <SkeletonLoader type="cards" columns={4} />
        </div>
        
        {/* Shed Section Title Skeleton */}
        <div className="px-2 mb-6 w-48">
          <SkeletonLoader type="block" height="h-7" />
        </div>

        {/* Shed Grid Cards Skeleton */}
        <div>
          <SkeletonLoader type="cards" columns={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto pb-8">
      {/* METRIC CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4">
        {/* TOTAL CATTLE CARD */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-inner">
              🐄
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-emerald-600 bg-emerald-100/50 border border-emerald-200/50">ACTIVE</span>
          </div>
          <h3 className="text-3xl font-black text-[#16223F] tracking-tight">{metrics.totalCattle}</h3>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mt-1">Total Cattle</p>
        </div>

        {/* MILK PRODUCTION CARD */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-2xl shadow-inner">
              🥛
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-blue-600 bg-blue-100/50 border border-blue-200/50">ALL TIME</span>
          </div>
          <h3 className="text-3xl font-black text-[#16223F] tracking-tight">{metrics.milkProduction} <span className="text-lg text-gray-400 font-bold tracking-normal">Ltr</span></h3>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mt-1">Milk Collected</p>
        </div>

        {/* ACTIVE SHEDS CARD */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-2xl shadow-inner">
              🏠
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-emerald-600 bg-emerald-100/50 border border-emerald-200/50">ONLINE</span>
          </div>
          <h3 className="text-3xl font-black text-[#16223F] tracking-tight">{metrics.activeSheds}</h3>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mt-1">Active Sheds</p>
        </div>

        {/* SICK ANIMALS CARD */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center text-2xl shadow-inner">
              🏥
            </div>
            {metrics.sickAnimals > 0 ? (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-red-600 bg-red-100/50 border border-red-200/50">NEEDS ATTENTION</span>
            ) : (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-emerald-600 bg-emerald-100/50 border border-emerald-200/50">ALL HEALTHY</span>
            )}
          </div>
          <h3 className="text-3xl font-black text-[#16223F] tracking-tight">{metrics.sickAnimals}</h3>
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mt-1">Pending Treatments</p>
        </div>
      </div>

      {/* FARM SHEDS SECTION */}
      <div className="px-4 mt-8">
        <h2 className="text-xl font-extrabold text-[#16223F] mb-6 tracking-tight flex items-center gap-2">
          <span className="text-2xl">🏠</span> Active Sheds
        </h2>
        
        {farmSheds.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center">
            <p className="text-gray-400 font-bold">No sheds found for this farm.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {farmSheds.map(shed => (
              <div key={shed._id || shed.id} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 hover:shadow-md transition-shadow relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${shed.status === 'ACTIVE' ? 'from-emerald-100/50 to-emerald-50/10' : 'from-rose-100/50 to-rose-50/10'} rounded-bl-full -mr-8 -mt-8`}></div>
                
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{shed.farmId?.name || farmCode}</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${shed.status === 'ACTIVE' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/50' : 'text-rose-700 bg-rose-50 border border-rose-200/50'}`}>
                    {shed.status || 'ACTIVE'}
                  </span>
                </div>
                
                <h4 className="text-2xl font-black text-[#16223F] mb-1">Shed {shed.code}</h4>
                
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Rows</span>
                    <span className="text-[#16223F] font-black">{shed.lines || 0}</span>
                  </div>
                  <div className="w-px h-6 bg-gray-100"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Capacity</span>
                    <span className="text-[#16223F] font-black">{shed.capacity || 0} <span className="text-gray-400 font-normal text-xs">head</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}