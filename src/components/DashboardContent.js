import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { api } from '../utils/api';
import ModulePageHeader from "./ModulePageHeader";
import FarmFilterSelector from "./FarmFilterSelector";
import { 
  TrendingUp, 
  AlertCircle, 
  Calendar, 
  Activity, 
  Heart, 
  ShieldAlert, 
  PlusCircle, 
  Layers, 
  Settings, 
  Users, 
  CheckCircle2, 
  ClipboardList, 
  Trigger, 
  Thermometer, 
  Droplets, 
  ArrowUpRight 
} from "lucide-react";

const DashboardContent = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAlertTab, setActiveAlertTab] = useState('heat'); // 'heat' | 'pd' | 'calving'
  const [showMilkModal, setShowMilkModal] = useState(false);
  const [stats, setStats] = useState({
    totalAnimals: 0,
    calvesCount: 0,
    totalBreeds: 0,
    dailyMilk: 0,
    dailyCollection: 0,
    dailyProcurement: 0,
    healthAlertsCount: 0,
    activeTreatments: [],
    pdNearCount: 0,
    calvingNearCount: 0,
    heatNearCount: 0,
    pdList: [],
    calvingList: [],
    heatList: [],
    pregnantCount: 0,
    inseminatedCount: 0,
    dryCount: 0,
    totalBmcVolume: 0,
    totalBmcCapacity: 0,
    activeCoolersCount: 0,
    bmcAlerts: 0,
    shedYields: []
  });

  const fetchDashboardStats = async () => {
    try {
      const activeFarmId = localStorage.getItem('__active_farm_id__');
      const isAll = !activeFarmId || activeFarmId === 'ALL';

      // Fetch from backend API
      const [cattleRes, crossingRes, milkRes, treatmentRes, vaccineRes, bmcsRes, procurementRes] = await Promise.allSettled([
        api.cattle.getAll(),
        api.crossing.getAll(),
        api.milk.collections.getAll(),
        api.health.treatments.getAll(),
        api.health.vaccinations.getAll(),
        api.bmcs.getAll(),
        api.milk.procurement.getAll()
      ]);

      // Resolve actual data or fallback to local storage
      let livestock = [];
      if (cattleRes.status === 'fulfilled' && Array.isArray(cattleRes.value)) {
        livestock = cattleRes.value;
      } else {
        livestock = JSON.parse(localStorage.getItem('global_livestock_logs') || '[]');
      }

      let crossingLogs = [];
      if (crossingRes.status === 'fulfilled' && Array.isArray(crossingRes.value)) {
        crossingLogs = crossingRes.value;
      } else {
        crossingLogs = JSON.parse(localStorage.getItem('global_crossing_logs') || '[]');
      }

      let milkLogs = [];
      if (milkRes.status === 'fulfilled' && Array.isArray(milkRes.value)) {
        milkLogs = milkRes.value;
      } else {
        const tkpMilk = JSON.parse(localStorage.getItem('tkp_milk_prod_logs') || '[]');
        const tdrMilk = JSON.parse(localStorage.getItem('tdr_milk_prod_logs') || '[]');
        milkLogs = [...tkpMilk, ...tdrMilk];
      }

      let procurementLogs = [];
      if (procurementRes.status === 'fulfilled' && Array.isArray(procurementRes.value)) {
        procurementLogs = procurementRes.value;
      } else {
        procurementLogs = JSON.parse(localStorage.getItem('global_milk_procurements') || '[]');
      }

      let healthLogs = [];
      if (treatmentRes.status === 'fulfilled' && Array.isArray(treatmentRes.value)) {
        healthLogs = [...healthLogs, ...treatmentRes.value];
      } else {
        const tkpHealth = JSON.parse(localStorage.getItem('tkp_health_logs') || '[]');
        const tdrHealth = JSON.parse(localStorage.getItem('tdr_health_logs') || '[]');
        healthLogs = [...healthLogs, ...tkpHealth, ...tdrHealth];
      }

      let vaccineLogs = [];
      if (vaccineRes.status === 'fulfilled' && Array.isArray(vaccineRes.value)) {
        vaccineLogs = vaccineRes.value;
      } else if (vaccineRes.status === 'fulfilled' && Array.isArray(vaccineRes.value?.data)) {
        vaccineLogs = vaccineRes.value.data;
      } else {
        vaccineLogs = JSON.parse(localStorage.getItem('global_vaccination_logs') || '[]');
      }

      let bmcs = [];
      if (bmcsRes.status === 'fulfilled' && Array.isArray(bmcsRes.value)) {
        bmcs = bmcsRes.value;
      } else if (bmcsRes.status === 'fulfilled' && Array.isArray(bmcsRes.value?.data)) {
        bmcs = bmcsRes.value.data;
      } else {
        bmcs = JSON.parse(localStorage.getItem('global_bmcs_logs') || '[]');
      }

      // Filter by farm association
      livestock = livestock.filter(a => isAll || String(a.farmId?._id || a.farmId?.id || a.farmId) === String(activeFarmId));
      crossingLogs = crossingLogs.filter(log => isAll || String(log.farmId?._id || log.farmId?.id || log.farmId) === String(activeFarmId));
      milkLogs = milkLogs.filter(log => isAll || String(log.farmId?._id || log.farmId?.id || log.farmId) === String(activeFarmId));
      procurementLogs = procurementLogs.filter(log => isAll || String(log.farmId?._id || log.farmId?.id || log.farmId) === String(activeFarmId));
      healthLogs = healthLogs.filter(h => isAll || String(h.farmId?._id || h.farmId?.id || h.farmId) === String(activeFarmId));
      vaccineLogs = vaccineLogs.filter(v => isAll || String(v.farmId?._id || v.farmId?.id || v.farmId) === String(activeFarmId));
      bmcs = bmcs.filter(b => isAll || String(b.farmId?._id || b.farmId?.id || b.farmId) === String(activeFarmId));

      // Calculations
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const thirtyDaysOut = new Date(today);
      thirtyDaysOut.setDate(today.getDate() + 30);

      const checkDate = (dateStr, start, end) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        return d >= start && d <= end;
      };

      // 1. Breeding Alerts
      const alerts = crossingLogs.reduce((acc, log) => {
        const tag = String(log.tag_id || log.tag || '').trim().toUpperCase();
        if (!tag) return acc;

        const pdDateVal = log.pdDate || log['PD date'];
        const calvingDateVal = log.estimatedCalvingDate || log['estimated calving date'];
        const heatDateVal = log.heatMonitoring1stNotification || log['heat monitoring 1st notification'];

        // Detail lists for alerts checklist
        if (checkDate(pdDateVal, today, thirtyDaysOut)) {
          acc.pdNearCount++;
          acc.pdList.push({ tag, date: new Date(pdDateVal).toLocaleDateString('en-GB'), type: 'PD Test due' });
        }
        if (checkDate(calvingDateVal, today, thirtyDaysOut)) {
          acc.calvingNearCount++;
          acc.calvingList.push({ tag, date: new Date(calvingDateVal).toLocaleDateString('en-GB'), type: 'Expected Calving' });
        }
        if (checkDate(heatDateVal, today, thirtyDaysOut)) {
          acc.heatNearCount++;
          acc.heatList.push({ tag, date: new Date(heatDateVal).toLocaleDateString('en-GB'), type: 'Heat check' });
        }

        return acc;
      }, {
        pdNearCount: 0, calvingNearCount: 0, heatNearCount: 0,
        pdList: [], calvingList: [], heatList: []
      });

      // 2. Livestock metrics
      const activeLivestock = livestock.filter(a => !['SOLD', 'DECEASED', 'DEAD'].includes(String(a.status).trim().toUpperCase()));
      const activeLivestockCount = activeLivestock.length;
      
      const calvesCount = activeLivestock.filter(a => String(a.cattleType || a.animalType || '').toUpperCase().includes('CALF')).length;
      const uniqueBreeds = new Set(activeLivestock.map(a => String(a.breed || '').trim().toUpperCase()).filter(b => b !== ''));
      const totalBreeds = uniqueBreeds.size;

      // 3. Milk metrics (Yesterday / Previous Day's data)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayTime = yesterday.getTime();

      const yesterdayCollections = milkLogs.filter(log => {
        const d = new Date(log.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === yesterdayTime;
      });

      const yesterdayProcurements = procurementLogs.filter(log => {
        const d = new Date(log.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === yesterdayTime;
      });

      const dailyMilkTotal = yesterdayCollections.reduce((sum, log) => {
        const amt = Number(log.quantity ?? log.liters ?? 0);
        return sum + amt;
      }, 0);

      const dailyProcurementTotal = yesterdayProcurements.reduce((sum, log) => {
        const amt = Number(log.liters ?? 0);
        return sum + amt;
      }, 0);

      const shedYieldsObj = {};
      for (const log of yesterdayCollections) {
        const name = log.shedId || 'Other';
        shedYieldsObj[name] = (shedYieldsObj[name] || 0) + (log.quantity || 0);
      }

      // Convert to array for chart
      const shedYields = Object.keys(shedYieldsObj).map(name => ({
        name,
        liters: Number(shedYieldsObj[name].toFixed(1))
      })).sort((a, b) => b.liters - a.liters);

      // 4. Coolers (BMC) metrics
      const totalBmcVolume = bmcs.reduce((sum, b) => sum + (b.currentVolume || 0), 0);
      const totalBmcCapacity = bmcs
        .filter(b => String(b.status || "").trim().toUpperCase() === "ACTIVE")
        .reduce((sum, b) => sum + (b.capacity || 0), 0);
      const activeCoolersCount = bmcs.filter(b => b.status === 'ACTIVE').length;
      const bmcAlerts = bmcs.filter(b => b.status === 'ACTIVE' && b.temperature > 4).length;

      // 5. Active health treatments
      const activeTreatments = healthLogs.filter(h => {
        const status = String(h.healthStatus || h.status || '').toUpperCase();
        return status !== 'COMPLETED';
      });

      // 6. Dynamic status/breeding categories
      const pregnantTags = new Set();
      const inseminatedTags = new Set();
      
      const sortedCrossing = [...crossingLogs].sort((a, b) => {
        const dA = new Date(a.crossingDate || a.date || 0);
        const dB = new Date(b.crossingDate || b.date || 0);
        return dB.getTime() - dA.getTime();
      });

      const processedTags = new Set();
      for (const log of sortedCrossing) {
        const tag = String(log.tag_id || log.tagId || log.tag || '').trim().toUpperCase();
        if (!tag || processedTags.has(tag)) continue;
        processedTags.add(tag);

        const hasCalved = !!(log.actualCalvingDate || log['actual calving date']);
        const status = String(log.pregnancyStatus || log['pregnancy status'] || '').toUpperCase();

        if (!hasCalved) {
          if (status === 'POSITIVE') {
            pregnantTags.add(tag);
          } else if (status === 'PENDING') {
            inseminatedTags.add(tag);
          }
        }
      }

      const pregnantCount = pregnantTags.size;
      const inseminatedCount = inseminatedTags.size;
      const dryCount = activeLivestock.filter(a => {
        const type = String(a.animalType || '').toUpperCase();
        const tag = String(a.tag_id || a.tag || '').trim().toUpperCase();
        return (type === 'COW' || type === 'BUFFALO') && !pregnantTags.has(tag);
      }).length;

      setStats({
        totalAnimals: activeLivestockCount,
        calvesCount,
        totalBreeds,
        dailyMilk: dailyMilkTotal + dailyProcurementTotal,
        dailyCollection: dailyMilkTotal,
        dailyProcurement: dailyProcurementTotal,
        healthAlertsCount: activeTreatments.length,
        activeTreatments,
        pdNearCount: alerts.pdNearCount,
        calvingNearCount: alerts.calvingNearCount,
        heatNearCount: alerts.heatNearCount,
        pdList: alerts.pdList,
        calvingList: alerts.calvingList,
        heatList: alerts.heatList,
        pregnantCount,
        inseminatedCount,
        dryCount,
        totalBmcVolume,
        totalBmcCapacity,
        activeCoolersCount,
        bmcAlerts,
        shedYields
      });
    } catch (e) {
      console.error("Dashboard calculation error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchDashboardStats();
  }, []);

  const handleNavigation = (tabName, autoFilter = null) => {
    const activeFarmId = localStorage.getItem('__active_farm_id__') || 'tkp';
    router.push({
      pathname: `/farm/${activeFarmId}`,
      query: { tab: tabName, filter: autoFilter },
    });
  };

  const getAlertList = () => {
    if (activeAlertTab === 'heat') return stats.heatList;
    if (activeAlertTab === 'pd') return stats.pdList;
    return stats.calvingList;
  };

  const bmcFillPercentage = stats.totalBmcCapacity > 0 
    ? Math.min(100, Math.round((stats.totalBmcVolume / stats.totalBmcCapacity) * 100))
    : 0;

  return (
    <div className="w-full text-slate-800 font-sans">
      <ModulePageHeader
        title="Dashboard Overview"
        description="Real-time operational summary, breeding tasks calendar, and visual yield analytics."
      >
        <FarmFilterSelector layout="horizontal" size="sm" showAllOption={true} />
      </ModulePageHeader>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#16223F] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          
          {/* 1. TOP STATS CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Livestock stockpile */}
            <div 
              onClick={() => router.push('/animals')}
              className="bg-gradient-to-br from-emerald-50 to-teal-50/30 border border-emerald-100/70 p-6 rounded-3xl shadow-[0_4px_20px_rgba(16,185,129,0.02)] flex items-center justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-black text-emerald-800/60 uppercase tracking-widest block font-sans">Active Livestock</span>
                <span className="text-3xl font-black text-emerald-950 block">{mounted ? stats.totalAnimals : 0} <span className="text-xs font-bold text-emerald-700">head</span></span>
                <span className="text-[10px] font-bold text-emerald-600 block">
                  {stats.calvesCount} Calves · {stats.totalBreeds} Breeds
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* Daily Milk Collections */}
            <div 
              onClick={() => setShowMilkModal(true)}
              className="bg-gradient-to-br from-blue-50 to-indigo-50/30 border border-blue-100/70 p-6 rounded-3xl shadow-[0_4px_20px_rgba(59,130,246,0.02)] flex items-center justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-black text-blue-800/60 uppercase tracking-widest block font-sans">Milk Harvest (Yesterday)</span>
                <span className="text-3xl font-black text-blue-950 block">{mounted ? stats.dailyMilk.toLocaleString() : 0} <span className="text-xs font-bold text-blue-700">Liters</span></span>
                <span className="text-[10px] font-bold text-blue-600 block">
                  Storage fill: {stats.totalBmcVolume}L / {stats.totalBmcCapacity}L ({bmcFillPercentage}%)
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Droplets className="w-6 h-6" />
              </div>
            </div>

            {/* Breeding categories */}
            <div 
              onClick={() => router.push('/crossing')}
              className="bg-gradient-to-br from-violet-50 to-purple-50/30 border border-violet-100/70 p-6 rounded-3xl shadow-[0_4px_20px_rgba(139,92,246,0.02)] flex items-center justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-black text-violet-800/60 uppercase tracking-widest block font-sans">Breeding Pipeline</span>
                <span className="text-3xl font-black text-violet-950 block">
                  {mounted ? stats.pregnantCount : 0} <span className="text-xs font-bold text-violet-700">Preg</span>
                </span>
                <span className="text-[10px] font-bold text-violet-600 block">
                  {stats.inseminatedCount} Inseminated
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-600">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            {/* Health alert checks */}
            <div 
              onClick={() => router.push('/treatment')}
              className="bg-gradient-to-br from-rose-50 to-orange-50/30 border border-rose-100/70 p-6 rounded-3xl shadow-[0_4px_20px_rgba(244,63,94,0.02)] flex items-center justify-between hover:scale-[1.01] hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-black text-rose-800/60 uppercase tracking-widest block font-sans">Health & Safety</span>
                <span className="text-3xl font-black text-rose-950 block">{mounted ? stats.healthAlertsCount : 0} <span className="text-xs font-bold text-rose-700">Alerts</span></span>
                <span className="text-[10px] font-bold text-rose-600 block">
                  {stats.bmcAlerts > 0 ? (
                    <span className="text-red-600 font-bold">⚠️ {stats.bmcAlerts} Cooler Temp Warnings</span>
                  ) : (
                    <span>Coolers Temperature optimal</span>
                  )}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </div>

          </div>

          {/* 2. MAIN GRID LAYOUT */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            
            {/* COLUMN 1: Alerts checklist, Shed yield charts & Breeding Funnel (8/12 wide) */}
            <div className="xl:col-span-8 space-y-8">
              
              {/* Breeding checklist component card */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.015)] overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/30">
                  <div>
                    <h3 className="text-base font-black text-[#16223F] uppercase tracking-tight"> Breeding Actions Calendar</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Tasks due in the next 30 days. Complete alerts by updating crossing statuses.</p>
                  </div>
                  
                  {/* Tabs selector */}
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveAlertTab('heat')}
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-200 ${
                        activeAlertTab === 'heat' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Heat check ({stats.heatNearCount})
                    </button>
                    <button
                      onClick={() => setActiveAlertTab('pd')}
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-200 ${
                        activeAlertTab === 'pd' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      PD Test ({stats.pdNearCount})
                    </button>
                    <button
                      onClick={() => setActiveAlertTab('calving')}
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-200 ${
                        activeAlertTab === 'calving' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Calving ({stats.calvingNearCount})
                    </button>
                  </div>
                </div>

                <div className="p-8">
                  {getAlertList().length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-pulse" />
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">All Cycles On Track</h4>
                      <p className="text-[10px] text-slate-400 font-semibold max-w-sm">No operations scheduled for the next 30 days. All notifications are clear.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 uppercase font-black tracking-widest text-[9px]">
                            <th className="pb-3.5">Cattle tag</th>
                            <th className="pb-3.5">Alert action</th>
                            <th className="pb-3.5">Date due</th>
                            <th className="pb-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                          {getAlertList().map((alert, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5 font-extrabold font-mono">#{alert.tag}</td>
                              <td className="py-3.5">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                  activeAlertTab === 'heat' 
                                    ? 'bg-rose-50 text-rose-700 border-rose-100'
                                    : activeAlertTab === 'pd'
                                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                                    : 'bg-violet-50 text-violet-700 border-violet-100'
                                }`}>
                                  {alert.type}
                                </span>
                              </td>
                              <td className="py-3.5 text-slate-400">{alert.date}</td>
                              <td className="py-3.5 text-right">
                                <button
                                  onClick={() => {
                                    const statusParam = activeAlertTab === 'pd' ? 'Pending' : activeAlertTab === 'calving' ? 'Positive' : 'Pending';
                                    router.push(`/crossing?tag=${alert.tag}&status=${statusParam}`);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-800 text-[#16223F] font-black rounded-xl text-[9px] uppercase tracking-wider active:scale-[0.98] transition-all"
                                >
                                  Process <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Analytics Section: SVG Charts Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* 📊 Yesterday's Yield by Shed (SVG Chart) */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.015)] space-y-6">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Comparative Analytics</span>
                    <h3 className="text-base font-black text-[#16223F] uppercase tracking-tight">Shed Harvest (Yesterday)</h3>
                  </div>

                  {stats.shedYields.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                      <AlertCircle className="w-8 h-8 text-slate-200 mb-2" />
                      <p className="text-xs font-bold">No yield logs recorded for yesterday.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-2">
                      {stats.shedYields.map((item) => {
                        const maxLiters = Math.max(...stats.shedYields.map(s => s.liters)) || 1;
                        const pctWidth = Math.max(5, Math.round((item.liters / maxLiters) * 100));
                        
                        return (
                           <div key={item.name} className="space-y-1">
                             <div className="flex justify-between text-xs font-bold text-slate-700">
                               <span className="font-extrabold">{item.name}</span>
                               <span>{item.liters.toLocaleString()} L</span>
                             </div>
                             <div className="h-4 bg-slate-50 border border-slate-100 rounded-lg overflow-hidden flex">
                               <div 
                                 style={{ width: `${pctWidth}%` }}
                                 className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg transition-all duration-1000 ease-out shadow-sm"
                               />
                             </div>
                           </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bulk Milk Cooler level progress visualizer */}
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.015)] space-y-6">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Cooling storage</span>
                    <h3 className="text-base font-black text-[#16223F] uppercase tracking-tight">Bulk Milk Coolers</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                      <span>Stored volume:</span>
                      <span className="font-extrabold text-slate-800">{stats.totalBmcVolume}L / {stats.totalBmcCapacity}L</span>
                    </div>

                    {/* Stored volume progress bar */}
                    <div className="h-6 bg-slate-50 border border-slate-200/60 rounded-xl overflow-hidden flex relative">
                      <div 
                        style={{ width: `${bmcFillPercentage}%` }}
                        className="h-full bg-gradient-to-r from-blue-50 to-indigo-50 transition-all duration-1000 shadow-inner"
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-800 mix-blend-difference">{bmcFillPercentage}% Full</span>
                    </div>

                    {/* Alerts alerts */}
                    {stats.bmcAlerts > 0 && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2.5 text-[10px] font-bold text-red-700">
                        <Thermometer className="w-5 h-5 text-red-500 shrink-0" />
                        <span>Warning: {stats.bmcAlerts} active cooling tank(s) report temperature &gt; 4°C!</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Original COLUMN 1 end */}
            </div>

            {/* COLUMN 2: Quick actions, Live treatments, Cooler levels (4/12 wide) */}
            <div className="xl:col-span-4 space-y-8">
              
              {/* Quick Actions Center */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.015)] space-y-6">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Operations Shortcuts</span>
                  <h3 className="text-base font-black text-[#16223F] uppercase tracking-tight">Quick Action Hub</h3>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <button 
                    onClick={() => router.push('/milk')}
                    className="p-4 border border-slate-200/70 hover:border-blue-500/30 hover:bg-blue-50/20 text-slate-700 hover:text-blue-800 font-bold rounded-2xl flex flex-col items-center justify-center gap-2 transition duration-300 cursor-pointer active:scale-95 text-center"
                  >
                    <span className="text-2xl">🥛</span>
                    <span className="text-[10px] tracking-tight uppercase font-black">Milk Yields</span>
                  </button>

                  <button 
                    onClick={() => router.push('/crossing')}
                    className="p-4 border border-slate-200/70 hover:border-violet-500/30 hover:bg-violet-50/20 text-slate-700 hover:text-violet-800 font-bold rounded-2xl flex flex-col items-center justify-center gap-2 transition duration-300 cursor-pointer active:scale-95 text-center"
                  >
                    <span className="text-2xl">🧬</span>
                    <span className="text-[10px] tracking-tight uppercase font-black">AI & Crossings</span>
                  </button>

                  <button 
                    onClick={() => router.push('/treatment')}
                    className="p-4 border border-slate-200/70 hover:border-rose-500/30 hover:bg-rose-50/20 text-slate-700 hover:text-rose-800 font-bold rounded-2xl flex flex-col items-center justify-center gap-2 transition duration-300 cursor-pointer active:scale-95 text-center"
                  >
                    <span className="text-2xl">🩺</span>
                    <span className="text-[10px] tracking-tight uppercase font-black">Treatments</span>
                  </button>

                  <button 
                    onClick={() => router.push('/feeding')}
                    className="p-4 border border-slate-200/70 hover:border-amber-500/30 hover:bg-amber-50/20 text-slate-700 hover:text-amber-800 font-bold rounded-2xl flex flex-col items-center justify-center gap-2 transition duration-300 cursor-pointer active:scale-95 text-center"
                  >
                    <span className="text-2xl">🌾</span>
                    <span className="text-[10px] tracking-tight uppercase font-black">Feed Logs</span>
                  </button>
                </div>
              </div>

              {/* Active Treatment care logs feed */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.015)] space-y-6">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Healthcare logs</span>
                  <h3 className="text-base font-black text-[#16223F] uppercase tracking-tight">Active Treatment logs</h3>
                </div>

                {stats.activeTreatments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-100 mb-2" />
                    <p className="text-[10px] font-bold">No livestock currently undergoing medical treatment.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                    {stats.activeTreatments.map((log, index) => {
                      const tag = String(log.tag_id || log.tag || '').trim().toUpperCase();
                      const disease = log.disease || log.diagnosis || 'Unknown ailment';
                      const action = log.treatment || log.actionTaken || 'Observed';
                      
                      return (
                        <div key={index} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col gap-1.5 hover:bg-white hover:border-rose-200/50 transition-colors duration-200">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-rose-800 font-mono bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 shadow-sm">
                              #{tag}
                            </span>
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase">Under Treatment</span>
                          </div>
                          <div>
                            <span className="block text-xs font-black text-slate-800 leading-tight">{disease}</span>
                            <span className="block text-[10px] text-slate-500 mt-1 font-semibold leading-normal">
                              Action: {action}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Milk Harvest Breakdown Modal */}
      {showMilkModal && (
        <div className="fixed inset-0 bg-[#16223F]/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col space-y-6 animate-scaleIn">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#16223F] uppercase tracking-tight">Milk Harvest Breakdown</h3>
                  <p className="text-xs text-slate-400 font-medium">Detailed yesterday&apos;s collection & procurement.</p>
                </div>
              </div>
              <button
                onClick={() => setShowMilkModal(false)}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Daily Collection Yield */}
              <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100/70 p-4.5 rounded-2xl flex items-center justify-between transition-colors">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Yesterday&apos;s Collection</span>
                  <span className="text-xl font-black text-slate-800">{stats.dailyCollection.toLocaleString()} <span className="text-xs font-bold text-slate-500">Liters</span></span>
                </div>
                <button
                  onClick={() => {
                    setShowMilkModal(false);
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    router.push(`/milk?date=${ymd}`);
                  }}
                  className="px-3.5 py-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-600 hover:text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition-all"
                >
                  View Details
                </button>
              </div>

              {/* Milk Procurement */}
              <div className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100/70 p-4.5 rounded-2xl flex items-center justify-between transition-colors">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Yesterday&apos;s Procurement</span>
                  <span className="text-xl font-black text-slate-800">{stats.dailyProcurement.toLocaleString()} <span className="text-xs font-bold text-slate-500">Liters</span></span>
                </div>
                <button
                  onClick={() => {
                    setShowMilkModal(false);
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    router.push(`/milk-procurement?date=${ymd}`);
                  }}
                  className="px-3.5 py-1.5 bg-[#D1867D]/10 hover:bg-[#D1867D] text-[#16223F] font-black rounded-xl text-[10px] uppercase tracking-wider transition-all"
                >
                  View Details
                </button>
              </div>

              {/* Total Combined Yield */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100/70 p-5 rounded-2xl flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-blue-800/60 uppercase tracking-widest block">Total Yesterday&apos;s Volume</span>
                  <span className="text-2xl font-black text-blue-950">{stats.dailyMilk.toLocaleString()} <span className="text-sm font-black text-blue-700">Liters</span></span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowMilkModal(false)}
                className="w-full py-3 bg-[#16223F] hover:bg-[#20315a] text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardContent;