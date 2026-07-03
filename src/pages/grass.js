import OpsLogPg from '../components/OpsLogPg';

export default function GrassCollectionPage() {
  const config = {
    id: 'grass',
    name: 'Grass Collection',
    icon: '🌿',
    showAllOption: false,
    fields: [
      { name: 'date',           label: 'Date',             type: 'date' },
      { name: 'sourcingFarmId', label: 'Sourcing Farm',   type: 'select', options: [] },
      { name: 'session',        label: 'Session',          type: 'select', options: ['Morning', 'Evening'] },
      { name: 'noOfLoads',      label: 'No. of Loads',     type: 'number' },
      { name: 'weight',         label: 'Weight (KG)',      type: 'number' },
      { name: 'harvestedArea',  label: 'Harvested Area (Acres)', type: 'number' },
      { name: 'yield',          label: 'Yield (KG/Acre)',  type: 'number', disabled: true, readOnly: true },
      { name: 'noOfWorkers',    label: 'No. of Workers',   type: 'number' },
      { name: 'laborId',        label: 'Labor',            type: 'select', options: [] },
      { name: 'procuredBy',     label: 'Procured By User', type: 'text' },
    ]
  };

  return (
    <div className="w-full">
      <OpsLogPg moduleConfig={config} />
    </div>
  );
}
