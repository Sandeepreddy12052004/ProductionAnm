import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';

const Header = ({ toggleSidebar }) => {
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("token");
    router.replace('/login');
  };

  return (
    <header className="w-full h-16 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-3 flex justify-between items-center shadow-sm relative z-50">

      {/* LEFT → LOGO (Hidden on Desktop to prevent duplicate with Sidebar) */}
      <div
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-2.5 cursor-pointer group md:hidden"
      >
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 border border-slate-100 shadow-sm transition-transform group-hover:scale-105">
          <img
            src="/LOGO.png"
            alt="logo"
            className="w-full h-full object-contain"
          />
        </div>

        {/* BRAND NAME */}
        <div className="flex flex-col">
          <span className="font-extrabold text-[#16223F] text-[15px] leading-none mb-0.5">AGASTHYA</span>
          <span className="font-black text-[9px] text-[#D1867D] uppercase tracking-widest leading-none">Nutro Milk</span>
        </div>
      </div>

      {/* RIGHT → ACTIONS */}
      <div className="flex flex-1 justify-end items-center gap-4">
        
        {/* PROFILE WRAPPER */}
        <div className="relative" ref={dropdownRef}>
          {/* PROFILE BUTTON */}
          <div 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 pl-2 pr-3 rounded-full border border-slate-200 shadow-sm transition-all bg-white"
          >
            <div className="w-7 h-7 bg-gradient-to-br from-[#16223F] to-[#2a3f75] rounded-full flex items-center justify-center text-white text-[12px] font-bold shadow-inner">
              A
            </div>
            <span className="hidden sm:block text-xs font-bold text-[#16223F] uppercase tracking-wider">Profile</span>
          </div>

          {/* POPOVER DROPDOWN MENU */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-3 w-72 bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] border border-white p-5 z-[100] transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100">
                <div className="w-14 h-14 bg-gradient-to-br from-[#16223F] to-[#2a3f75] rounded-full flex items-center justify-center text-white text-2xl font-black shadow-md ring-4 ring-slate-50">
                  A
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">Admin User</h3>
                  <p className="text-[10px] font-bold text-[#D1867D] uppercase tracking-widest mt-1">Agasthya Manager</p>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-3.5 mb-6">
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <span>🏠</span> Farm Access
                  </span>
                  <span className="text-[11px] font-black bg-white shadow-sm text-gray-700 px-2.5 py-1 rounded-lg border border-slate-100">TKP, TDR</span>
                </div>
                
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <span>⭐</span> Role
                  </span>
                  <span className="text-[11px] font-black text-[#16223F]">Super Supervisor</span>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <span>🟢</span> Status
                  </span>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-100/50 border border-emerald-200/50 px-2.5 py-1 rounded-full shadow-sm">ACTIVE</span>
                </div>
              </div>

              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:shadow-[0_8px_20px_-6px_rgba(239,68,68,0.5)] hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
              >
                Logout securely
              </button>
            </div>
          )}
        </div>

        {/* HAMBURGER */}
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all active:scale-95 duration-200"
        >
          ☰
        </button>
      </div>

    </header>
  );
};

export default Header;