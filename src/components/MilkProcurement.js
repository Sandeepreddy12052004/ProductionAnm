import React from 'react';
import OpsLogPg from './OpsLogPg';

export default function MilkProcurement() {
  const config = {
    id: 'procurement',
    name: 'Milk Procurement',
    icon: '🥛',
    fields: [
      { name: 'date',         label: 'Date',             type: 'date' },
      { name: 'procuredFrom', label: 'Procured From',    type: 'select', options: [] },
      { name: 'liters',       label: 'Liters',           type: 'number' },
      { name: 'farmId',       label: 'Farm',             type: 'select', options: [] },
    ]
  };

  return <OpsLogPg moduleConfig={config} />;
}
