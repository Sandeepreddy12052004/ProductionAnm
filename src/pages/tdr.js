// import React from 'react';
// import Sidebar from '@/components/Sidebar';
// import FarmTDR from '@/components/tdrfarmpg';
// import Header from '@/components/Header'; // ✅ ADD

// export default function TDRPage() {
//   return (
//     <div className="flex h-screen bg-gray-50 overflow-hidden">
      
//       <div className="flex-shrink-0">
//         <Sidebar />
//       </div>

//       <main className="flex-1 overflow-auto">
        
//         {/* ✅ FIXED RESPONSIVE HEADER */}
//         <div className="fixed top-0 left-0 md:left-64 right-0 z-[50] md:z-[1000]">
//           <Header />
//         </div>

//         {/* ✅ PUSH CONTENT BELOW HEADER */}
//         <div className="pt-16 min-w-max">
//           <FarmTDR />
//         </div>

//       </main>

//     </div>
//   );
// }



import React from 'react';
import FarmTDR from '@/components/tdrfarmpg';

export default function TDRPage() {
  return (
    <div className="p-4 md:p-3 w-full">
      <FarmTDR />
    </div>
  );
}