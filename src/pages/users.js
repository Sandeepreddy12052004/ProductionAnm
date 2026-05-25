import UserManagementPg from '@/components/UserManagementPg';
import { useState, useEffect } from 'react';
import { api } from '@/utils/api';

export default function UsersPage() {
  const [departments, setDepartments] = useState(['Accounts', 'Admin', 'BMC', 'Farming', 'Global', 'Management', 'Milking']);
  const [farms, setFarms] = useState(['TKP', 'TDR']);

  useEffect(() => {
    let isMounted = true;
    
    // Dynamically fetch departments from API
    api.departments.getAll()
      .then(res => {
        if (isMounted && res && Array.isArray(res)) {
          const deptNames = res.map(d => d.name).filter(Boolean);
          if (deptNames.length > 0) setDepartments(deptNames);
        }
      })
      .catch(err => console.error("Failed to fetch departments:", err));

    // Dynamically fetch farms from API
    api.farms.getAll()
      .then(res => {
        if (isMounted && res && Array.isArray(res)) {
          const farmNames = res.map(f => f.name || f.code).filter(Boolean);
          if (farmNames.length > 0) setFarms(farmNames);
        }
      })
      .catch(err => console.error("Failed to fetch farms:", err));

    return () => { isMounted = false; };
  }, []);

  const userConfig = {
    id: 'users',
    name: 'User Management',
    icon: '👥',
    fields: [
      { name: 'userId', label: 'User ID' },
      { name: 'name', label: 'Name' },
      { name: 'email', label: 'Email', optional: true },
      { name: 'password', label: 'Password' },
      { name: 'phone', label: 'Phone No', type: 'number' },
      {
        name: 'farm',
        label: 'Farm',
        type: 'select',
        options: farms
      },
      {
        name: 'department',
        label: 'Department',
        type: 'select',
        options: departments
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

  return (
    <div className="w-full">
      <UserManagementPg moduleConfig={userConfig} />
    </div>
  );
}