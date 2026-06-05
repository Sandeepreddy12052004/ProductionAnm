import AnimalDetailspg from '@/components/animaldetailspg';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

export default function AnimalsPage() {
  const [shedOptions, setShedOptions] = useState([]);

  useEffect(() => {
    let isMounted = true;
    api.sheds.getAll()
      .then(res => {
        if (isMounted && res && Array.isArray(res)) {
          const names = res.map(s => s.name || s.code || String(s._id || s.id));
          if (names.length > 0) setShedOptions(names);
        }
      })
      .catch(err => console.error("Failed to fetch sheds:", err));
    return () => { isMounted = false; };
  }, []);

  const livestockConfig = {
    id: 'livestock',
    name: 'Live Stock',
    icon: '🐄',
    fields: [
      { name: 'tag', label: 'Tag ID' },
      {
        name: 'cattleType',
        label: 'Animal Type',
        type: 'select',
        options: ['Cow', 'Buffalo', 'Buffalo Calf', 'Cow Calf']
      },
      {
        name: 'shed',
        label: 'Shed Number',
        type: 'select',
        options: shedOptions.length > 0 ? shedOptions : ['-']
      },
      { name: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
      { name: 'age', label: 'Age' },
      { name: 'breed', label: 'Breed' },
      { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
      { name: 'dameId', label: 'Dame ID (Mother)', type: 'text' },
      { name: 'dameBreed', label: 'Dame Breed' },
      { name: 'sireId', label: 'Sire ID (Father)', type: 'text' },
      { name: 'sireBreed', label: 'Sire Breed' },
      { name: 'calvings', label: 'No. of Calvings', type: 'number' },
      { name: 'farmBorn', label: 'Farm Born', type: 'select', options: ['Yes', 'No'] },
      { name: 'purchaseDate', label: 'Purchase Date', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'SOLD', 'DECEASED'] }
    ]
  };

  return (
    <div className="p-4 md:p-3 w-full">
      <AnimalDetailspg moduleConfig={livestockConfig} />
    </div>
  );
}