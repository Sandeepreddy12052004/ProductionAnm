import AnimalDetailspg from '@/components/animaldetailspg';

const livestockConfig = {
  id: 'livestock',
  name: 'Live Stock',
  icon: '🐄',
  fields: [
    { name: 'tag', label: 'Tag ID' },
    { name: 'cattleType', label: 'Cattle Type',type: 'select', options: ['Cow', 'Buffalo', 'Buffalo Calf', 'Cow Calf'] },
    { name: 'shed', label: 'Shed Number', type: 'select', options: ['1', '2', '3', '4', '5', '6', '-'] },
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
    { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Sold', 'Dead'] }
  ]
};

export default function AnimalsPage() {
  return (
    <div className="p-4 md:p-3 w-full">
      <AnimalDetailspg moduleConfig={livestockConfig} />
    </div>
  );
}