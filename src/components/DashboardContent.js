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

      <h1 className="text-2xl font-bold text-[#d1867d] mb-6">System Overview</h1>

      {/* 🔥 SMALL COMPACT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mb-8">

        <div className={cardStyle}>
          <p className="text-[10px] uppercase text-gray-500 font-bold">Livestock</p>
          <p className="text-2xl font-black text-[#272E52] mt-1">
            {mounted ? stats.totalAnimals : 0} 
          </p>
        </div>

        <div className={cardStyle}>
          <p className="text-[10px] uppercase text-gray-500 font-bold">Milk Production</p>
          <p className="text-2xl font-black text-[#272E52] mt-1">
            {mounted ? stats.dailyMilk : 0}<span className="text-2xl font-bold text-[#272E52] ">L</span>
          </p>
        </div>

        <div className={cardStyle}>
          <p className="text-[10px] uppercase text-gray-500 font-bold">Health</p>
          <p className="text-2xl font-black text-red-600 mt-1">
            {mounted ? stats.healthAlerts : 0}
          </p>
        </div>

        <div className={cardStyle}>
          <p className="text-[10px] uppercase text-gray-500 font-bold">Alerts</p>
          <p className="text-2xl font-black text-red-500 mt-1">
            {mounted ? stats.pdTodayTomorrow + stats.calvingTodayTomorrow + stats.heatTodayTomorrow : 0}
          </p>
        </div>

      </div>

      {/* 🔥 IMPORTANT CARDS (LIKE YOUR IMAGE) */}
     <h2 className="text-lg font-bold text-[#d1867d] mb-3">
  Cattle Categories
</h2>

<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">

  {/* Pregnant */}
  <div className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-green-500 bg-green-50 hover:scale-105 transition cursor-pointer">
    <div className="text-4xl mb-1">🐄</div>
    <p className="text-sm font-medium text-gray-700">Pregnant</p>
    <p className="text-lg font-bold text-green-700">3</p>
  </div>

  {/* Inseminated */}
  <div className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-indigo-500 bg-indigo-50 hover:scale-105 transition cursor-pointer">
    <div className="text-4xl mb-1">💉</div>
    <p className="text-sm font-medium text-gray-700">Inseminated</p>
    <p className="text-lg font-bold text-indigo-700">4</p>
  </div>

  {/* Dry */}
  <div className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-gray-800 bg-gray-100 hover:scale-105 transition cursor-pointer">
    <div className="text-4xl mb-1">🌙</div>
    <p className="text-sm font-medium text-gray-700">Dry</p>
    <p className="text-lg font-bold text-gray-800">3</p>
  </div>

  {/* Issues */}
  <div className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-red-500 bg-red-50 hover:scale-105 transition cursor-pointer">
    <div className="text-4xl mb-1">⚠️</div>
    <p className="text-sm font-medium text-gray-700">Issues</p>
    <p className="text-lg font-bold text-red-600">4</p>
  </div>

</div>
      {/* 🔥 BREEDING ALERTS */}
      <h2 className="text-lg font-bold text-[#d1867d] mb-4">Breeding Alerts</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div onClick={() => handleNavigation('PD date')} className={`${interactiveCardStyle} border-l-4 border-blue-500`}>
          <p className="text-[10px] uppercase text-[#272E52] font-bold">PD Test</p>
          <p className="text-2xl font-black text-[#272E52]">
            {mounted ? stats.pdTodayTomorrow : 0}
          </p>
        </div>

        <div onClick={() => handleNavigation('estimated calving date')} className={`${interactiveCardStyle} border-l-4 border-blue-500`}>
          <p className="text-[10px] uppercase text-[#272E52] font-bold">Calving</p>
          <p className="text-2xl font-black text-[#272E52]">
            {mounted ? stats.calvingTodayTomorrow : 0}
          </p>
        </div>

        <div onClick={() => handleNavigation('heat monitoring 1st notification')} className={`${interactiveCardStyle} border-l-4 border-blue-500`}>
          <p className="text-[10px] uppercase text-[#272E52] font-bold">Heat</p>
          <p className="text-2xl font-black text-[#272E52]">
            {mounted ? stats.heatTodayTomorrow : 0}
          </p>
        </div>

      </div>

    </div>
  );
};

export default DashboardContent;