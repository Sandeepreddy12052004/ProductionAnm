import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { api } from '@/utils/api';
import SkeletonLoader from './SkeletonLoader';

export default function FarmOverview({ farmCode }) {
  const router = useRouter();

  // --- Client-Side API Firewall state ---
  const [userObj, setUserObj] = useState(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) setUserObj(JSON.parse(storedUser));
    } catch (e) {
      console.error("[FarmOverview] Failed to read user session:", e);
    }
  }, []);

  /**
   * Checks whether the current user session holds can_view access for a module.
   * Supports both string-array and object-array permission schemas defensively.
   * @param {string} moduleKey
   * @returns {boolean}
   */
  const hasAccess = (moduleKey) => {
    if (!userObj) return false;
    const role = userObj.role || '';
    if (role.trim().toUpperCase() === 'SUPER_ADMIN') return true;
    const permissions = userObj.permissions;
    if (!Array.isArray(permissions)) return false;
    const hasAllAccess = permissions.some(
      p => typeof p === 'string' && p.trim().toUpperCase() === 'ALL'
    );
    if (hasAllAccess) return true;

    const permission = permissions.find((p) => {
      if (!p) return false;
      if (typeof p === 'object') {
        return String(p.module_key || '').trim().toLowerCase() === moduleKey.trim().toLowerCase();
      }
      if (typeof p === 'string') {
        const lowerP = p.trim().toLowerCase();
        const lowerModKey = moduleKey.trim().toLowerCase();
        return lowerP === lowerModKey || lowerP.startsWith(lowerModKey + '_') || lowerP.includes(lowerModKey);
      }
      return false;
    });
    if (!permission) return false;
    if (typeof permission === 'object') return !!permission.can_view;
    return true;
  };
  // --- end firewall state ---

  const [metrics, setMetrics] = useState({
    totalCattle: 0,
    activeSheds: 0,
    sickAnimals: 0,
    milkProduction: 0
  });
  const [farmSheds, setFarmSheds] = useState([]);
  const [inactiveAnimals, setInactiveAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);
      try {
        const [cattle, sheds, treatments, milk, farms] = await Promise.all([
          api.cattle.getAll().catch(err => ({ isError: true, message: err })),
          api.sheds.getAll().catch(err => ({ isError: true, message: err })),
          api.health.treatments.getAll().catch(err => ({ isError: true, message: err })),
          api.milk.collections.getAll().catch(err => ({ isError: true, message: err })),
          api.farms.getAll().catch(err => ({ isError: true, message: err }))
        ]);

        // Validate and isolate network/permission failure flags gracefully
        let authFailed = false;
        let authErrorMsg = "";

        const checkPayload = (res, name) => {
          if (!res) {
            return;
          }
          if (typeof res === 'object') {
            if (res.isError) {
              const errMsg = String(res.message || '');
              if (errMsg.includes("Access Forbidden") || errMsg.includes("permissions") || errMsg.includes("Unauthorized")) {
                if (name === "farms" || name === "sheds") {
                  return;
                }
                authFailed = true;
                authErrorMsg = errMsg;
                return;
              }
              if (name === "farms" || name === "sheds") {
                return;
              }
              throw new Error(res.message || `Failed to retrieve ${name} from database.`);
            }
            if (res.success === false || res.error) {
              const errMsg = String(res.error || '');
              if (errMsg.includes("Access Forbidden") || errMsg.includes("permissions") || errMsg.includes("Unauthorized") || res.success === false) {
                if (name === "farms" || name === "sheds") {
                  return;
                }
                authFailed = true;
                authErrorMsg = errMsg || "Access restricted.";
                return;
              }
              if (name === "farms" || name === "sheds") {
                return;
              }
              throw new Error(res.error || `Access restricted or failure in fetching ${name}.`);
            }
          }
        };

        checkPayload(cattle, "cattle");
        checkPayload(sheds, "sheds");
        checkPayload(treatments, "health treatments");
        checkPayload(milk, "milk collections");
        checkPayload(farms, "farms");

        if (authFailed) {
          console.error("Authorization check failed:", authErrorMsg);
          
          // Silently route the user to their first valid accessible module path
          const storedUser = localStorage.getItem("user");
          let userObj = null;
          if (storedUser) {
            try {
              userObj = JSON.parse(storedUser);
            } catch (e) {}
          }

          const hasAccess = (moduleKey) => {
            if (!userObj) return false;
            const role = userObj.role || '';
            if (role.trim().toUpperCase() === 'SUPER_ADMIN') return true;
            const permissions = userObj.permissions;
            if (!Array.isArray(permissions)) return false;
            const hasAllAccess = permissions.some(p => typeof p === 'string' && p.trim().toUpperCase() === 'ALL');
            if (hasAllAccess) return true;

            const permission = permissions.find((p) => {
              if (!p) return false;
              if (typeof p === 'object') {
                return String(p.module_key || '').trim().toLowerCase() === moduleKey.trim().toLowerCase();
              }
              if (typeof p === 'string') {
                const lowerP = p.trim().toLowerCase();
                const lowerModKey = moduleKey.trim().toLowerCase();
                return lowerP === lowerModKey || lowerP.startsWith(lowerModKey + '_') || lowerP.includes(lowerModKey);
              }
              return false;
            });

            if (!permission) return false;
            if (typeof permission === 'object') return !!permission.can_view;
            return true;
          };

          const routes = [
            { key: 'USER_MANAGEMENT', path: '/users' },
            { key: 'DEPARTMENT', path: '/department' },
            { key: 'ROLES', path: '/roles' },
            { key: 'FARM_MANAGEMENT', path: '/farms' },
            { key: 'SHED_MANAGEMENT', path: '/shed-management' },
            { key: 'CATTLE_MANAGEMENT', path: '/animals' },
            { key: 'LIVESTOCK', path: '/animals' },
            { key: 'SHED_LOG', path: '/shed' },
            { key: 'CROSSING_LOG', path: '/crossing' },
            { key: 'PURCHASE_LOG', path: '/purchase' },
            { key: 'SALE_LOG', path: '/sale' },
            { key: 'HEALTH', path: `/farm/${farmCode}?tab=health` },
            { key: 'INVENTORY', path: `/farm/${farmCode}?tab=feed_inv` },
            { key: 'GRASS', path: `/farm/${farmCode}?tab=grass` },
            { key: 'FEEDING', path: `/farm/${farmCode}?tab=feeding` },
            { key: 'MILK', path: `/farm/${farmCode}?tab=milk_prod` }
          ];

          const targetRoute = routes.find(r => hasAccess(r.key))?.path || '/profile';
          router.push(targetRoute);
          return;
        }

        const extractArray = (res) => {
          if (Array.isArray(res)) return res;
          if (res && Array.isArray(res.data)) return res.data;
          return [];
        };

        const cattleArray = extractArray(cattle);
        const shedsArray = extractArray(sheds);
        const treatmentsArray = extractArray(treatments);
        const milkArray = extractArray(milk);

        // 1. Explicit check to ensure we are working with an actual array structure
        let farmsArray = Array.isArray(farms) 
          ? farms 
          : (farms && Array.isArray(farms.data)) 
            ? farms.data 
            : [];

        if (farmsArray.length === 0) {
          try {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
              const user = JSON.parse(storedUser);
              const userFarmId = user.farmId && typeof user.farmId === 'object'
                ? (user.farmId._id || user.farmId.id)
                : user.farmId;
              if (userFarmId && userFarmId !== 'ALL') {
                farmsArray = [{ _id: userFarmId, id: userFarmId, name: user.farm || "My Assigned Farm", code: user.farm || "My Assigned Farm" }];
              }
            }
          } catch (e) {}
        }

        // 2. Safe query logic against the guaranteed array fallback
        const currentFarm = farmsArray.find(f => 
          f?.code?.toUpperCase() === farmCode?.toUpperCase() || 
          f?.name?.toUpperCase()?.includes(farmCode?.toUpperCase())
        );
        const currentFarmId = currentFarm?._id || currentFarm?.id;

        const isCurrentFarm = (item) => {
          if (!farmCode) return false;
          const searchCode = farmCode.toUpperCase();

          if (item?.farmId && typeof item.farmId === 'object') {
            const fCode = item.farmId.code || item.farmId.name || '';
            if (fCode?.toUpperCase()?.includes(searchCode)) return true;
            if (currentFarmId && (item.farmId._id === currentFarmId || item.farmId.id === currentFarmId)) return true;
          }
          
          const rawId = typeof item?.farmId === 'string' ? item.farmId : (typeof item?.farm === 'string' ? item.farm : null);
          if (rawId && currentFarmId && rawId === currentFarmId) {
            return true;
          }

          const itemCode = item?.farmId?.code || item?.farmId?.name || rawId;
          if (typeof itemCode === 'string' && itemCode?.toUpperCase()?.includes(searchCode)) return true;

          if (typeof item?.shed === 'string' && item?.shed?.toUpperCase()?.includes(searchCode)) return true;
          
          return false;
        };

        const totalCattle = cattleArray.filter(item => 
          isCurrentFarm(item) && 
          item?.status !== 'SOLD' && 
          item?.status !== 'DECEASED'
        ).length;
        const activeSheds = shedsArray.filter(s => isCurrentFarm(s) && s?.status === 'ACTIVE').length;
        const sickAnimals = treatmentsArray.filter(t => isCurrentFarm(t) && t?.healthStatus === 'Pending').length;
        
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        const farmMilk = milkArray.filter(isCurrentFarm);
        const milkProduction = farmMilk
          .filter(record => {
            if (!record?.date) return false;
            const recordDateStr = new Date(record.date).toLocaleDateString('en-CA');
            return recordDateStr === todayStr;
          })
          .reduce((sum, record) => sum + (Number(record?.quantity) || 0), 0);

        const inactiveList = cattleArray.filter(item => 
          isCurrentFarm(item) && 
          (item?.status === 'SOLD' || item?.status === 'DECEASED')
        );

        const activeCattle = cattleArray.filter(item => 
          isCurrentFarm(item) && 
          item?.status !== 'SOLD' && 
          item?.status !== 'DECEASED'
        );

        const enrichedSheds = shedsArray.filter(isCurrentFarm).map(shed => {
          const occupancy = activeCattle.filter(c => {
            const cShed = String(c.shed || c.shedId || '').trim().toLowerCase();
            const sCode = String(shed.code || '').trim().toLowerCase();
            const sName = String(shed.name || '').trim().toLowerCase();
            const sId = String(shed._id || shed.id || '').trim().toLowerCase();
            return cShed === sCode || cShed === sName || cShed === sId;
          }).length;
          
          const remainingCapacity = Math.max(0, (Number(shed.capacity) || 0) - occupancy);
          
          return {
            ...shed,
            occupancy,
            remainingCapacity
          };
        });

        setMetrics({
          totalCattle,
          activeSheds,
          sickAnimals,
          milkProduction
        });
        
        setFarmSheds(enrichedSheds);
        setInactiveAnimals(inactiveList);
      } catch (err) {
        console.error("Failed to fetch farm overview metrics", err);
        setError(typeof err === 'string' ? err : (err.message || "Failed to load farm metrics."));
      } finally {
        setLoading(false);
      }
    };

    if (farmCode && (hasAccess('dashboard') || hasAccess('FARM_MANAGEMENT'))) {
      fetchMetrics();
    } else if (farmCode && userObj !== null) {
      // User is loaded but lacks permission — stop spinner, stay silent
      console.warn("[FarmOverview] Fetch blocked: user lacks dashboard/farm_management access.");
      setLoading(false);
    }
  }, [farmCode, userObj]);

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-bold m-4 shadow-sm flex flex-col gap-2">
        <span>⚠️ Access Denied / Load Failure</span>
        <span className="text-sm font-semibold opacity-85 font-mono">{error}</span>
      </div>
    );
  }

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
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-blue-600 bg-blue-100/50 border border-blue-200/50">TODAY</span>
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

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Occupancy</span>
                    <span className="text-[#16223F] font-extrabold text-sm">{shed.occupancy || 0} <span className="text-slate-400 font-normal text-xs">head</span></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Remaining</span>
                    <span className="text-[#16223F] font-extrabold text-sm">{shed.remainingCapacity || 0} <span className="text-slate-400 font-normal text-xs">head</span></span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1">
                    <span>USAGE</span>
                    <span>{Math.round(((shed.occupancy || 0) / (shed.capacity || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        ((shed.occupancy || 0) / (shed.capacity || 1)) > 0.9 
                          ? 'bg-rose-500' 
                          : ((shed.occupancy || 0) / (shed.capacity || 1)) > 0.75 
                            ? 'bg-amber-500' 
                            : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.round(((shed.occupancy || 0) / (shed.capacity || 1)) * 100))}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* INACTIVE ANIMALS SECTION (SOLD & DECEASED) */}
      <div className="px-4 mt-8">
        <h2 className="text-xl font-extrabold text-[#16223F] mb-6 tracking-tight flex items-center gap-2">
          <span>📉</span> Inactive Animals (Sold / Deceased)
        </h2>
        
        {inactiveAnimals.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center">
            <p className="text-gray-400 font-bold">No sold or deceased animals found for this farm.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* SOLD CARD */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-2xl shadow-inner">
                  💰
                </div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-amber-600 bg-amber-100/50 border border-amber-200/50">SOLD</span>
              </div>
              <h3 className="text-3xl font-black text-[#16223F] tracking-tight">
                {inactiveAnimals.filter(a => a.status === 'SOLD').length}
              </h3>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mt-1">Sold Animals</p>
            </div>

            {/* DECEASED CARD */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center text-2xl shadow-inner">
                  🪦
                </div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full text-rose-600 bg-rose-100/50 border border-rose-200/50">DECEASED</span>
              </div>
              <h3 className="text-3xl font-black text-[#16223F] tracking-tight">
                {inactiveAnimals.filter(a => a.status === 'DECEASED' || a.status === 'DEAD').length}
              </h3>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mt-1">Deceased / Dead</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}