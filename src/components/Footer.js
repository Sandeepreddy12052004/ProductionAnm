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
        <div className="bg-white border-t shadow-md flex justify-around items-center py-2 relative">

          {navItems.map((item) => {
            const isActive = router.pathname === item.path;

            return (
              <div key={item.name} className="relative flex-1 flex justify-center">
                
                {/* SLIDING BACKGROUND */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 mx-2 rounded-xl bg-green-100 shadow-lg"
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                )}

                <button
                  onClick={() => router.push(item.path)}
                  className={`relative z-10 flex flex-col items-center text-xs py-1 ${
                    isActive ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.name}
                </button>
              </div>
            );
          })}

          {/* CENTER BUTTON */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-6">
            {/* <button
              onClick={() => router.push("/add")}
              className="bg-yellow-400 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl hover:scale-110 transition"
            >
              +
            </button> */}
          </div>

        </div>
      </div>
    </>
  );
};

export default Footer;