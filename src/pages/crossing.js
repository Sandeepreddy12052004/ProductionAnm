// import Sidebar from '../components/Sidebar';
// import AnimalDetailsPg from '../components/animaldetailspg';
// import Header from '@/components/Header';

// export default function CrossingLogPage() {
//   const config = {
//     id: 'crossing',
//     name: 'Crossing Log',
//     icon: '🧬',
//     fields: [
//       { name: 'tag', label: 'Tag ID' },
//       { name: 'maleTag', label: 'Male Tag ID' },
//       { name: 'crossingDate', label: 'Crossing Date', type: 'date' },
//       { name: 'crossingAttemptNumber', label: 'Crossing Attempt No.', type: 'number' },
//       { name: 'PD date', label: 'PD Test Date', type: 'date' },
//       { name: 'pregnancy status', label: 'Pregnancy Status', type: 'select', options: ['Positive', 'Negative', 'Pending'] },
//       { name: 'pregnancy confirmed date', label: 'Pregnancy Confirmed Date', type: 'date' },
//       { name: 'estimated calving date', label: 'Estimated Calving Date', type: 'date' },
//       { name: 'Pregnant age', label: 'Pregnant Age', type: 'number' },
//       { name: 'actual calving date', label: 'Actual Calving Date', type: 'date' },
//       { name: 'calf tag', label: 'Calf Tag ID' },
//       { name: 'remarks', label: 'Remarks', type: 'textarea' },
//       { name: 'breedType', label: 'Breed Type' },
//       { name: 'heat monitoring 1st notification', label: 'Heat Monitoring 1st Notification', type: 'date' },
//       { name: 'heat monitoring 2nd notification', label: 'Heat Monitoring 2nd Notification', type: 'date' }
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

export default function CrossingLogPage() {
  const config = {
    id: 'crossing',
    name: 'Crossing Log',
    icon: '🧬',
    fields: [
      { name: 'tag', label: 'Tag ID' },
      { name: 'maleTag', label: 'Male Tag ID' },
      { name: 'crossingDate', label: 'Crossing Date', type: 'date' },
      { name: 'crossingAttemptNumber', label: 'Crossing Attempt No.', type: 'number' },
      { name: 'PD date', label: 'PD Test Date', type: 'date' },
      { name: 'pregnancy status', label: 'Pregnancy Status', type: 'select', options: ['Positive', 'Negative', 'Pending'] },
      { name: 'pregnancy confirmed date', label: 'Pregnancy Confirmed Date', type: 'date' },
      { name: 'estimated calving date', label: 'Estimated Calving Date', type: 'date' },
      { name: 'Pregnant age', label: 'Pregnant Age', type: 'number' },
      { name: 'actual calving date', label: 'Actual Calving Date', type: 'date' },
      { name: 'calf tag', label: 'Calf Tag ID' },
      { name: 'remarks', label: 'Remarks', type: 'textarea' },
      { name: 'breedType', label: 'Breed Type' },
      { name: 'heat monitoring 1st notification', label: 'Heat Monitoring 1st Notification', type: 'date' },
      { name: 'heat monitoring 2nd notification', label: 'Heat Monitoring 2nd Notification', type: 'date' }
    ]
  };

  return (
    <div className="p-4 md:p-8 w-full">
      <AnimalDetailsPg moduleConfig={config} />
    </div>
  );
}