// import Sidebar from '../components/Sidebar';
// import AnimalDetailsPg from '../components/animaldetailspg';
// import Header from '@/components/Header'; // ✅ ADD

// export default function PurchaseLogPage() {
//   const config = {
//     id: 'purchase',
//     name: 'Purchase Log',
//     icon: '📥',
//     fields: [
//       { name: 'tag', label: 'Tag ID' },
//       { name: 'sellerName', label: 'Seller Name' },
//       { name: 'sellerContact', label: 'Seller Contact', type: 'number' },
//       { name: 'price', label: 'Purchase Price (₹)' , type: 'number' },
//       { name: 'purchaseDate', label: 'Purchase Date', type: 'date' },
//       { name: 'shed', label: 'Shed Assigned', type: 'select', options: ['1', '2', '3', '4', '5', '6', '-'] }
//     ]
//   };

//   return (
//     <div className="flex h-screen bg-gray-50 overflow-hidden">
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




import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import AnimalDetailsPg from '../components/animaldetailspg';

export default function PurchaseLogPage() {
  const [farms, setFarms] = useState([]);

  useEffect(() => {
    let isMounted = true;
    api.farms.getAll()
      .then(res => {
        if (isMounted && res && Array.isArray(res)) {
          const farmNames = res.map(f => ({ label: f.name || f.code, value: f._id || f.id }));
          if (farmNames.length > 0) setFarms(farmNames);
        }
      })
      .catch(err => console.error("Failed to fetch farms:", err));
    return () => { isMounted = false; };
  }, []);

  const config = {
    id: 'purchase',
    name: 'Purchase Log',
    icon: '📥',
    fields: [
      { name: 'tag', label: 'Tag ID' },
      { name: 'sellerName', label: 'Seller Name' },
      { name: 'sellerContact', label: 'Seller Contact', type: 'number' },
      { name: 'price', label: 'Purchase Price (₹)' , type: 'number' },
      { name: 'purchaseDate', label: 'Purchase Date', type: 'date' },
      { name: 'farmId', label: 'Farm Assigned', type: 'select', options: farms }
    ]
  };

  return (
    <div className="w-full">
      <AnimalDetailsPg moduleConfig={config} />
    </div>
  );
}