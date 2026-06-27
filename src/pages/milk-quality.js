import OpsLogPg from '../components/OpsLogPg';

export default function MilkQualityPage() {
  const config = {
    id: 'components',
    name: 'Milk QA',
    icon: '🔬',
    showAllOption: false,
    fields: [
      { name: 'fat',     label: 'Fat %',        type: 'number' },
      { name: 'snf',     label: 'SNF %',        type: 'number' },
      { name: 'density', label: 'CLR / Density', type: 'number' },
      { name: 'water',   label: 'Water %',      type: 'number' },
    ]
  };

  return (
    <div className="w-full">
      <OpsLogPg moduleConfig={config} />
    </div>
  );
}
