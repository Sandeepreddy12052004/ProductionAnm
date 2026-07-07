import CattleManagementPg from '@/components/CattleManagementPg';

export default function CattleManagementPage() {
  const cattleConfig = {
    id: 'cattle-management',
    name: 'Cattle Management',
    icon: '🐄',

    fields: [
      { name: 'tag', label: 'Tag ID' },
      {
        name: 'breed',
        label: 'Breed',
        type: 'select',
        options: []
      },
      {
        name: 'gender',
        label: 'Gender',
        type: 'select',
        options: ['Male', 'Female']
      },
      { name: 'age', label: 'Age' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: [
          'ACTIVE',
          'PREGNANT',
          'EMPTY',
          'PENDING',
          'SOLD',
          'DECEASED'
        ]
      },
      { name: 'milk', label: 'Milk Yield' },
      { name: 'shed', label: 'Shed Number', type: 'select', options: [] },
      { name: 'farmId', label: 'Farm', type: 'select', options: [] }
    ]
  };

  return (
    <div className="w-full">
      <CattleManagementPg moduleConfig={cattleConfig} />
    </div>
  );
}