// import React from 'react';

// const Profile = () => {
//   return (
//     <div className="
//       bg-gray-100
//       rounded-[24px] md:rounded-[30px]
//       shadow-xl
//       border border-gray-200
//       w-full
//       p-6 sm:p-8 md:p-10
//       flex flex-col items-center
//     ">

//       {/* Avatar */}
//       <div className="mb-6 relative">
//         <div className="
//           w-20 h-20 sm:w-24 sm:h-24
//           bg-green-600 rounded-full
//           flex items-center justify-center
//           text-white text-3xl sm:text-4xl font-black shadow-md
//         ">
//           A
//         </div>

//         <span className="
//           absolute bottom-1 right-1
//           w-5 h-5 sm:w-6 sm:h-6
//           bg-green-500 border-4 border-gray-100
//           rounded-full
//         "></span>
//       </div>

//       {/* Name */}
//       <div className="mb-6 text-center">
//         <h2 className="text-2xl sm:text-3xl font-black text-black">
//           Admin User
//         </h2>
//         <p className="text-green-700 font-bold text-sm tracking-widest uppercase mt-1">
//           Agasthya Manager
//         </p>
//       </div>

//       {/* Divider */}
//       <div className="w-full border-t border-gray-300 mb-6"></div>

//       {/* Details */}
//       <div className="w-full space-y-5">

//         <div className="flex justify-between items-center">
//           <span className="text-gray-500 font-bold text-xs tracking-widest uppercase">
//             Farm Access
//           </span>
//           <span className="bg-gray-200 px-3 py-1 rounded-lg font-semibold">
//             TKP, TDR
//           </span>
//         </div>

//         <div className="flex justify-between items-center">
//           <span className="text-gray-500 font-bold text-xs tracking-widest uppercase">
//             Role
//           </span>
//           <span className="font-semibold text-black">
//             Super Supervisor
//           </span>
//         </div>

//         <div className="flex justify-between items-center">
//           <span className="text-gray-500 font-bold text-xs tracking-widest uppercase">
//             Session Status
//           </span>
//           <span className="font-bold text-green-600">
//             Active
//           </span>
//         </div>

//       </div>

//       {/* Button */}
//       {/* <button className="
//         mt-8 w-full
//         bg-black text-white
//         py-4
//         rounded-2xl
//         font-bold text-xs uppercase tracking-widest
//         hover:bg-red-700 transition
//         shadow-md
//       "> */}
//       <button className="
//   mt-8 w-full
//   bg-red-600 text-white
//   py-4
//   rounded-2xl
//   font-bold text-xs uppercase tracking-widest
//   transition-all duration-300 ease-in-out
//   hover:bg-red-700
//   hover:shadow-lg
//   hover:-translate-y-0.5
//   active:scale-95
// ">
//         Logout
//       </button>

//     </div>
//   );
// };

// export default Profile;


import React, { useState } from 'react';
import { useRouter } from 'next/router';

const Profile = () => {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    router.replace('/login'); // ✅ prevents back navigation
  };

  return (
    <div className="bg-gray-100 rounded-[24px] md:rounded-[30px] shadow-xl border border-gray-200 w-full p-6 sm:p-8 md:p-10 flex flex-col items-center">

      {/* Avatar */}
      <div className="mb-6 relative">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-600 rounded-full flex items-center justify-center text-white text-3xl sm:text-4xl font-black shadow-md">
          A
        </div>
        <span className="absolute bottom-1 right-1 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 border-4 border-gray-100 rounded-full"></span>
      </div>

      {/* Name */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-black text-black">Admin User</h2>
        <p className="text-green-700 font-bold text-sm tracking-widest uppercase mt-1">
          Agasthya Manager
        </p>
      </div>

      <div className="w-full border-t border-gray-300 mb-6"></div>

      {/* Details */}
      <div className="w-full space-y-5">
        <div className="flex justify-between">
          <span className="text-gray-500 text-xs uppercase">Farm Access</span>
          <span className="bg-gray-200 px-3 py-1 rounded-lg">TKP, TDR</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500 text-xs uppercase">Role</span>
          <span>Super Supervisor</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500 text-xs uppercase">Session Status</span>
          <span className="text-green-600 font-bold">Active</span>
        </div>
      </div>

      {/* Logout */}
      {/* <button
        onClick={handleLogout}
        className="mt-8 w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all duration-300 hover:bg-red-700 hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
      >
        Logout
      </button> */}

      <button
  onClick={() => setShowConfirm(true)}
  className="mt-8 w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all duration-300 hover:bg-red-700 active:scale-95"
>
  Logout
</button>
{showConfirm && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    
    <div className="bg-white rounded-xl p-6 w-[90%] max-w-sm shadow-lg">
      
      <h2 className="text-lg font-bold mb-4 text-center">
        Confirm Logout
      </h2>

      <p className="text-sm text-gray-600 text-center mb-6">
        Are you sure you want to logout?
      </p>

      <div className="flex gap-3">
        
        <button
          onClick={() => setShowConfirm(false)}
          className="w-full py-2 rounded-lg bg-gray-200 font-semibold"
        >
          Cancel
        </button>

        <button
          onClick={() => {
            localStorage.removeItem("isLoggedIn");
            router.replace('/login');
          }}
          className="w-full py-2 rounded-lg bg-red-600 text-white font-semibold"
        >
          Logout
        </button>

      </div>
    </div>

  </div>
)}

    </div>
  );
};

export default Profile;