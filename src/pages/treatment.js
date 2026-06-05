import AnimalDetailsPg from '../components/animaldetailspg';

export default function TreatmentLogPage() {
  const config = {
    id: 'health',
    name: 'Treatment Log',
    icon: '📋',
    fields: [
      { name: 'tagId', label: 'Tag ID' },
      { name: 'animalType', label: 'Animal Type', disabled: true },
      { name: 'shedId', label: 'Shed', type: 'select', options: ['-'], disabled: true },
      { name: 'symptoms', label: 'Symptoms' },
      { name: 'diagnosis', label: 'Diagnosis/Issue', required: false ,optional: true},
      { name: 'treatment', label: 'Action Taken' },
      { name: 'healthStatus', label: 'Health Status', type: 'select', options: ['Completed', 'Pending', 'Critical'] }
    ]
  };

  return (
    <div className="w-full">
      <AnimalDetailsPg moduleConfig={config} />
    </div>
  );
}
