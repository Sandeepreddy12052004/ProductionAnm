// import React from 'react';

// const Footer = () => {
//   return (
//     <footer className="w-full bg-gray-200 border-t border-gray-300 px-6 py-3 flex justify-between items-center text-sm text-gray-700">
      
//       {/* LEFT */}
//       <span>© {new Date().getFullYear()} Agasthya Nutro Milk</span>

//       {/* RIGHT */}
//       <span className="text-gray-500">All rights reserved</span>

//     </footer>
//   );
// };

// export default Footer;


import { useRouter } from "next/router";
import { motion } from "framer-motion";

const Footer = () => {
  const router = useRouter();

  const navItems = [
    { name: "Home", icon: "🏠", path: "/dashboard" },
    { name: "Feed", icon: "🌾", path: "/tkp" },
    { name: "Animals", icon: "🐄", path: "/animals" },
    { name: "Profile", icon: "👤", path: "/profile" },
  ];

  return (
    <>
      {/* DESKTOP FOOTER
      <footer className="hidden md:flex w-full bg-gray-200 border-t px-6 py-3 justify-between items-center text-sm text-gray-700">
        <span>© {new Date().getFullYear()} Agasthya Nutro Milk</span>
        <span className="text-gray-500">All rights reserved</span>
      </footer> */}

      {/* MOBILE NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[50]">
        <div className="bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-2xl flex justify-around items-center py-2.5 relative pb-safe">

          {navItems.map((item) => {
            const isActive = router.pathname === item.path;

            return (
              <div key={item.name} className="relative flex-1 flex justify-center">
                
                {/* SLIDING BACKGROUND */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 mx-2.5 rounded-xl bg-[#D1867D]/10"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}

                <button
                  onClick={() => router.push(item.path)}
                  className={`relative z-10 flex flex-col items-center text-[10px] font-black uppercase tracking-tight py-1 transition-all duration-300 ${
                    isActive ? "text-[#D1867D]" : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <span className="text-xl mb-0.5">{item.icon}</span>
                  {item.name}
                </button>
              </div>
            );
          })}

        </div>
      </div>
    </>
  );
};

export default Footer;