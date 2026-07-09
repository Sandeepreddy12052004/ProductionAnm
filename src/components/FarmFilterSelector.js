import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';

export default function FarmFilterSelector({ layout = 'vertical', size = 'md', showAllOption = true }) {
  const [farms, setFarms] = useState([]);
  const [activeFarmId, setActiveFarmId] = useState('ALL');
  const [user, setUser] = useState(null);

  const isGlobal = user ? (
    !user.farmId ||
    user.farmId === 'ALL' ||
    String(user.role).toUpperCase() === 'SUPER_ADMIN'
  ) : false;

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error parsing user in FarmFilterSelector:', e);
    }
  }, []);

  useEffect(() => {
    if (user && isGlobal) {
      api.farms.getAll()
        .then((data) => {
          if (Array.isArray(data)) {
            setFarms(data);
            const pageKey = '__active_farm_id_' + window.location.pathname.replace(/\//g, '_') + '__';
            const storedActive = localStorage.getItem(pageKey) || localStorage.getItem('__active_farm_id__');
            let initialActive = storedActive || 'ALL';
            
            if (initialActive === 'ALL' && !showAllOption && data.length > 0) {
              const firstFarmId = data[0]._id || data[0].id;
              localStorage.setItem(pageKey, firstFarmId);
              initialActive = firstFarmId;
            }
            
            setActiveFarmId(initialActive);
          }
        })
        .catch((err) => console.error('Error fetching farms for FarmFilterSelector:', err));
    }
  }, [user, isGlobal, showAllOption]);

  const handleFarmChange = (e) => {
    const selectedId = e.target.value;
    const pageKey = '__active_farm_id_' + window.location.pathname.replace(/\//g, '_') + '__';
    localStorage.setItem(pageKey, selectedId);
    setActiveFarmId(selectedId);
    window.location.reload();
  };

  if (!isGlobal || farms.length === 0) return null;

  if (layout === 'horizontal') {
    if (size === 'sm') {
      return (
        <div className="flex items-center gap-2 min-w-[160px]">
          <span className="text-[11px] font-bold text-slate-500 tracking-wide uppercase whitespace-nowrap">Farm:</span>
          <div className="relative flex-1">
            <select
              value={activeFarmId}
              onChange={handleFarmChange}
              className="w-full h-9 px-3 pr-8 rounded-lg border border-slate-200 text-xs bg-slate-50/30 text-[#16223F] font-bold outline-none focus:bg-white focus:border-[#D1867D] appearance-none cursor-pointer transition-all duration-200"
            >
              {showAllOption && <option value="ALL">All</option>}
              {farms.map((farm) => (
                <option key={farm._id || farm.id} value={farm._id || farm.id}>
                  {farm.name}
                </option>
              ))}
            </select>
            <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>
        </div>
      );
    }

    // size === 'md'
    return (
      <div className="flex items-center gap-2 min-w-[170px] w-full md:w-auto">
        <span className="text-[11px] font-bold text-slate-500 tracking-wide uppercase whitespace-nowrap">Farm:</span>
        <div className="relative flex-1">
          <select
            value={activeFarmId}
            onChange={handleFarmChange}
            className="w-full h-12 px-3 pr-8 rounded-xl border border-slate-200 text-sm bg-slate-50/30 text-[#16223F] font-semibold outline-none focus:bg-white focus:border-[#D1867D] appearance-none cursor-pointer transition-all duration-200"
          >
            {showAllOption && <option value="ALL">All</option>}
            {farms.map((farm) => (
              <option key={farm._id || farm.id} value={farm._id || farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      </div>
    );
  }

  // layout === 'vertical'
  return (
    <div className="flex flex-col gap-1 min-w-[130px] w-full md:w-auto">
      <label className="text-[11px] font-bold text-slate-500 tracking-wide ml-0.5">Farm</label>
      <div className="relative">
        <select
          value={activeFarmId}
          onChange={handleFarmChange}
          className={`w-full px-3 pr-8 rounded-xl border border-slate-200 text-sm bg-slate-50/30 text-[#16223F] font-semibold outline-none focus:bg-white focus:border-[#D1867D] appearance-none cursor-pointer transition-all duration-200 ${
            size === 'sm' ? 'h-9 text-xs' : 'h-12'
          }`}
        >
          {showAllOption && <option value="ALL">All</option>}
          {farms.map((farm) => (
            <option key={farm._id || farm.id} value={farm._id || farm.id}>
              {farm.name}
            </option>
          ))}
        </select>
        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
          <svg className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
    </div>
  );
}
