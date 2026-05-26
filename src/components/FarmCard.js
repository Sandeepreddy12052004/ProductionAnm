import React from 'react';

const FarmCard = ({ farm, onEdit, onDelete, onClick }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[220px] hover:bg-[#D1867D]/5 hover:border-[#D1867D]/30 transition-all duration-200 relative group">
      
      {/* CARD HEADER */}
      <div className="flex justify-between items-start">
        {/* Soft Blue Tractor/Tractor Area Icon Block */}
        <div className="w-12 h-12 bg-white-50 text-[#D1867D] rounded-2xl flex items-center justify-center shadow-sm">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        {/* Triple Dot Context Menu Button */}
        <button className="text-gray-400 hover:text-[#16223F] p-1 rounded-xl transition-colors">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>

      {/* CARD BODY CONTENT */}
      <div className="mt-5 flex-1 cursor-pointer" onClick={onClick}>
        <h3 className="text-xl font-black text-black tracking-tight group-hover:text-[#16223F] transition-colors">
          {farm.name}
        </h3>
        <p className="text-[#D1867D] text-xs font-black uppercase tracking-widest mt-0.5">
          {farm.code}
        </p>
        
        {/* Geolocation Meta Row */}
        <div className="flex items-center gap-1.5 text-gray-400 text-xs font-sans mt-3.5">
          <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{farm.metadata || "Location metadata pending"}</span>
        </div>
      </div>

      {/* CARD FOOTER ACTIONS */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100/50 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
          Active Unit
        </span>

        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Edit Button */}
          <button 
            onClick={() => onEdit(farm)}
            className="p-2 border border-gray-200 text-gray-400 hover:text-white hover:bg-[#D1867D] hover:border-[#D1867D] rounded-xl transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          
          {/* Delete Button */}
          <button 
            onClick={() => onDelete(farm.id)}
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

export default FarmCard;