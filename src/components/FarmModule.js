import React, { useState } from 'react';
import LogForm from './LogForm';
import { usePersistedState } from '../hooks/usePersistedState';

const FarmModule = ({ farmName, availableModules }) => {
  const [activeModuleId, setActiveModuleId] = useState(availableModules[0].id);
  const [showForm, setShowForm] = useState(false);

  // Dynamic storage key based on Farm Name + Module Name
  const storageKey = `${farmName}_${activeModuleId}_data`;
  const [logs, setLogs] = usePersistedState(storageKey, []);

  const currentModule = availableModules.find(m => m.id === activeModuleId);

  const handleSave = (newData) => {
    const entry = { 
      ...newData, 
      id: Date.now(), 
      date: new Date().toLocaleString() 
    };
    setLogs([entry, ...logs]);
    setShowForm(false);
  };

  return (
    <div className="p-8 bg-white min-h-screen text-black">
      <header className="flex justify-between items-center mb-8 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold text-green-800">Farm: {farmName}</h1>
          <p className="text-gray-500 font-medium">Module: {currentModule.name}</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg transition-transform active:scale-95"
        >
          + Add New Entry
        </button>
      </header>

      {/* Module Navigation Tabs */}
      <div className="flex flex-wrap gap-3 mb-10">
        {availableModules.map(m => (
          <button
            key={m.id}
            onClick={() => setActiveModuleId(m.id)}
            className={`px-5 py-2 rounded-lg border text-sm font-bold transition-all ${
              activeModuleId === m.id 
              ? 'bg-green-600 text-white border-green-600 shadow-md' 
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {m.icon} {m.name}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Date/Time</th>
              {currentModule.fields.map(f => (
                <th key={f.name} className="p-4 text-xs font-bold text-gray-500 uppercase">{f.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-green-50 transition-colors">
                <td className="p-4 text-sm text-gray-600">{log.date}</td>
                {currentModule.fields.map(f => (
                  <td key={f.name} className="p-4 text-sm font-semibold text-gray-800">{log[f.name]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <LogForm
          title={`${farmName} - ${currentModule.name}`}
          fields={currentModule.fields}
          onSubmit={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
};

export default FarmModule;