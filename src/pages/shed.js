// import Sidebar from '../components/Sidebar';
// import AnimalDetailsPg from '../components/animaldetailspg';
// import Header from '@/components/Header'; // ✅ ADD

// export default function ShedLogPage() {
//   const config = {
//     id: 'shed',
//     name: 'Shed Log',
//     icon: '🏠',
//     fields: [
//       { name: 'tag', label: 'Tag ID' },
//       { name: 'shiftingDate', label: 'Shifting Date', type: 'date' },
//       { name: 'oldShed', label: 'Old Shed Number', type: 'select', options: ['1', '2', '3', '4', '5', '6', '-'] },
//       { name: 'newShed', label: 'New Shed Number', type: 'select', options: ['1', '2', '3', '4', '5', '6', '-'] },
//       { name: 'reason', label: 'Reason', type: 'textarea' }
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




import AnimalDetailsPg from '../components/animaldetailspg';

export default function ShedLogPage() {
  const config = {
    id: 'shed',
    name: 'Shed Log',
    icon: '🏠',
    fields: [
      { name: 'tag', label: 'Tag ID' },
      { name: 'shiftingDate', label: 'Shifting Date', type: 'date' },
      { name: 'oldShed', label: 'Old Shed Number', type: 'select', options: ['1', '2', '3', '4', '5', '6', '-'] },
      { name: 'newShed', label: 'New Shed Number', type: 'select', options: ['1', '2', '3', '4', '5', '6', '-'] },
      { name: 'reason', label: 'Reason', type: 'textarea' }
    ]
  };

  return (
    <div className="p-4 md:p-8 w-full">
      <AnimalDetailsPg moduleConfig={config} />
    </div>
  );
}