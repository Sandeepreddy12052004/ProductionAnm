import OpsLogPg from '../components/OpsLogPg';

export default function DailyFeedingPage() {
  const config = {
    id: 'feeding',
    name: 'Daily Feeding',
    icon: '🌾',
    fields: [
      { name: 'shedId',          label: 'Shed',                type: 'select', options: [] },
      { name: 'animalId',        label: 'Animal',              type: 'select', options: [] },
      { name: 'greenGrass',      label: 'Green Grass (KG)',    type: 'number', optional: true },
      { name: 'dryGrass',        label: 'Dry Grass (KG)',      type: 'number', optional: true },
      { name: 'cottonCake',      label: 'C.Cake (KG)',         type: 'number', optional: true },
      { name: 'chunni',          label: 'Chunni (KG)',         type: 'number', optional: true },
      { name: 'maize',           label: 'Maize (KG)',          type: 'number', optional: true },
      { name: 'wheatBran',       label: 'Wheat Bran (KG)',     type: 'number', optional: true },
      { name: 'salt',            label: 'Salt (G)',            type: 'number', optional: true },
      { name: 'oralCalcium',     label: 'Oral Calcium (ML)',   type: 'number', optional: true },
      { name: 'mineralMixture',  label: 'Mineral Mixture (G)', type: 'number', optional: true },
    ]
  };

  return (
    <div className="w-full">
      <OpsLogPg moduleConfig={config} />
    </div>
  );
}
