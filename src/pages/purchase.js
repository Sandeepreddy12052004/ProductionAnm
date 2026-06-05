import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import AnimalDetailsPg from '../components/animaldetailspg';

export default function PurchaseLogPage() {
  const [farmOptions, setFarmOptions] = useState([]);

  useEffect(() => {
    let isMounted = true;
    api.farms.getAll()
      .then(res => {
        if (isMounted && res && Array.isArray(res)) {
          const opts = res.map(f => ({ label: f.name || f.code, value: f._id || f.id }));
          if (opts.length > 0) setFarmOptions(opts);
        }
      })
      .catch(err => console.error("Failed to fetch farms:", err));
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
        name: 'farmId',
        label: 'Farm Assigned',
        type: 'select',
        options: farmOptions.length > 0 ? farmOptions : [{ label: '-', value: '' }]
      }
    ]
  };

  return (
    <div className="w-full">
      <AnimalDetailsPg moduleConfig={config} />
    </div>
  );
}