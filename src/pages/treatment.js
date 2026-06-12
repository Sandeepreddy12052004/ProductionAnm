import AnimalDetailsPg from '../components/animaldetailspg';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

export default function TreatmentLogPage() {
  const [symptomOptions, setSymptomOptions] = useState([]);
  const [diagnosisOptions, setDiagnosisOptions] = useState([]);
  const [medicines, setMedicines] = useState([]);

  useEffect(() => {
    let isMounted = true;
    api.treatments.getAll()
      .then(res => {
        if (isMounted && res && Array.isArray(res)) {
          const symptoms = Array.from(new Set(res.map(t => t.symptoms).filter(Boolean)));
          const diagnoses = Array.from(new Set(res.map(t => t.diagnosis).filter(Boolean)));
          setSymptomOptions(symptoms);
          setDiagnosisOptions(diagnoses);
        }
      })
      .catch(err => console.error("Failed to fetch treatment templates:", err));

    api.medicines.getAll()
      .then(res => {
        if (isMounted && res) {
          const list = Array.isArray(res) ? res : (res.data || []);
          const names = list.map(m => m.name).filter(Boolean);
          setMedicines(names);
        }
      })
      .catch(err => console.error("Failed to fetch medicines:", err));

    return () => { isMounted = false; };
  }, []);

  const config = {
    id: 'health',
    name: 'Treatment Log',
    icon: '📋',
    fields: [
      { name: 'tagId', label: 'Tag ID' },
      { name: 'animalType', label: 'Animal Type', disabled: true },
      { name: 'shedId', label: 'Shed', type: 'select', options: ['-'], disabled: true },
      { name: 'symptoms', label: 'Symptoms', type: 'select', options: symptomOptions.length > 0 ? symptomOptions : ['-'] },
      { name: 'diagnosis', label: 'Diagnosis/Issue', type: 'select', options: diagnosisOptions.length > 0 ? diagnosisOptions : ['-'], optional: true },
      { name: 'treatment', label: 'Treatment', type: 'select', options: medicines.length > 0 ? medicines : ['-'] },
      { name: 'healthStatus', label: 'Health Status', type: 'select', options: ['Completed', 'Pending', 'Critical'] }
    ]
  };

  return (
    <div className="w-full">
      <AnimalDetailsPg moduleConfig={config} />
    </div>
  );
}
