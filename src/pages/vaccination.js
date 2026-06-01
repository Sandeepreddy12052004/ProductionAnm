import AnimalDetailsPg from '../components/animaldetailspg';

export default function VaccinationLogPage() {
  const config = {
    id: 'vaccine',
    name: 'Vaccination Log',
    icon: '💉',
    fields: [
      { name: 'tagId', label: 'Tag ID' },
      { name: 'animalType', label: 'Animal Type', disabled: true },
      { name: 'shedId', label: 'Shed', type: 'select', options: ['-'], disabled: true },
      { name: 'vaccinationName', label: 'Vaccine Name' },
      { name: 'batchNo', label: 'Vaccine Batch No' },
      { name: 'manufactureDate', label: 'Manufacture Date', type: 'date' },
      { name: 'expiryDate', label: 'Expiry Date', type: 'date' },
      { name: 'treatmentOrStatus', label: 'Treatment/Status', type: 'select', options: ['Completed', 'Pending'] }
    ]
  };

  return (
    <div className="w-full">
      <AnimalDetailsPg moduleConfig={config} />
    </div>
  );
}
