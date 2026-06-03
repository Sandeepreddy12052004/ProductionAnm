import OpsLogPg from '../components/OpsLogPg';

export default function DailyFeedingPage() {
  const config = {
    id: 'feeding',
    name: 'Daily Feeding',
    icon: '🌾',
    fields: [
      { name: 'shedId',          label: 'Shed',                type: 'select', options: [] },
      { name: 'animalId',        label: 'Cattle / Animal',     type: 'select', options: [] },
      { name: 'greenGrass',      label: 'Green Grass (KG)',    type: 'number' },
      { name: 'dryGrass',        label: 'Dry Grass (KG)',      type: 'number' },
      { name: 'cottonCake',      label: 'C.Cake (KG)',         type: 'number' },
      { name: 'chunni',          label: 'Chunni (KG)',         type: 'number' },
      { name: 'maize',           label: 'Maize (KG)',          type: 'number' },
      { name: 'wheatBran',       label: 'Wheat Bran (KG)',     type: 'number' },
      { name: 'salt',            label: 'Salt (G)',            type: 'number' },
      { name: 'oralCalcium',     label: 'Oral Calcium (ML)',   type: 'number' },
      { name: 'mineralMixture',  label: 'Mineral Mixture (G)', type: 'number' },
    ]
  };

  return (
    <div className="w-full">
      <OpsLogPg moduleConfig={config} />
    </div>
  );
}
