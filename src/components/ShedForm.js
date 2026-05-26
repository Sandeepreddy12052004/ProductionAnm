import React, { useState } from 'react';

const ShedForm = ({ title, initialData = {}, onSubmit, onClose }) => {
  const [farmId, setFarmId] = useState(initialData.farmId || '');
  const [shedNo, setShedNo] = useState(initialData.shedNo || '');
  const [lines, setLines] = useState(initialData.lines || '');
  const [shedType, setShedType] = useState(initialData.shedType || 'Milking Shed');
  const [capacity, setCapacity] = useState(initialData.capacity || '');
  const [status, setStatus] = useState(initialData.status || 'Active');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit({ farmId, shedNo, lines: Number(lines), shedType, capacity: Number(capacity), status });
  };

  return (
    <div className="fixed inset-0 bg-[#16223F]/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white p-7 rounded-3xl shadow-2xl border border-slate-100 w-full max-w-[450px]">
        
        <h3 className="text-xl font-black mb-5 text-[#16223F] tracking-tight">{title}</h3>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5"> Farm</label>
              <select
                value={farmId}
                required
                onChange={(e) => setFarmId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[#16223F] font-semibold focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200 text-sm"
              >
                <option value="" disabled>Select Farm</option>
                <option value="Tanakondapalli">Tanakondapalli (TKP)</option>
                <option value="Tandur">Tandur (TDR)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Shed Identity / No</label>
              <input
                type="text"
                required
                placeholder="e.g. Shed 1"
                value={shedNo}
                onChange={(e) => setShedNo(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[#16223F] font-semibold focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Lines / Rows</label>
              <input
                type="number"
                required
                min="0"
                placeholder="e.g. 3"
                value={lines}
                onChange={(e) => setLines(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[#16223F] font-semibold focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Max Capacity</label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 50"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[#16223F] font-semibold focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Shed Type Class</label>
            <select
              value={shedType}
              onChange={(e) => setShedType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[#16223F] font-semibold focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200 text-sm"
            >
              <option>Milking Shed</option>
              <option>Dry Cows Shed</option>
              <option>Calves Isolation Unit</option>
              <option>Quarantine Breeding Shed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Operational Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[#16223F] font-semibold focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 outline-none transition-all duration-200 text-sm"
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>

          {/* ACTIONS ACTIONS */}
          <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-gray-100 hover:bg-gray-200 text-slate-800 font-bold py-3 rounded-xl transition-all duration-200 cursor-pointer text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full bg-[#16223F] hover:bg-[#16223F]/90 text-white font-bold py-3 rounded-xl shadow-md transition-all duration-200 active:scale-[0.99] cursor-pointer text-sm"
            >
              Onboard Shed
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default ShedForm;