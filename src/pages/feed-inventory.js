import OpsLogPg from '../components/OpsLogPg';

export default function FeedInventoryPage() {
  const config = {
    id: 'feed_inv',
    name: 'Feed Inventory',
    icon: '📦',
    fields: [
      { name: 'feedType',        label: 'Feed Item',       type: 'select', options: ['Green Grass', 'Dry Grass', 'Cotton Cake', 'Chunni', 'Maize', 'Wheat Bran'] },
      { name: 'oldStock',        label: 'Old Stock',       type: 'number' },
      { name: 'bought',          label: 'Bought',          type: 'number' },
      { name: 'usage',           label: 'Bags / Usage',    type: 'number' },
      { name: 'remainingStock',  label: 'Remaining Stock', type: 'number' },
      { name: 'purchaseDate',    label: 'Purchase Date',   type: 'date' },
    ]
  };

  return (
    <div className="w-full">
      <OpsLogPg moduleConfig={config} />
    </div>
  );
}
