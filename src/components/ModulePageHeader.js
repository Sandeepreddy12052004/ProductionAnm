import React from 'react';

export default function ModulePageHeader({ title, description, children }) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 w-full">
      <div>
        <h1 className="text-2xl font-black text-[#16223F] tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-gray-500 font-medium mt-1">
            {description}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 w-full md:w-auto md:justify-end">
        {children}
      </div>
    </div>
  );
}
