// import React, { useState } from 'react';

// const UserManagementPg = ({ moduleConfig }) => {
//   const [users, setUsers] = useState([]);
//   const [search, setSearch] = useState('');
//   const [filters, setFilters] = useState({
//     farm: '',
//     department: '',
//     role: ''
//   });

//   const [selectedUser, setSelectedUser] = useState(null);
//   const [viewMode, setViewMode] = useState(false);
//   const [editMode, setEditMode] = useState(false);

//   // SEARCH + FILTER
//   const filteredUsers = users.filter((user) => {
//     const matchSearch =
//       user.name?.toLowerCase().includes(search.toLowerCase()) ||
//       user.userId?.toLowerCase().includes(search.toLowerCase());

//     const matchFarm = filters.farm ? user.farm === filters.farm : true;
//     const matchDept = filters.department ? user.department === filters.department : true;
//     const matchRole = filters.role ? user.role === filters.role : true;

//     return matchSearch && matchFarm && matchDept && matchRole;
//   });

//   const inputStyle =
//     "border p-2 rounded w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-white border-gray-300 dark:border-gray-600";

//   return (
//     <div className="w-full">

//       {/* HEADER */}
//       <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
//         {moduleConfig.name}
//       </h2>

//       {/* SEARCH + FILTER */}
//       <div className="flex flex-wrap gap-3 mb-4">

//         <input
//           placeholder="Search by Name / User ID"
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           className={`w-60 ${inputStyle}`}
//         />

//         <select
//           onChange={(e) => setFilters({ ...filters, farm: e.target.value })}
//           className={inputStyle}
//         >
//           <option value="">All Farms</option>
//           <option>Farm 1</option>
//           <option>Farm 2</option>
//         </select>

//         <select
//           onChange={(e) => setFilters({ ...filters, department: e.target.value })}
//           className={inputStyle}
//         >
//           <option value="">All Departments</option>
//           <option>Production</option>
//           <option>HR</option>
//         </select>

//         <select
//           onChange={(e) => setFilters({ ...filters, role: e.target.value })}
//           className={inputStyle}
//         >
//           <option value="">All Roles</option>
//           <option>Admin</option>
//           <option>User</option>
//         </select>

//       </div>

//       {/* TABLE */}
//       <div className="overflow-auto bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700">
//         <table className="min-w-full text-sm">

//           {/* HEADER */}
//           <thead className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
//             <tr>
//               <th className="p-3 text-left">S.no</th>

//               {moduleConfig.fields.map((field) => (
//                 <th key={field.name} className="p-3 text-left">
//                   {field.label}
//                 </th>
//               ))}

//               <th className="p-3 text-left">Status</th>
//               <th className="p-3 text-left">Actions</th>
//             </tr>
//           </thead>

//           {/* BODY */}
//           <tbody>
//             {filteredUsers.length === 0 ? (
//               <tr>
//                 <td colSpan="10" className="text-center p-4 text-gray-500 dark:text-gray-400">
//                   No users found
//                 </td>
//               </tr>
//             ) : (
//               filteredUsers.map((user, index) => (
//                 <tr
//                   key={user.id}
//                   className="border-t border-gray-200 dark:border-gray-700"
//                 >
//                   <td className="p-3">{index + 1}</td>

//                   {moduleConfig.fields.map((field) => (
//                     <td key={field.name} className="p-3">
//                       {user[field.name]}
//                     </td>
//                   ))}

//                   {/* STATUS */}
//                   <td className="p-3">
//                     <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">
//                       {user.status || 'Active'}
//                     </span>
//                   </td>

//                   {/* ACTIONS */}
//                   <td className="p-3 flex gap-2">
//                     <button
//                       onClick={() => {
//                         setSelectedUser(user);
//                         setViewMode(true);
//                       }}
//                       className="bg-blue-500 text-white px-3 py-1 rounded"
//                     >
//                       View
//                     </button>

//                     <button
//                       onClick={() => {
//                         setSelectedUser(user);
//                         setEditMode(true);
//                       }}
//                       className="bg-yellow-400 px-3 py-1 rounded"
//                     >
//                       Edit
//                     </button>
//                   </td>
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* VIEW MODAL */}
//       {viewMode && selectedUser && (
//         <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
//           <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-white p-6 rounded shadow w-96">
//             <h2 className="font-semibold mb-3">User Details</h2>

//             {moduleConfig.fields.map((field) => (
//               <p key={field.name}>
//                 <b>{field.label}:</b> {selectedUser[field.name]}
//               </p>
//             ))}

//             <button
//               onClick={() => setViewMode(false)}
//               className="mt-3 bg-gray-300 dark:bg-gray-700 px-3 py-2 rounded"
//             >
//               Close
//             </button>
//           </div>
//         </div>
//       )}

//       {/* EDIT MODAL */}
//       {editMode && selectedUser && (
//         <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
//           <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-white p-6 rounded shadow w-96">
//             <h2 className="font-semibold mb-3">Edit User</h2>

//             {moduleConfig.fields.map((field) => (
//               <input
//                 key={field.name}
//                 value={selectedUser[field.name] || ''}
//                 onChange={(e) =>
//                   setSelectedUser({
//                     ...selectedUser,
//                     [field.name]: e.target.value
//                   })
//                 }
//                 placeholder={field.label}
//                 className={`${inputStyle} mb-2`}
//               />
//             ))}

//             <div className="flex gap-2">
//               <button
//                 onClick={() => {
//                   setUsers(users.map(u =>
//                     u.id === selectedUser.id ? selectedUser : u
//                   ));
//                   setEditMode(false);
//                 }}
//                 className="bg-green-600 text-white px-4 py-2 rounded"
//               >
//                 Update
//               </button>

//               <button
//                 onClick={() => setEditMode(false)}
//                 className="bg-gray-300 dark:bg-gray-700 px-4 py-2 rounded"
//               >
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//     </div>
//   );
// };

// export default UserManagementPg;



import React, { useState, useEffect } from 'react';
import LogForm from './LogForm';

const UserManagementPg = ({ moduleConfig }) => {

  const [users, setUsers] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState(false);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    farm: '',
    department: '',
    role: '',
    status: ''
  });

  // 👉 NEW STATE FOR STATUS EDIT
  const [statusEditId, setStatusEditId] = useState(null);

  const storageKey = `global_${moduleConfig.id}_logs`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    setUsers(saved ? JSON.parse(saved) : []);
  }, [storageKey]);

  // FILTER LOGIC
  const filteredUsers = users.filter(user => {

    const matchSearch =
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.userId?.toLowerCase().includes(search.toLowerCase());

    const matchFarm = filters.farm ? user.farm === filters.farm : true;
    const matchDept = filters.department ? user.department === filters.department : true;
    const matchRole = filters.role ? user.role === filters.role : true;
    const matchStatus = filters.status ? user.status === filters.status : true;

    return matchSearch && matchFarm && matchDept && matchRole && matchStatus;
  });

  // SAVE USER
  const handleSave = (data) => {
    if (isEditing) {
      const updated = users.map(u =>
        u.id === selectedEntry.id ? { ...u, ...data } : u
      );
      setUsers(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } else {
      const newUser = {
        ...data,
        id: Date.now(),
        status: "Active"
      };
      const updated = [newUser, ...users];
      setUsers(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    }

    closeAll();
  };

  // 🔥 STATUS CHANGE FUNCTION
  const handleStatusChange = (id, newStatus) => {
    const updated = users.map(u =>
      u.id === id ? { ...u, status: newStatus } : u
    );

    setUsers(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setStatusEditId(null);
  };

  const closeAll = () => {
    setShowForm(false);
    setSelectedEntry(null);
    setIsEditing(false);
    setViewMode(false);
  };

  return (
    <div className="p-4 md:p-8 min-w-max bg-white dark:bg-gray-900 text-black dark:text-white">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-green-700">👥 User Management</h1>

        <button
          onClick={() => { setIsEditing(false); setShowForm(true); }}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Create New User
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-3 mb-4">

        <input
          placeholder="Search User ID / Name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-60 bg-white dark:bg-gray-800"
        />

        <select
          onChange={(e) => setFilters({ ...filters, farm: e.target.value })}
          className="border p-2 rounded bg-white dark:bg-gray-800"
        >
          <option value="">All Farms</option>
          <option>TKP</option>
          <option>TDR</option>
        </select>

        <select
          onChange={(e) => setFilters({ ...filters, department: e.target.value })}
          className="border p-2 rounded bg-white dark:bg-gray-800"
        >
          <option value="">All Departments</option>
          <option>IT</option>
          <option>Dispatch</option>
          <option>Production</option>
          <option>Security</option>
        </select>

        <select
          onChange={(e) => setFilters({ ...filters, role: e.target.value })}
          className="border p-2 rounded bg-white dark:bg-gray-800"
        >
          <option value="">All Roles</option>
          <option>Admin</option>
          <option>Supervisor</option>
          <option>Operator</option>
        </select>

        <select
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="border p-2 rounded bg-white dark:bg-gray-800"
        >
          <option value="">All Status</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>

      </div>

      {/* TABLE */}
      <div className="border rounded-lg overflow-auto">
        <table className="min-w-full text-sm">

          <thead className="bg-gray-200 dark:bg-gray-800">
            <tr>
              <th className="p-3">S.no</th>
              <th className="p-3">User ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Mobile</th>
              <th className="p-3">Farm</th>
              <th className="p-3">Department</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user, index) => (
                <tr key={user.id} className="border-t">

                  <td className="p-3">{index + 1}</td>
                  <td className="p-3">{user.userId}</td>
                  <td className="p-3">{user.name}</td>
                  <td className="p-3">{user.email || "-"}</td>
                  <td className="p-3">{user.mobile}</td>
                  <td className="p-3">{user.farm}</td>
                  <td className="p-3">{user.department}</td>
                  <td className="p-3">{user.role}</td>

                  {/* ✅ STATUS CLICKABLE */}
                  <td className="p-3">
                    {statusEditId === user.id ? (
                      <select
                        value={user.status}
                        onChange={(e) => handleStatusChange(user.id, e.target.value)}
                        className="border p-1 rounded"
                      >
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    ) : (
                      <span
                        onClick={() => setStatusEditId(user.id)}
                        className={`cursor-pointer px-2 py-1 rounded text-xs text-white ${
                          user.status === "Active" ? "bg-green-600" : "bg-red-500"
                        }`}
                      >
                        {user.status}
                      </span>
                    )}
                  </td>

                  <td className="p-3 flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedEntry(user);
                        setViewMode(true);
                      }}
                      className="bg-blue-500 text-white px-3 py-1 rounded"
                    >
                      View
                    </button>

                    <button
                      onClick={() => {
                        setSelectedEntry(user);
                        setIsEditing(true);
                        setShowForm(true);
                      }}
                      className="bg-yellow-400 px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                  </td>

                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="text-center p-6 text-gray-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>

        </table>
      </div>

      {/* VIEW MODAL */}
      {selectedEntry && viewMode && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div className="bg-white dark:bg-gray-900 p-6 rounded w-96">

            <h3 className="text-lg font-bold mb-4 text-center">User Details</h3>

            {moduleConfig.fields.map(field => (
              <p key={field.name}>
                <b>{field.label}:</b> {selectedEntry[field.name] || "-"}
              </p>
            ))}

            <button
              onClick={() => setViewMode(false)}
              className="mt-4 w-full bg-gray-300 py-2 rounded"
            >
              Close
            </button>

          </div>
        </div>
      )}

      {/* FORM */}
      {showForm && (
        <LogForm
          title={isEditing ? "Update User" : "Create User"}
          fields={moduleConfig.fields}
          initialData={isEditing ? selectedEntry : {}}
          onSubmit={handleSave}
          onClose={closeAll}
        />
      )}

    </div>
  );
};

export default UserManagementPg;