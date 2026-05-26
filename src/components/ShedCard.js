import React from 'react';

const ShedCard = ({ shed, onEdit, onDelete }) => {
  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[#D1867D]/5 hover:border-[#D1867D]/30 transition-all duration-200 group">
      
      {/* LEFT SECTION: SHED NO & ID */}
      <div className="flex items-center gap-4 min-w-[180px]">
        <div className="w-12 h-12 bg-blue-50 text-[#D1867D] rounded-2xl flex items-center justify-center shadow-sm shrink-0">
          {/* Shed/Barn building vector outline SVG */}
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0V11a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-black text-black tracking-tight leading-tight">
            {shed.shedNo}
          </h3>
          <p className="text-[#D1867D] text-xs font-bold font-sans mt-0.5">
            {shed.shedType || 'General'}
          </p>
        </div>
      </div>

      {/* MIDDLE SECTION 1: ENTERPRISE UNIT (FARM ID) */}
      <div className="flex items-center gap-2 min-w-[160px]">
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0V11a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className="text-sm font-bold text-gray-600">
          {shed.farmId}
        </span>
      </div>

      {/* MIDDLE SECTION 2: METRICS LOG GRID (ROWS & MAX CAPACITY) */}
      <div className="flex gap-8 min-w-[160px]">
        <div className="text-center sm:text-left">
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Rows</span>
          <span className="text-base font-black text-[#16223F] font-sans">{shed.lines}</span>
        </div>
        <div className="text-center sm:text-left">
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Max Cap</span>
          <span className="text-base font-black text-[#16223F] font-sans">{shed.capacity}</span>
        </div>
      </div>

      {/* RIGHT SECTION: OPERATIONAL STATUS SIGNALS & CONTROLS */}
      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${shed.status === 'Inactive' ? 'bg-red-500' : 'bg-emerald-500'}`} />
          <span className={`text-xs font-black uppercase tracking-wider ${shed.status === 'Inactive' ? 'text-red-600' : 'text-emerald-600'}`}>
            {shed.status || 'Active'}
          </span>
        </div>

        <div className="flex gap-2">
          {/* Edit Control */}
          <button 
            onClick={() => onEdit(shed)}
            className="p-2 border border-gray-200 text-gray-400 hover:text-white hover:bg-[#D1867D] hover:border-[#D1867D] rounded-xl transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          
          {/* Delete Control */}
          <button 
            onClick={() => onDelete(shed.id)}
            className="p-2 border border-gray-200 text-gray-400 hover:text-white hover:bg-red-600 hover:border-red-600 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

    </div>
  );
};

export default ShedCard;