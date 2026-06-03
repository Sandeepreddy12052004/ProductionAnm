import OpsLogPg from '../components/OpsLogPg';

export default function MilkCollectionPage() {
  const config = {
    id: 'milk_prod',
    name: 'Daily Milk Collection',
    icon: '🥛',
    fields: [
      { name: 'shedId',           label: 'Shed',                 type: 'select', options: [] },
      { name: 'tagId',            label: 'Tag ID' },
      { name: 'session',          label: 'Session',              type: 'select', options: ['MORNING', 'EVENING'] },
      { name: 'quantity',         label: 'Quantity (L)',         type: 'number' },
      { name: 'selfConsumption',  label: 'Self Consumption (L)', type: 'number' },
      { name: 'dayTotal',         label: 'Day Total (L)',        type: 'number' },
    ]
  };

  return (
    <div className="w-full">
      <OpsLogPg moduleConfig={config} />
    </div>
  );
}
