import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import FarmCard from '../components/FarmCard';
import FarmForm from '../components/FarmForm';

const FarmManagementPg = () => {
  const router = useRouter();
  
  // Local Component States
  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [search, setSearch] = useState('');

  const storageKey = 'global_farm_management_units';

  // Load baseline values on initial component mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    setFarms(saved ? JSON.parse(saved) : []);
  }, []);

  useEffect(() => {
    if (showForm) {
      document.body.classList.add("hide-mobile-footer");
    } else {
      document.body.classList.remove("hide-mobile-footer");
    }

    return () => {
      document.body.classList.remove("hide-mobile-footer");
    };
  }, [showForm]);

  // Filter conditions comparing search parameters to Unit text fields
  const filteredFarms = farms.filter(farm =>
    farm.name?.toLowerCase().includes(search.toLowerCase()) ||
    farm.code?.toLowerCase().includes(search.toLowerCase())
  );

  // Form Save Operations
  const handleSaveFarm = (data) => {
    if (isEditing) {
      const updated = farms.map(f => f.id === selectedFarm.id ? { ...f, ...data } : f);
      setFarms(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } else {
      // ✅ Solved: We compute the dynamic object payload dynamically within the event stream
      // passing unique id timestamp safely away from any potential render cycle scans.
      createFarmUnit(data);
    }
    handleCloseAll();
  };

  // Dedicated creation function to fully isolate the impure timestamp side effect
  const createFarmUnit = (formData) => {
    const timestampId = Date.now();
    const newFarm = {
      ...formData,
      id: timestampId,
      metadata: formData.metadata || "Location metadata pending"
    };
    const updatedFarms = [newFarm, ...farms];
    setFarms(updatedFarms);
    localStorage.setItem(storageKey, JSON.stringify(updatedFarms));
  };

  // Removals handler filter
  const handleDeleteFarm = (id) => {
    const updated = farms.filter(f => f.id !== id);
    setFarms(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const handleCloseAll = () => {
    setShowForm(false);
    setIsEditing(false);
    setSelectedFarm(null);
  };

  return (
    <div className="p-4 md:p-8 w-full bg-transparent text-slate-800">
      
      {/* HEADER BLOCK */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#16223F]">Farm Management</h1>
          <p className="text-slate-400 text-xs font-semibold mt-0.5">
            Registry and geolocation of all dairy production units.
          </p>
        </div>

        {/* Create Registry Action Trigger */}
        <button
          onClick={() => { setIsEditing(false); setShowForm(true); }}
          className="bg-[#16223F] hover:bg-[#16223F]/90 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <span className="text-base font-light leading-none">+</span> Register Unit
        </button>
      </div>

      {/* FILTER SEARCH FIELD BAR */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search Farm Unit Name / Code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[#16223F] focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200 w-full max-w-xs text-sm font-medium"
        />
      </div>

      {/* CARD RENDERING FRAMEWORK GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredFarms.length > 0 ? (
          filteredFarms.map((farm) => (
            <FarmCard
              key={farm.id}
              farm={farm}
              onEdit={(f) => {
                setSelectedFarm(f);
                setIsEditing(true);
                setShowForm(true);
              }}
              onDelete={handleDeleteFarm}
              onClick={() => {
                if (!farm.code) return;
                const targetPath = `/${farm.code.toLowerCase()}`;
                
                if (router.asPath !== targetPath && router.pathname !== targetPath) {
                  router.push(targetPath);
                }
              }}
            />
          ))
        ) : (
          <div className="col-span-full border border-dashed border-gray-200 rounded-3xl p-12 text-center text-gray-400 font-medium text-sm">
            No registered production units found. Click &quot;+ Register Unit&quot; to create a new farm card.
          </div>
        )}
      </div>

      {/* RENDER MODAL ENTRY FORM CONTROLLER */}
      {showForm && (
        <FarmForm
          title={isEditing ? "Update Production Unit" : "Register New Production Unit"}
          initialData={isEditing ? selectedFarm : {}}
          onSubmit={handleSaveFarm}
          onClose={handleCloseAll}
        />
      )}

    </div>
  );
};

export default FarmManagementPg;