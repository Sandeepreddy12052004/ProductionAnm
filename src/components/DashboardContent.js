import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const DashboardContent = () => {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const stats = useMemo(() => {
    if (typeof window === 'undefined') {
      return { 
        totalAnimals: 0, dailyMilk: 0, healthAlerts: 0,
        pdNear: 0, calvingNear: 0, heatNear: 0,
        pdTodayTomorrow: 0, calvingTodayTomorrow: 0, heatTodayTomorrow: 0
      };
    }

    try {
      const livestock = JSON.parse(localStorage.getItem('global_livestock_logs') || '[]');
      const tkpMilk = JSON.parse(localStorage.getItem('tkp_milk_prod_logs') || '[]');
      const tdrMilk = JSON.parse(localStorage.getItem('tdr_milk_prod_logs') || '[]');
      const totalMilk = [...tkpMilk, ...tdrMilk].reduce((sum, log) => sum + Number(log.liters || 0), 0);

      const tkpHealth = JSON.parse(localStorage.getItem('tkp_health_logs') || '[]');
      const tdrHealth = JSON.parse(localStorage.getItem('tdr_health_logs') || '[]');

      const crossingLogs = JSON.parse(localStorage.getItem('global_crossing_logs') || '[]');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const fifteenDaysOut = new Date(today);
      fifteenDaysOut.setDate(today.getDate() + 15);

      const checkDate = (dateStr, start, end) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        return d >= start && d <= end;
      };

      const alerts = crossingLogs.reduce((acc, log) => {
        if (checkDate(log['PD date'], today, fifteenDaysOut)) acc.pdNear++;
        if (checkDate(log['PD date'], today, tomorrow)) acc.pdTodayTomorrow++;

        if (checkDate(log['estimated calving date'], today, fifteenDaysOut)) acc.calvingNear++;
        if (checkDate(log['estimated calving date'], today, tomorrow)) acc.calvingTodayTomorrow++;

        if (checkDate(log['heat monitoring 1st notification'], today, fifteenDaysOut)) acc.heatNear++;
        if (checkDate(log['heat monitoring 1st notification'], today, tomorrow)) acc.heatTodayTomorrow++;

        return acc;
      }, {
        pdNear: 0, calvingNear: 0, heatNear: 0,
        pdTodayTomorrow: 0, calvingTodayTomorrow: 0, heatTodayTomorrow: 0
      });

      return {
        totalAnimals: livestock.filter(a => a.status === 'Active').length,
        dailyMilk: totalMilk,
        healthAlerts: tkpHealth.length + tdrHealth.length,
        ...alerts
      };

    } catch (e) {
      console.error("Dashboard Error:", e);
      return { totalAnimals: 0, dailyMilk: 0, healthAlerts: 0 };
    }
  }, []);

  const handleNavigation = (field) => {
    router.push({
      pathname: '/crossing',
      query: { autoFilter: field },
    });
  };

  // 🔥 Smaller card style
  const cardStyle = "p-3 bg-white rounded-xl shadow-sm border border-gray-100 transition hover:scale-[1.03]";
  const interactiveCardStyle = `${cardStyle} cursor-pointer active:scale-95`;

  return (
    <div className="w-full">

      <h1 className="text-2xl font-extrabold text-[#16223F] mb-6 tracking-tight">System Overview</h1>

      {/* 🔥 SMALL COMPACT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-8">

        <div className={cardStyle}>
          <p className="text-[10px] uppercase text-slate-400 font-black tracking-wider">Livestock</p>
          <p className="text-2xl font-black text-[#16223F] mt-1">
            {mounted ? stats.totalAnimals : 0} 
          </p>
        </div>

        <div className={cardStyle}>
          <p className="text-[10px] uppercase text-slate-400 font-black tracking-wider">Milk Production</p>
          <p className="text-2xl font-black text-[#16223F] mt-1">
            {mounted ? stats.dailyMilk : 0}<span className="text-2xl font-bold text-[#16223F]">L</span>
          </p>
        </div>

        <div className={cardStyle}>
          <p className="text-[10px] uppercase text-slate-400 font-black tracking-wider">Health</p>
          <p className="text-2xl font-black text-rose-500 mt-1">
            {mounted ? stats.healthAlerts : 0}
          </p>
        </div>

        <div className={cardStyle}>
          <p className="text-[10px] uppercase text-slate-400 font-black tracking-wider">Alerts</p>
          <p className="text-2xl font-black text-[#D1867D] mt-1">
            {mounted ? stats.pdTodayTomorrow + stats.calvingTodayTomorrow + stats.heatTodayTomorrow : 0}
          </p>
        </div>

      </div>

      {/* 🔥 IMPORTANT CARDS (LIKE YOUR IMAGE) */}
     <h2 className="text-lg font-extrabold text-[#16223F] mb-4 tracking-tight">
  Cattle Categories
</h2>

<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">

  {/* Pregnant */}
  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/5 transition duration-300 cursor-pointer">
    <div className="text-3xl mb-1.5">🐄</div>
    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pregnant</p>
    <p className="text-xl font-black text-emerald-800 mt-0.5">3</p>
  </div>

  {/* Inseminated */}
  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-brand-navy/20 bg-brand-navy/5 hover:scale-105 hover:shadow-lg hover:shadow-brand-navy/5 transition duration-300 cursor-pointer">
    <div className="text-3xl mb-1.5">💉</div>
    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inseminated</p>
    <p className="text-xl font-black text-brand-navy mt-0.5">4</p>
  </div>

  {/* Dry */}
  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:scale-105 hover:shadow-lg hover:shadow-slate-500/5 transition duration-300 cursor-pointer">
    <div className="text-3xl mb-1.5">🌙</div>
    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dry</p>
    <p className="text-xl font-black text-slate-700 mt-0.5">3</p>
  </div>

  {/* Issues */}
  <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl border border-brand-rose/30 bg-brand-rose/5 hover:scale-105 hover:shadow-lg hover:shadow-brand-rose/5 transition duration-300 cursor-pointer">
    <div className="text-3xl mb-1.5">⚠️</div>
    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issues</p>
    <p className="text-xl font-black text-brand-rose mt-0.5">4</p>
  </div>

</div>
      {/* 🔥 BREEDING ALERTS */}
      <h2 className="text-lg font-extrabold text-[#16223F] mb-4 tracking-tight">Breeding Alerts</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div onClick={() => handleNavigation('PD date')} className={`${interactiveCardStyle} border-l-4 border-[#FFC145]`}>
          <p className="text-[10px] uppercase text-[#16223F] font-black tracking-wider">PD Test</p>
          <p className="text-2xl font-black text-[#16223F] mt-1">
            {mounted ? stats.pdTodayTomorrow : 0}
          </p>
        </div>

        <div onClick={() => handleNavigation('estimated calving date')} className={`${interactiveCardStyle} border-l-4 border-[#D1867D]`}>
          <p className="text-[10px] uppercase text-[#16223F] font-black tracking-wider">Calving</p>
          <p className="text-2xl font-black text-[#16223F] mt-1">
            {mounted ? stats.calvingTodayTomorrow : 0}
          </p>
        </div>

        <div onClick={() => handleNavigation('heat monitoring 1st notification')} className={`${interactiveCardStyle} border-l-4 border-[#16223F]`}>
          <p className="text-[10px] uppercase text-[#16223F] font-black tracking-wider">Heat</p>
          <p className="text-2xl font-black text-[#16223F] mt-1">
            {mounted ? stats.heatTodayTomorrow : 0}
          </p>
        </div>

      </div>

    </div>
  );
};

export default DashboardContent;