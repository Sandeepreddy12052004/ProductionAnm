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

import React, { useState } from 'react';
import useSWR from 'swr';
import { api } from '../utils/api';
import { swalSuccess, swalError, swalConfirm } from '../utils/swal';
import LogForm from './LogForm';
import SkeletonLoader from './SkeletonLoader';

const UserManagementPg = ({ moduleConfig }) => {

  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    farm: '',
    department: '',
    role: '',
    status: ''
  });

  // 👉 NEW STATE FOR STATUS EDIT
  const [statusEditId, setStatusEditId] = useState(null);

  // SWR Caching Logic
  const fetcher = async () => {
    const data = await api.users.getAll();
    return data || [];
  };

  const { data: users, error, mutate, isLoading } = useSWR('users_cache', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000
  });

  // FILTER LOGIC
  const safeUsers = Array.isArray(users) ? users : [];
  const filteredUsers = safeUsers.filter(user => {

    const matchSearch =
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.userId?.toLowerCase().includes(search.toLowerCase());

    const userFarmName = typeof user.farmId === 'object' ? user.farmId?.name : user.farm;
    const matchFarm = filters.farm ? userFarmName === filters.farm : true;
    const matchDept = filters.department ? user.department === filters.department : true;
    const matchRole = filters.role ? user.role === filters.role : true;
    const matchStatus = filters.status ? (user.status || 'Active') === filters.status : true;

    return matchSearch && matchFarm && matchDept && matchRole && matchStatus;
  });

  // SAVE USER
  const handleSave = async (data) => {
    setIsLoadingForm(true);
    try {
      const payload = { ...data };
      
      if (!isEditing && !payload.password) {
        payload.password = "agasthya123";
      }
      
      // Ensure phone is a string if it exists
      if (payload.phone !== undefined && payload.phone !== null) {
        payload.phone = String(payload.phone);
      }
      if (payload.mobile !== undefined && payload.mobile !== null) {
        payload.phone = String(payload.mobile);
        delete payload.mobile;
      }
      
      // Convert status string to boolean for backend validation
      if (typeof payload.status === 'string') {
        payload.status = payload.status === 'Active' || payload.status === 'ACTIVE';
      }
      
      // Look up the Farm ID if a farm name string is passed instead of an ObjectId
      if (payload.farm && typeof payload.farm === 'string' && !payload.farm.match(/^[0-9a-fA-F]{24}$/)) {
        try {
          const farms = await api.farms.getAll();
          const targetFarm = farms.find(f => f.code === payload.farm || f.name === payload.farm);
          if (targetFarm) {
            payload.farmId = targetFarm.id || targetFarm._id;
          }
        } catch (farmErr) {
          console.error("Failed to lookup farm ID:", farmErr);
        }
      } else if (payload.farm && typeof payload.farm === 'string' && payload.farm.match(/^[0-9a-fA-F]{24}$/)) {
        payload.farmId = payload.farm;
      }

      // Cleanup empty strings that break backend validation
      if (payload.email === "") delete payload.email;
      if (payload.password === "") delete payload.password;
      
      // Remove backend-generated MongoDB keys that cause "Unrecognized keys" in Zod
      delete payload._id;
      delete payload.id;
      delete payload.createdAt;
      delete payload.updatedAt;
      delete payload.__v;
      delete payload.farm;

      if (isEditing) {
        // The backend's updateUserSchema strictly rejects the 'password' field.
        delete payload.password;
        await api.users.update(selectedEntry.id || selectedEntry._id, payload);
        swalSuccess("Success", "User updated successfully");
      } else {
        await api.users.create(payload);
        swalSuccess("Success", "User created successfully");
      }
      mutate();
      closeAll();
    } catch (err) {
      swalError("Error", err.response?.data?.message || err.message || "Failed to save user");
    } finally {
      setIsLoadingForm(false);
    }
  };

  // 🔥 STATUS CHANGE FUNCTION
  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.users.update(id, { status: newStatus });
      mutate();
      setStatusEditId(null);
      swalSuccess("Success", "User status updated");
    } catch (err) {
      console.error(err);
      swalError("Error", "Failed to update status");
    }
  };

  const closeAll = () => {
    setShowForm(false);
    setSelectedEntry(null);
    setIsEditing(false);
    setViewMode(false);
  };

  const openEdit = (user) => {
    // Map the backend farmId object back to the string name so the dropdown pre-selects correctly
    const formUser = { ...user };
    if (user.farmId && typeof user.farmId === 'object') {
      formUser.farm = user.farmId.name || user.farmId.code;
    } else if (user.farm) {
      formUser.farm = user.farm;
    }
    setSelectedEntry(formUser);
    setIsEditing(true);
    setShowForm(true);
  };

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col bg-transparent text-slate-800">
      <div className="flex-none flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
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
          value={filters.role}
          onChange={(e) => setFilters({ ...filters, role: e.target.value })}
          className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[#16223F] font-semibold focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200 cursor-pointer"
        >
          <option value="">All Roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="FARM_ADMIN">Farm Admin</option>
          <option value="INCHARGE">Incharge</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[#16223F] focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

      </div>

      {/* TABLE WRAPPER */}
      <div className="flex-1 overflow-auto border border-gray-200 rounded-xl shadow-sm bg-white relative">
        <table className="w-full text-left min-w-[1000px] relative">
          <thead className="sticky top-0 z-10 bg-gray-50 text-[#16223F] uppercase text-[10px] font-black tracking-widest shadow-sm">
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
            {error ? (
              <tr>
                <td colSpan="10" className="p-8">
                  <div className="flex flex-col justify-center items-center gap-3 bg-red-50 p-4 rounded-xl border border-red-100">
                    <span className="text-red-600 font-bold">Failed to load users</span>
                    <span className="text-red-500 text-sm font-mono">{error.message || "Unknown error"}</span>
                  </div>
                </td>
              </tr>
            ) : isLoading ? (
              <SkeletonLoader type="table" columns={10} />
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user, index) => (
                <tr key={user.id || user._id} className="hover:bg-[#D1867D]/5 transition-colors cursor-pointer">

                  <td className="p-4 text-sm font-medium text-black">{index + 1}</td>
                  <td className="p-4 text-sm font-semibold text-black">{user.userId}</td>
                  <td className="p-4 text-sm font-bold text-black">{user.name}</td>
                  <td className="p-4 text-sm text-gray-500 font-sans">{user.email || "-"}</td>
                  <td className="p-4 text-sm text-gray-500 font-sans">{user.phone || user.mobile || "-"}</td>
                  <td className="p-4 text-sm font-semibold text-black">{typeof user.farmId === 'object' ? user.farmId?.name : user.farm || "-"}</td>
                  <td className="p-4 text-sm font-semibold text-gray-600">{user.department}</td>
                  <td className="p-4 text-sm font-semibold text-gray-600">{user.role}</td>

                  {/* ✅ STATUS CLICKABLE */}
                  <td className="p-4 text-center">
                    {statusEditId === (user.id || user._id) ? (
                      <select
                        value={user.status === false || user.status === 'Inactive' ? 'Inactive' : 'Active'}
                        onChange={(e) => handleStatusChange(user.id || user._id, e.target.value)}
                        className="px-2 py-1 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold outline-none focus:border-[#D1867D]"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    ) : (
                      <span
                        onClick={() => setStatusEditId(user.id || user._id)}
                        className={`cursor-pointer px-3 py-1 rounded-full text-xs font-bold border transition-all duration-200 ${
                          user.status === false || user.status === 'Inactive'
                            ? "bg-red-50 text-red-700 border-red-100/50"
                            : "bg-emerald-50 text-emerald-700 border-emerald-100/50"
                        }`}
                      >
                        {user.status === false || user.status === 'Inactive' ? "Inactive" : "Active"}
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