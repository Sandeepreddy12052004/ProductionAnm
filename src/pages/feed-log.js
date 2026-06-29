import OpsLogPg from '../components/OpsLogPg';

export default function FeedLogPage() {
  const config = {
    id: 'feed_inv',
    name: 'Feed Log',
    icon: '📋',
    fields: [
      { name: 'farmId',          label: 'Farm',            type: 'text' },
      { name: 'feedType',        label: 'Feed Item',       type: 'select', options: [] },
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
