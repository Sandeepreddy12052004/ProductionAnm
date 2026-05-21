// import Sidebar from '../components/Sidebar';
// import AnimalDetailsPg from '../components/animaldetailspg';
// import Header from '@/components/Header'; // ✅ ADD

// export default function SalePage() {
//   const config = {
//     id: 'sale',
//     name: 'Sale Log',
//     icon: '📤',
//     fields: [
//       { name: 'tag', label: 'Tag ID' },
//       { name: 'saleDate', label: 'Sale Date', type: 'date' },
//       { name: 'buyer', label: 'Buyer Name' },
//       { name: "contact", label: 'Buyer Contact', type: 'number'  },
//       { name: 'reason', label: 'Reason for Sale' },
//       { name: 'price', label: 'Price', type: 'number' }
//     ]
//   };

//   return (
//     <div className="flex h-screen overflow-hidden">
//       <Sidebar />

//       <main className="flex-1 overflow-auto">
        
//         {/* ✅ FIXED RESPONSIVE HEADER */}
//         <div className="fixed top-0 left-0 md:left-64 right-0 z-[50] md:z-[1000]">
//           <Header />
//         </div>

//         {/* ✅ PUSH CONTENT BELOW HEADER */}
//         <div className="pt-16 min-w-max">
//           <AnimalDetailsPg moduleConfig={config} />
//         </div>

//       </main>
//     </div>
//   );
// }




import AnimalDetailsPg from '../components/animaldetailspg';

export default function SalePage() {
  const config = {
    id: 'sale',
    name: 'Sale Log',
    icon: '📤',
    fields: [
      { name: 'tag', label: 'Tag ID' },
      { name: 'saleDate', label: 'Sale Date', type: 'date' },
      { name: 'buyer', label: 'Buyer Name' },
      { name: "contact", label: 'Buyer Contact', type: 'number' },
      { name: 'reason', label: 'Reason for Sale' },
      { name: 'price', label: 'Price', type: 'number' }
    ]
  };

  return (
    <div className="p-4 md:p-8 w-full">
      <AnimalDetailsPg moduleConfig={config} />
    </div>
  );
}