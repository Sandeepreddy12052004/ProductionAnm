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
import useSWR from 'swr';
import { useRouter } from 'next/router';
import { api } from '../utils/api';
import { swalSuccess, swalError, swalConfirm } from '../utils/swal';
import LogForm from './LogForm';
import SkeletonLoader from './SkeletonLoader';

const UserManagementPg = ({ moduleConfig }) => {
  const router = useRouter();

  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [isLoadingForm, setIsLoadingForm] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState([{ field: "name", value: "" }]);

  const filterFields = [
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'userId', label: 'User ID', type: 'text' },
    { name: 'email', label: 'Email', type: 'text' },
    { name: 'mobile', label: 'Mobile', type: 'text' },
    { 
      name: 'farmId', 
      label: 'Farm', 
      type: 'select', 
      options: farmsData ? farmsData.filter(f => f.name !== 'ALL' && f.code !== 'ALL').map(f => ({ label: f.name || f.code, value: f._id || f.id })) : []
    },
    { 
      name: 'department', 
      label: 'Department', 
      type: 'select', 
      options: moduleConfig?.fields?.find(f => f.name === 'department')?.options || ['OFFICE', 'FARM', 'DAIRY', 'VET', 'ADMIN', 'SECURITY']
    },
    { 
      name: 'role', 
      label: 'Role', 
      type: 'select', 
      options: rolesList ? rolesList.map(r => ({ label: r.name, value: r.name })) : []
    },
    { 
      name: 'status', 
      label: 'Status', 
      type: 'select', 
      options: [{ label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }]
    }
  ];

  // Dynamically capture redirection query params to trigger auto-filled user creation
  useEffect(() => {
    if (router.isReady && router.query.action === 'create') {
      const initialRole = router.query.role || '';
      setSelectedEntry({ role: initialRole });
      setIsEditing(false);
      setShowForm(true);
      
      // Clean query parameters shallowly to prevent recurrent popups on page reloads
      router.replace('/users', undefined, { shallow: true });
    }
  }, [router.isReady, router.query, router]);

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

  const { data: farmsData } = useSWR('farms_cache', async () => {
    const data = await api.farms.getAll();
    return data || [];
  }, { revalidateOnFocus: false });

  const { data: rolesList } = useSWR('roles_cache', async () => {
    const data = await api.roles.getAll();
    return data || [];
  }, { revalidateOnFocus: false });

  const getFarmName = (user) => {
    if (user.role === 'SUPER_ADMIN') return "All Farms";
    if (!user.farmId) return user.farm || "All Farms";
    if (typeof user.farmId === 'object') return user.farmId.name || user.farmId.code;
    if (farmsData) {
       const f = farmsData.find(f => f.id === user.farmId || f._id === user.farmId);
       if (f) return f.name || f.code;
    }
    return user.farm || "-";
  };

  // Group active filters by field name
  const groupedFilters = {};
  for (const f of filters) {
    const fieldConfig = filterFields.find(field => field.name === f.field);
    const hasValue = fieldConfig?.type === "select"
      ? (f.value && (Array.isArray(f.value) ? f.value.length > 0 : String(f.value).trim() !== ""))
      : (f.value && String(f.value).trim() !== "");
    if (!hasValue) continue;

    if (!groupedFilters[f.field]) {
      groupedFilters[f.field] = [];
    }
    groupedFilters[f.field].push(f);
  }

  // FILTER LOGIC
  const safeUsers = Array.isArray(users) ? users : [];
  const filteredUsers = safeUsers.filter(user => {
    let isMatched = true;

    for (const fieldName in groupedFilters) {
      const fieldFilters = groupedFilters[fieldName];
      let matchAnyForField = false;

      for (const f of fieldFilters) {
        let currentMatch = true;
        const fieldConfig = filterFields.find(field => field.name === f.field);

        if (f.field === 'farmId') {
          const selectedValues = Array.isArray(f.value) ? f.value : (f.value ? [f.value] : []);
          if (selectedValues.length > 0) {
            const userFarmId = user.farmId && typeof user.farmId === 'object'
              ? (user.farmId._id || user.farmId.id)
              : user.farmId;
            
            const matched = selectedValues.some(val => {
              if (userFarmId && String(userFarmId) === String(val)) return true;
              if (farmsData) {
                const selectedFarmObj = farmsData.find(f => f._id === val || f.id === val);
                if (selectedFarmObj) {
                  const selectedName = selectedFarmObj.name || selectedFarmObj.code;
                  const userFarmName = getFarmName(user);
                  if (selectedName && userFarmName && selectedName.toLowerCase() === userFarmName.toLowerCase()) {
                    return true;
                  }
                }
              }
              return false;
            });
            if (!matched) currentMatch = false;
          }
        }
        else if (f.field === 'department') {
          const selectedValues = Array.isArray(f.value) ? f.value : (f.value ? [f.value] : []);
          if (selectedValues.length > 0) {
            const userDeptName = user.department && typeof user.department === 'object'
              ? user.department.name
              : user.department;
            const matched = selectedValues.some(val => String(userDeptName).toLowerCase() === String(val).toLowerCase());
            if (!matched) currentMatch = false;
          }
        }
        else if (f.field === 'role') {
          const selectedValues = Array.isArray(f.value) ? f.value : (f.value ? [f.value] : []);
          if (selectedValues.length > 0) {
            const userRoleName = user.role && typeof user.role === 'object'
              ? user.role.name
              : user.role;
            const matched = selectedValues.some(val => String(userRoleName).toLowerCase() === String(val).toLowerCase());
            if (!matched) currentMatch = false;
          }
        }
        else if (f.field === 'status') {
          const selectedValues = Array.isArray(f.value) ? f.value : (f.value ? [f.value] : []);
          if (selectedValues.length > 0) {
            const userStatusStr = (user.status === false || user.status === 'Inactive' || user.status === 'INACTIVE') ? 'Inactive' : 'Active';
            const matched = selectedValues.some(val => String(userStatusStr).toLowerCase() === String(val).toLowerCase());
            if (!matched) currentMatch = false;
          }
        }
        else {
          // Normal text matching
          if (f.value) {
            currentMatch = String(user[f.field] || "")
              .toLowerCase()
              .includes(String(f.value).toLowerCase());
          }
        }

        if (currentMatch) {
          matchAnyForField = true;
          break;
        }
      }

      if (!matchAnyForField) {
        isMatched = false;
        break;
      }
    }
    return isMatched;
  });

  /**
   * Saves or updates a user profile by assembling and sanitizing the form payload.
   * @param {Record<string, any>} data - Raw form data collected from LogForm.
   * @returns {Promise<void>}
   */
  const handleSave = async (data) => {
    setIsLoadingForm(true);
    try {
      /** @type {Record<string, any>} */
      const payload = { ...data };
      
      // 1. Defensively extract the raw role identification string from the UI state
      /** @type {any} */
      const roleIdValue = typeof payload.role === 'object' && payload.role !== null 
        ? payload.role.id || payload.role._id || payload.role.role_id || payload.role.name
        : payload.role;

      // Normalize role string for exact Mongoose database validation lookup
      /** @type {string | undefined} */
      const roleNormalized = typeof roleIdValue === 'string' ? roleIdValue.trim().toUpperCase() : roleIdValue;

      // Clean name and email properties to prevent empty value schema rejections
      /** @type {string | undefined} */
      const cleanName = typeof payload.name === 'string' ? payload.name.trim() : payload.name;
      /** @type {string | undefined} */
      const cleanEmail = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : payload.email;

      // Ensure phone is a string if it exists
      if (payload.phone !== undefined && payload.phone !== null) {
        payload.phone = String(payload.phone);
      }
      if (payload.mobile !== undefined && payload.mobile !== null) {
        payload.phone = String(payload.mobile);
      }
      
      // Convert status string to boolean for backend validation
      if (typeof payload.status === 'string') {
        payload.status = payload.status === 'Active' || payload.status === 'ACTIVE';
      }
      
      // Handle ALL farms selection (Super Admin)
      /** @type {string | null | undefined} */
      let parsedFarmId = payload.farmId;
      if (parsedFarmId === 'ALL') {
        parsedFarmId = null;
      }
      
      // If we still receive the old 'farm' key from the form state, handle it
      if (payload.farm) {
        if (payload.farm === 'ALL' || payload.farm === 'All Farms') {
          parsedFarmId = null;
        } else if (typeof payload.farm === 'string' && payload.farm.match(/^[0-9a-fA-F]{24}$/)) {
          parsedFarmId = payload.farm;
        }
      }

      // Cleanup empty strings that break backend validation
      /** @type {string | undefined} */
      const cleanEmailFinal = cleanEmail === "" ? undefined : cleanEmail;
      /** @type {string | undefined} */
      const cleanPhone = payload.phone === "" ? undefined : payload.phone;

      // 2. Build the exact flat request structure your backend API relies on
      // Completely strip out local component properties (such as UI presentation text or permissions summaries)
      /** @type {Record<string, any>} */
      const sanitizedPayload = {};

      if (payload.userId !== undefined) sanitizedPayload.userId = payload.userId;
      if (cleanName !== undefined) sanitizedPayload.name = cleanName;
      if (cleanEmailFinal !== undefined) sanitizedPayload.email = cleanEmailFinal;
      if (payload.department !== undefined) sanitizedPayload.department = payload.department;
      if (cleanPhone !== undefined) sanitizedPayload.phone = cleanPhone;
      if (payload.status !== undefined) {
        sanitizedPayload.status = payload.status;
      } else if (isEditing) {
        // Default fallback to keep pre-existing status value
        sanitizedPayload.status = selectedEntry.status === false || selectedEntry.status === 'Inactive' || selectedEntry.status === 'INACTIVE' ? false : true;
      }

      if (parsedFarmId !== undefined) {
        sanitizedPayload.farmId = parsedFarmId;
      } else if (isEditing) {
        const entryFarmId = selectedEntry.farmId && typeof selectedEntry.farmId === 'object'
          ? selectedEntry.farmId._id || selectedEntry.farmId.id
          : selectedEntry.farmId;
        sanitizedPayload.farmId = (entryFarmId === 'ALL' || !entryFarmId) ? null : entryFarmId;
      }

      // Map role identifier parameter safely (mapping to role and/or role_id variations as appropriate)
      if (roleNormalized !== undefined) {
        sanitizedPayload.role = roleNormalized;
        if (!isEditing) {
          // Include role_id for creation to be robust (no strict constraint on POST schema)
          sanitizedPayload.role_id = roleNormalized;
        }
      } else if (isEditing) {
        const entryRole = typeof selectedEntry.role === 'object' && selectedEntry.role !== null
          ? selectedEntry.role.name || selectedEntry.role.id || selectedEntry.role._id
          : selectedEntry.role;
        const mappedRole = typeof entryRole === 'string' ? entryRole.trim().toUpperCase() : entryRole;
        sanitizedPayload.role = mappedRole;
      }

      // Password handling: Drop if unmodified or unchanged to avoid database resets or validator clashes
      if (!isEditing) {
        sanitizedPayload.password = payload.password || "agasthya123";
      } else if (payload.password && payload.password.trim() !== "") {
        sanitizedPayload.password = payload.password;
      }

      if (isEditing) {
        // Dispatch to established backend API route cleanly
        await api.users.update(selectedEntry.id || selectedEntry._id, sanitizedPayload);
        swalSuccess("Success", "User updated successfully");
      } else {
        await api.users.create(sanitizedPayload);
        swalSuccess("Success", "User created successfully");
      }
      mutate();
      closeAll();
    } catch (err) {
      const errorMsg = typeof err === 'string' 
        ? err 
        : (err.response?.data?.message || err.message || "Failed to save user");
      swalError("Error", errorMsg);
    } finally {
      setIsLoadingForm(false);
    }
  };

  // 🔥 STATUS CHANGE FUNCTION
  const handleStatusChange = async (id, newStatus) => {
    try {
      const boolStatus = newStatus === 'Active' || newStatus === 'ACTIVE';
      await api.users.update(id, { status: boolStatus });
      mutate();
      setStatusEditId(null);
      swalSuccess("Success", "User status updated");
    } catch (err) {
      console.error(err);
      const errorMsg = typeof err === 'string' 
        ? err 
        : (err.response?.data?.message || err.message || "Failed to update status");
      swalError("Error", errorMsg);
    }
  };

  // 🔥 DELETE FUNCTION
  const handleDelete = async (id) => {
    const confirmed = await swalConfirm("Delete User?", "Are you sure you want to permanently delete this user?");
    if (confirmed) {
      try {
        await api.users.delete(id);
        mutate();
        closeAll();
        swalSuccess("Deleted", "User deleted successfully");
      } catch (err) {
        console.error(err);
        const errorMsg = typeof err === 'string' 
          ? err 
          : (err.response?.data?.message || err.message || "Failed to delete user");
        swalError("Error", errorMsg);
      }
    }
  };

  const closeAll = () => {
    setShowForm(false);
    setSelectedEntry(null);
    setIsEditing(false);
    setViewMode(false);
  };

  const openEdit = (user) => {
    // Map the backend farmId object back to the string id so the dropdown pre-selects correctly
    const formUser = { ...user };
    if (user.farmId && typeof user.farmId === 'object') {
      formUser.farmId = user.farmId._id || user.farmId.id;
    } else if (user.farmId) {
      formUser.farmId = user.farmId;
    } else {
      formUser.farmId = 'ALL';
    }
    
    if (user.department && typeof user.department === 'object') {
      formUser.department = user.department._id || user.department.id;
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

      {/* SEARCH AND FILTERS */}
      <div className="flex-none flex flex-wrap gap-3 items-center justify-between mb-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative px-4 py-2.5 rounded-xl font-bold border text-xs transition-all duration-200 hover:-translate-y-px hover:shadow-md cursor-pointer flex items-center gap-2 ${
              showFilters ? 'bg-[#D1867D]/10 border-[#D1867D]/20 text-[#16223F]' : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            🔍 Filters
            {filters.filter(f => Array.isArray(f.value) ? f.value.length > 0 : String(f.value || '').trim() !== '').length > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {filters.filter(f => Array.isArray(f.value) ? f.value.length > 0 : String(f.value || '').trim() !== '').length}
              </span>
            )}
          </button>
        </div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Registered Users: {filteredUsers.length}
        </div>
      </div>

      {/* FILTER OVERLAY MODAL */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white w-full max-w-md rounded-[30px] shadow-2xl max-h-[85vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-[#16223F]">Filters</h3>
              <button onClick={() => setShowFilters(false)} className="text-gray-500 hover:text-black text-xl font-bold cursor-pointer">✕</button>
            </div>
            <div className="space-y-4">
              {filters.map((f, index) => (
                <div key={index} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <select
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm font-semibold text-[#16223F] bg-white outline-none focus:border-[#D1867D]"
                    value={f.field}
                    onChange={e => {
                      const updated = [...filters];
                      updated[index] = { field: e.target.value, value: '' };
                      setFilters(updated);
                    }}
                  >
                    {filterFields.map(field => (
                      <option key={field.name} value={field.name}>{field.label}</option>
                    ))}
                  </select>

                  {(() => {
                    const fieldConfig = filterFields.find(field => field.name === f.field);

                    // 📋 SELECT FIELD (MULTI-SELECT CHECKBOXES)
                    if (fieldConfig?.type === "select") {
                      const currentSelected = Array.isArray(f.value) ? f.value : (f.value ? [f.value] : []);
                      const options = fieldConfig.options || [];

                      return (
                        <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto bg-white border border-slate-200 rounded-lg p-2.5">
                          {options.map((opt) => {
                            const valStr = typeof opt === 'object' ? opt.value : opt;
                            const labelStr = typeof opt === 'object' ? opt.label : opt;
                            const isChecked = currentSelected.includes(valStr);

                            return (
                              <label key={valStr} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const updated = [...filters];
                                    let nextVal;
                                    if (e.target.checked) {
                                      nextVal = [...currentSelected, valStr];
                                    } else {
                                      nextVal = currentSelected.filter((v) => v !== valStr);
                                    }
                                    updated[index].value = nextVal;
                                    setFilters(updated);
                                  }}
                                  className="w-4 h-4 text-[#16223F] border-gray-300 rounded focus:ring-[#16223F]"
                                />
                                {labelStr}
                              </label>
                            );
                          })}
                        </div>
                      );
                    }

                    // ✏️ DEFAULT TEXT
                    return (
                      <input
                        type="text"
                        placeholder="Enter value..."
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-[#16223F] font-semibold outline-none focus:border-[#D1867D]"
                        value={f.value || ""}
                        onChange={(e) => {
                          const updated = [...filters];
                          updated[index].value = e.target.value;
                          setFilters(updated);
                        }}
                      />
                    );
                  })()}

                  <button
                    onClick={() => {
                      const updated = filters.filter((_, i) => i !== index);
                      setFilters(updated.length ? updated : [{ field: 'name', value: '' }]);
                    }}
                    className="text-red-500 hover:text-red-700 text-xs font-bold self-end mt-1 cursor-pointer transition-colors"
                  >
                    Remove Filter
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-6 gap-3">
              <button
                onClick={() => setFilters([...filters, { field: 'name', value: '' }])}
                className="flex-1 bg-[#D1867D]/10 text-[#16223F] py-2 rounded-lg font-bold text-sm hover:bg-[#D1867D]/20 cursor-pointer"
              >
                + Add Filter
              </button>
              <button
                onClick={() => { setFilters([{ field: 'name', value: '' }]); setCurrentPage(1); }}
                className="flex-1 bg-red-100 text-red-600 py-2 rounded-lg font-bold text-sm cursor-pointer"
              >
                Clear
              </button>
            </div>
            <button onClick={() => setShowFilters(false)}
              className="mt-4 w-full bg-[#16223F] hover:bg-[#16223F]/90 text-white py-2.5 rounded-lg font-bold cursor-pointer">
              Apply Filters
            </button>
          </div>
        </div>
      )}

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
              <th className="p-4 border-b text-center align-middle">Status</th>
              <th className="p-4 border-b text-center align-middle">Actions</th>
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
                <tr 
                  key={user.id || user._id} 
                  className="hover:bg-[#D1867D]/5 transition-colors cursor-pointer"
                  onClick={() => { setSelectedEntry(user); setViewMode(true); }}
                >

                  <td className="p-4 text-sm font-medium text-black">{index + 1}</td>
                  <td className="p-4 text-sm font-semibold text-black">{user.userId}</td>
                  <td className="p-4 text-sm font-bold text-black">{user.name}</td>
                  <td className="p-4 text-sm text-gray-500 font-sans">{user.email || "-"}</td>
                  <td className="p-4 text-sm text-gray-500 font-sans">{user.phone || user.mobile || "-"}</td>
                  <td className="p-4 text-sm font-semibold text-black">{getFarmName(user)}</td>
                  <td className="p-4 text-sm font-semibold text-gray-600">{typeof user.department === 'object' && user.department !== null ? (user.department.name || user.department.code || '-') : (user.department || '-')}</td>
                  <td className="p-4 text-sm font-semibold text-gray-600">{typeof user.role === 'object' && user.role !== null ? (user.role.name || user.role.code || '-') : (user.role || '-')}</td>

                  {/* ✅ STATUS CLICKABLE */}
                  <td className="p-4 text-center align-middle">
                    {statusEditId === (user.id || user._id) ? (
                      <select
                        value={user.status === false || user.status === 'Inactive' ? 'Inactive' : 'Active'}
                        onChange={(e) => handleStatusChange(user.id || user._id, e.target.value)}
                        className="px-2 py-1 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold outline-none focus:border-[#D1867D]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    ) : (
                      <span
                        onClick={(e) => { e.stopPropagation(); setStatusEditId(user.id || user._id); }}
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

                  <td className="p-4 text-center align-middle">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(user);
                      }}
                      className="bg-[#D1867D] hover:bg-[#D1867D]/90 text-white px-4 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all duration-200"
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
          <div className="bg-white p-7 rounded-3xl shadow-2xl border border-slate-100 w-full max-w-[400px] relative">

            {/* CLOSE ICON */}
            <button
              onClick={() => setViewMode(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center transition-all font-bold z-10"
              type="button"
            >
              ✕
            </button>

            <h3 className="text-xl font-extrabold mb-5 text-[#16223F] tracking-tight pr-8">User Details</h3>

            <div className="space-y-4 mb-6">
              {moduleConfig.fields.map(field => {
                if (field.name === 'password') return null;
                let displayValue;
                if (field.name === 'farmId' || field.name === 'farm') {
                  displayValue = getFarmName(selectedEntry);
                } else {
                  const raw = selectedEntry[field.name];
                  if (raw === null || raw === undefined) {
                    displayValue = '-';
                  } else if (typeof raw === 'object') {
                    displayValue = raw.name || raw.code || raw.label || String(raw._id || raw.id || '-');
                  } else {
                    displayValue = String(raw) || '-';
                  }
                }
                return (
                  <div key={field.name} className="border-b border-slate-50 pb-2">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{field.label}</span>
                    <span className="text-sm font-semibold text-slate-800">{displayValue}</span>
                  </div>
                );
              })}
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
          existingRecords={users}
          onSubmit={handleSave}
          onClose={closeAll}
          onDelete={isEditing ? () => handleDelete(selectedEntry.id || selectedEntry._id) : null}
        />
      )}

    </div>
  );
};

export default UserManagementPg;