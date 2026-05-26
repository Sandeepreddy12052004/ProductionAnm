import React, { useState } from 'react';

const FarmForm = ({ title, initialData = {}, onSubmit, onClose }) => {
  const [name, setName] = useState(initialData.name || '');
  const [code, setCode] = useState(initialData.code || '');
  const [metadata, setMetadata] = useState(initialData.metadata || '');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, code, metadata });
  };

  return (
    <div className="fixed inset-0 bg-[#16223F]/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white p-7 rounded-3xl shadow-2xl border border-slate-100 w-full max-w-[450px]">
        
        <h3 className="text-xl font-black mb-5 text-[#16223F] tracking-tight">{title}</h3>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Farm Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Tandur"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[#16223F] font-semibold focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Farm Code</label>
            <input
              type="text"
              required
              placeholder="e.g. TDR"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[#16223F] font-semibold focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Geolocation Metadata</label>
            <input
              type="text"
              placeholder="e.g. Location coordinates or addresses"
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[#16223F] font-semibold focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200"
            />
          </div>

          {/* ACTIONS FOOTER BUTTONS */}
          <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-gray-100 hover:bg-gray-200 text-slate-800 font-bold py-3 rounded-xl transition-all duration-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full bg-[#16223F] hover:bg-[#16223F]/90 text-white font-bold py-3 rounded-xl shadow-md transition-all duration-200 active:scale-[0.99] cursor-pointer"
            >
              Save Unit
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default FarmForm;