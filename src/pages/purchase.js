import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import AnimalDetailsPg from '../components/animaldetailspg';

export default function PurchaseLogPage() {
  const [shedOptions, setShedOptions] = useState([]);

  useEffect(() => {
    let isMounted = true;
    api.sheds.getAll()
      .then(res => {
        if (isMounted && res && Array.isArray(res)) {
          const names = res.map(s => s.name || s.code || String(s._id || s.id));
          if (names.length > 0) setShedOptions(names);
        }
      })
      .catch(err => console.error("Failed to fetch sheds:", err));
    return () => { isMounted = false; };
  }, []);

  const config = {
    id: 'purchase',
    name: 'Purchase Log',
    icon: '📥',
    fields: [
      { name: 'tag', label: 'Tag ID' },
      { name: 'purchaseFrom', label: 'Seller Name' },
      { name: 'sellerContact', label: 'Seller Contact', type: 'number' },
      { name: 'purchasePrice', label: 'Purchase Price (₹)', type: 'number' },
      { name: 'purchaseDate', label: 'Purchase Date', type: 'date' },
      {
        name: 'shed',
        label: 'Shed Assigned',
        type: 'select',
        options: shedOptions.length > 0 ? shedOptions : ['-']
      }
    ]
  };

  return (
    <div className="w-full">
      <AnimalDetailsPg moduleConfig={config} />
    </div>
  );
}