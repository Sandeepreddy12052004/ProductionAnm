import React from 'react';

const SkeletonLoader = ({ type = 'table', rows = 5, columns = 6, height = "h-4", className = "" }) => {
  if (type === 'table') {
    return (
      <>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={`skeleton-row-${i}`} className="animate-pulse bg-white border-b border-gray-100 last:border-0">
            {Array.from({ length: columns }).map((_, j) => (
              <td key={`skeleton-col-${j}`} className="p-4 whitespace-nowrap">
                <div className={`bg-gray-200 rounded ${height} w-full opacity-60`}></div>
              </td>
            ))}
          </tr>
        ))}
      </>
    );
  }

  if (type === 'grid-row') {
    return (
      <>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={`skeleton-grid-row-${i}`} className="grid animate-pulse border-t border-[#edf1f7] px-6 py-5 bg-white" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((_, j) => (
              <div key={`skeleton-grid-col-${j}`} className="pr-4">
                <div className={`bg-gray-200 rounded ${height} w-full opacity-60`}></div>
              </div>
            ))}
          </div>
        ))}
      </>
    );
  }

  if (type === 'cards') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full ${className}`}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`skeleton-card-${i}`} className="animate-pulse bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="space-y-3 w-full">
              <div className="h-4 bg-gray-200 rounded w-1/2 opacity-60"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4 opacity-60"></div>
            </div>
            <div className="h-12 w-12 bg-gray-200 rounded-xl ml-4 opacity-60"></div>
          </div>
        ))}
      </div>
    );
  }

  // Generic block
  return (
    <div className={`animate-pulse bg-gray-200 rounded-xl w-full opacity-60 ${height} ${className}`}></div>
  );
};

export default SkeletonLoader;
