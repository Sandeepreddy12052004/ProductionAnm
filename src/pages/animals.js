import AnimalDetailspg from '@/components/animaldetailspg';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

export default function AnimalsPage() {
  const [shedOptions, setShedOptions] = useState([]);
  const [breedOptions, setBreedOptions] = useState([]);
  const [animalOptions, setAnimalOptions] = useState(['Cow', 'Buffalo', 'Buffalo Calf', 'Cow Calf']);

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

  useEffect(() => {
    let isMounted = true;
    api.breeds.getAll()
      .then(res => {
        if (isMounted && res && Array.isArray(res)) {
          const names = res.filter(b => b && !b.isDeleted && b.status !== false).map(b => b.name);
          if (names.length > 0) setBreedOptions(names);
        }
      })
      .catch(err => console.error("Failed to fetch breeds:", err));
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    api.animals.getAll()
      .then(res => {
        if (isMounted && res && Array.isArray(res)) {
          const names = res.filter(a => a && a.status !== false).map(a => a.name);
          if (names.length > 0) setAnimalOptions(names);
        }
      })
      .catch(err => console.error("Failed to fetch animals:", err));
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
        options: animalOptions
      },
      { name: 'farmBorn', label: 'Farm Born', type: 'select', options: ['Yes', 'No'] },
      {
        name: 'shed',
        label: 'Shed Number',
        type: 'select',
        options: shedOptions.length > 0 ? shedOptions : ['-']
      },
      { name: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
      { name: 'age', label: 'Age' },
      { name: 'breed', label: 'Breed', type: 'select', options: breedOptions.length > 0 ? breedOptions : ['-'] },
      { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
      { name: 'dameId', label: 'Dame ID (Mother)', type: 'text' },
      { name: 'dameBreed', label: 'Dame Breed', type: 'select', options: breedOptions.length > 0 ? breedOptions : ['-'] },
      { name: 'sireId', label: 'Sire ID (Father)', type: 'text' },
      { name: 'sireBreed', label: 'Sire Breed', type: 'select', options: breedOptions.length > 0 ? breedOptions : ['-'] },
      { name: 'calvings', label: 'No. of Calvings', type: 'number' },
      { name: 'purchaseDate', label: 'Purchase Date', type: 'date' },
      { name: 'remarks', label: 'Remarks', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'PREGNANT', 'EMPTY', 'PENDING', 'SOLD', 'DECEASED'] }
    ]
  };

  return (
    <div className="w-full">
      <AnimalDetailspg moduleConfig={livestockConfig} />
    </div>
  );
}