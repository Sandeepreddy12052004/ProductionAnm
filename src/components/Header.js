 import React from 'react';
import { useRouter } from 'next/router';

const Header = ({ toggleSidebar }) => {
  const router = useRouter();

  return (
    <header className="w-full h-16 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-3 flex justify-between items-center shadow-sm">

      {/* LEFT → LOGO */}
      <div
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-2.5 cursor-pointer group"
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

      {/* RIGHT → HAMBURGER */}
      <button
        onClick={toggleSidebar}
        className="md:hidden p-2 text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all active:scale-95 duration-200"
      >
        ☰
      </button>

    </header>
  );
};

export default Header;