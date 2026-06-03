import OpsLogPg from '../components/OpsLogPg';

export default function GrassCollectionPage() {
  const config = {
    id: 'grass',
    name: 'Grass Collection',
    icon: '🌿',
    fields: [
      { name: 'noOfLoads', label: 'No. of Loads', type: 'number' },
      { name: 'weight',    label: 'Weight (KG)',   type: 'number' },
    ]
  };

  return (
    <div className="w-full">
      <OpsLogPg moduleConfig={config} />
    </div>
  );
}
