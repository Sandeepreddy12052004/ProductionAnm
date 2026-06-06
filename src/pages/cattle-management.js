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
        options: [
          'Murrah',
          'Bhuri',
          'Mixed',
          'Gir',
          'Punganur'
        ]
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
          'SICK',
          'DRY'
        ]
      },

      { name: 'milk', label: 'Milk Yield' },

      { name: 'shed', label: 'Shed Number' }
    ]
  };

  return (
    <div className="p-4 md:p-3 w-full">
      <CattleManagementPg moduleConfig={cattleConfig} />
    </div>
  );
}