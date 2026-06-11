import OpsLogPg from '../components/OpsLogPg';

export default function MedicineInventoryPage() {
  const config = {
    id: 'med_inv',
    name: 'Medicine Inventory',
    icon: '💊',
    fields: [
      { name: 'medicineName',  label: 'Medicine Name', type: 'select', options: [] },
      { name: 'type',          label: 'Type',          type: 'select', options: ['Injection', 'Tablet', 'Liquid', 'Powder'], disabled: true },
      { name: 'oldStock',      label: 'Old Stock',     type: 'number' },
      { name: 'bought',        label: 'Bought',        type: 'number' },
      { name: 'used',          label: 'Used',          type: 'number' },
      { name: 'presentStock',  label: 'Present Stock', type: 'number' },
      { name: 'purchaseDate',  label: 'Purchase Date', type: 'date' },
      { name: 'expiryDate',    label: 'Expiry Date',   type: 'date' },
    ]
  };

  return (
    <div className="w-full">
      <OpsLogPg moduleConfig={config} />
    </div>
  );
}
