import UserManagementPg from '@/components/UserManagementPg';

const userConfig = {
  id: 'users',
  name: 'User Management',
  icon: '👥',
  fields: [
    { name: 'userId', label: 'User ID' },
    { name: 'name', label: 'Name' },

    // OPTIONAL EMAIL
    { name: 'email', label: 'Email', optional: true },

    { name: 'mobile', label: 'Mobile No', type: 'number' },

    {
      name: 'farm',
      label: 'Farm',
      type: 'select',
      options: ['TKP', 'TDR']
    },

    {
      name: 'department',
      label: 'Department',
      type: 'select',
      options: ['IT', 'Dispatch', 'Production', 'Security']
    },

    {
      name: 'role',
      label: 'Role',
      type: 'select',
      options: [
        { label: 'Super Admin', value: 'SUPER_ADMIN' },
        { label: 'Farm Admin', value: 'FARM_ADMIN' },
        { label: 'Incharge', value: 'INCHARGE' }
      ]
    }
  ]
};

export default function UsersPage() {
  return (
    <div className="p-4 md:p-8 w-full">
      <UserManagementPg moduleConfig={userConfig} />
    </div>
  );
}