// import React from "react";
// import Sidebar from "../components/Sidebar";
// import DashboardContent from "../components/DashboardContent";

// export default function IndexPage() {
//   return (
//     // 'flex' helps keep things aligned, 'bg-gray-50' matches your card borders
//     <div className="flex bg-gray-50 min-h-screen">

//       {/* 1. Sidebar: Ensure your Sidebar.js has 'fixed' in its class list */}
//       <Sidebar />

//       {/* 2. Main Content: 
//           - 'pl-64' creates space for the sidebar.
//           - 'w-full' ensures it takes up the rest of the screen.
//       */}
//       <main className="flex-1 pl-6 p-8">
//         <header className="mb-8 border-b border-gray-200 pb-4">
//           <h1 className="text-4xl font-extrabold text-green-900">
//             Welcome to <span className="text-green-600">AGASTHYA</span>
//           </h1>
//         </header>

//         {/* This will now appear correctly at the top right, not below the sidebar */}
//         <DashboardContent />
//       </main>

//     </div>
//   );
// }


export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/dashboard",
      permanent: false,
    },
  };
}

export default function Home() {
  return null;
}