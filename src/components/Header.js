 import React from 'react';
import { useRouter } from 'next/router';

const Header = ({ toggleSidebar }) => {
  const router = useRouter();

  return (
    <header className="w-full h-16 bg-gray-200 border-b px-4 py-3 flex justify-between items-center shadow-sm">

      {/* LEFT → LOGO */}
      <div
        onClick={() => router.push('/dashboard')}
        className="flex items-center gap-2 cursor-pointer"
      >
        {/* LOGO IMAGE (replace path if needed) */}
        <img
          src="/LOGO.png"
          alt="logo"
          className="w-15 h-15 object-contain"
        />

        {/* BRAND NAME */}
        {/* <span className="font-bold text-green-700 text-lg">
          AGASTHYA
        </span> */}
      </div>

      {/* RIGHT → HAMBURGER */}
      <button
        onClick={toggleSidebar}
        className="md:hidden text-2xl text-black"
      >
        ☰
      </button>

    </header>
  );
};

export default Header;