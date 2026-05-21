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
    <div className="p-4 md:p-8 w-full bg-transparent text-slate-800">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-[#16223F]">👥 User Management</h1>

        <button
          onClick={() => { setIsEditing(false); setShowForm(true); }}
          className="bg-[#16223F] hover:bg-[#16223F]/90 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all duration-200 active:scale-[0.98]"
        >
          Create New User
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-3 mb-6">

        <input
          placeholder="Search User ID / Name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[#16223F] focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200 w-60"
        />

        <select
          onChange={(e) => setFilters({ ...filters, farm: e.target.value })}
          className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[#16223F] focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200"
        >
          <option value="">All Farms</option>
          <option>TKP</option>
          <option>TDR</option>
        </select>

        <select
          onChange={(e) => setFilters({ ...filters, department: e.target.value })}
          className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[#16223F] focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200"
        >
          <option value="">All Departments</option>
          <option>IT</option>
          <option>Dispatch</option>
          <option>Production</option>
          <option>Security</option>
        </select>

        <select
          onChange={(e) => setFilters({ ...filters, role: e.target.value })}
          className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[#16223F] focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200"
        >
          <option value="">All Roles</option>
          <option>Admin</option>
          <option>Supervisor</option>
          <option>Operator</option>
        </select>

        <select
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[#16223F] focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200"
        >
          <option value="">All Status</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>

      </div>

      {/* TABLE */}
      <div className="border border-gray-200 rounded-xl shadow-sm overflow-x-auto bg-white">
        <table className="w-full text-left min-w-[800px]">

          <thead className="bg-[#16223F]/5 text-[#16223F] uppercase text-[10px] font-black tracking-widest">
            <tr>
              <th className="p-4 border-b">S.no</th>
              <th className="p-4 border-b">User ID</th>
              <th className="p-4 border-b">Name</th>
              <th className="p-4 border-b">Email</th>
              <th className="p-4 border-b">Mobile</th>
              <th className="p-4 border-b">Farm</th>
              <th className="p-4 border-b">Department</th>
              <th className="p-4 border-b">Role</th>
              <th className="p-4 border-b text-center">Status</th>
              <th className="p-4 border-b">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user, index) => (
                <tr key={user.id} className="hover:bg-[#D1867D]/5 transition-colors cursor-pointer">

                  <td className="p-4 text-sm font-medium text-black">{index + 1}</td>
                  <td className="p-4 text-sm font-semibold text-black">{user.userId}</td>
                  <td className="p-4 text-sm font-bold text-black">{user.name}</td>
                  <td className="p-4 text-sm text-gray-500 font-sans">{user.email || "-"}</td>
                  <td className="p-4 text-sm text-gray-500 font-sans">{user.mobile}</td>
                  <td className="p-4 text-sm font-semibold text-black">{user.farm}</td>
                  <td className="p-4 text-sm font-semibold text-gray-600">{user.department}</td>
                  <td className="p-4 text-sm font-semibold text-gray-600">{user.role}</td>

                  {/* ✅ STATUS CLICKABLE */}
                  <td className="p-4 text-center">
                    {statusEditId === user.id ? (
                      <select
                        value={user.status}
                        onChange={(e) => handleStatusChange(user.id, e.target.value)}
                        className="px-2 py-1 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold outline-none focus:border-[#D1867D]"
                      >
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    ) : (
                      <span
                        onClick={() => setStatusEditId(user.id)}
                        className={`cursor-pointer px-3 py-1 rounded-full text-xs font-bold border transition-all duration-200 ${
                          user.status === "Inactive"
                            ? "bg-red-50 text-red-700 border-red-100/50"
                            : "bg-emerald-50 text-emerald-700 border-emerald-100/50"
                        }`}
                      >
                        {user.status || "Active"}
                      </span>
                    )}
                  </td>

                  <td className="p-4 flex gap-2 items-center">
                    <button
                      onClick={() => {
                        setSelectedEntry(user);
                        setViewMode(true);
                      }}
                      className="bg-[#16223F] hover:bg-[#16223F]/90 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all duration-200"
                    >
                      View
                    </button>

                    <button
                      onClick={() => {
                        setSelectedEntry(user);
                        setIsEditing(true);
                        setShowForm(true);
                      }}
                      className="bg-[#D1867D] hover:bg-[#D1867D]/90 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all duration-200"
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
        <div className="fixed inset-0 bg-[#16223F]/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white p-7 rounded-3xl shadow-2xl border border-slate-100 w-full max-w-[400px]">

            <h3 className="text-xl font-extrabold mb-5 text-[#16223F] tracking-tight">User Details</h3>

            <div className="space-y-4 mb-6">
              {moduleConfig.fields.map(field => (
                <div key={field.name} className="border-b border-slate-50 pb-2">
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{field.label}</span>
                  <span className="text-sm font-semibold text-slate-800">{selectedEntry[field.name] || "-"}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setViewMode(false)}
              className="w-full bg-[#16223F] hover:bg-[#16223F]/90 text-white font-bold py-3 rounded-xl shadow-md hover:shadow-lg hover:shadow-[#16223F]/10 hover:-translate-y-[1px] transition-all duration-200"
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