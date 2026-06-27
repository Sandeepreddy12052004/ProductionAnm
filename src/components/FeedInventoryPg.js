import React, { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
import SkeletonLoader from "./SkeletonLoader";
import OpsLogPg from "./OpsLogPg";
import ModulePageHeader from "./ModulePageHeader";
import FarmFilterSelector from "./FarmFilterSelector";
import { 
  Package, 
  Search, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight,
  RefreshCw
} from "lucide-react";

export default function FeedInventoryPg() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("__active_feed_inventory_tab__") || "summary";
    }
    return "summary";
  });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem("__active_feed_inventory_tab__", tab);
  };
  const [logs, setLogs] = useState([]);
  const [feedItems, setFeedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const config = {
    id: 'feed_inv',
    name: 'Feed Log',
    icon: '📋',
    fields: [
      { name: 'feedType',        label: 'Feed Item',       type: 'select', options: [] },
      { name: 'oldStock',        label: 'Old Stock',       type: 'number' },
      { name: 'bought',          label: 'Bought',          type: 'number' },
      { name: 'usage',           label: 'Bags / Usage',    type: 'number' },
      { name: 'remainingStock',  label: 'Remaining Stock', type: 'number' },
      { name: 'purchaseDate',    label: 'Purchase Date',   type: 'date' },
    ]
  };

  const fetchInventoryLogs = async () => {
    setIsLoading(true);
    try {
      const [itemsData, logsData] = await Promise.all([
        api.feedItems.getAll(),
        api.inventory.feed.getAll()
      ]);
      setFeedItems(itemsData || []);
      setLogs(logsData || []);
    } catch (err) {
      console.error("Failed to load inventory logs or feed items:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "summary") {
      fetchInventoryLogs();
    }
  }, [activeTab]);

  // Compute latest remaining stock for each feed item
  const currentStockItems = useMemo(() => {
    const stockItems = [];
    
    for (const item of feedItems) {
      const itemName = String(item.name || "").trim();
      if (!itemName) continue;
      
      // Find logs for this feedType
      const itemLogs = logs.filter(log => String(log.feedType || "").trim().toUpperCase() === itemName.toUpperCase());
      
      // Since logs are sorted by date descending, the first record in the filter is the latest transaction
      const latestLog = itemLogs[0];
      const remainingStock = latestLog ? (Number(latestLog.remainingStock) || 0) : 0;
      const lastUpdated = latestLog ? (latestLog.purchaseDate || latestLog.createdAt || latestLog.date) : null;
      
      // Calculate latest bought / usage values from latest log that has them
      const lastBoughtLog = itemLogs.find(log => Number(log.bought) > 0);
      const lastUsageLog = itemLogs.find(log => Number(log.usage) > 0);
      
      stockItems.push({
        name: itemName,
        remainingStock: remainingStock,
        lastUpdated: lastUpdated,
        lastBought: lastBoughtLog ? (Number(lastBoughtLog.bought) || 0) : 0,
        lastUsage: lastUsageLog ? (Number(lastUsageLog.usage) || 0) : 0
      });
    }
    
    return stockItems;
  }, [feedItems, logs]);

  // Filter items based on search query
  const filteredStockItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return currentStockItems;
    return currentStockItems.filter(item => 
      item.name.toLowerCase().includes(query)
    );
  }, [currentStockItems, searchQuery]);

  // Last refilled item calculation
  const lastRefilledItem = useMemo(() => {
    const refilledLog = logs.find(log => Number(log.bought) > 0);
    if (!refilledLog) return null;
    return {
      name: refilledLog.feedType,
      amount: Number(refilledLog.bought),
      date: refilledLog.purchaseDate || refilledLog.createdAt || refilledLog.date
    };
  }, [logs]);

  const lowStockItemsCount = useMemo(() => {
    return currentStockItems.filter(item => item.remainingStock < 100).length;
  }, [currentStockItems]);

  return (
    <div className="p-4 md:p-8 w-full h-full flex flex-col bg-transparent text-slate-800">
      {/* HEADER SECTION */}
      <ModulePageHeader
        title="Feed Inventory"
        description="Real-time stock levels and transaction logs for registered feed items."
      >
        {activeTab === "summary" && (
          <button
            onClick={fetchInventoryLogs}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-[#16223F] px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Stock</span>
          </button>
        )}
      </ModulePageHeader>

      {/* TABS HEADER */}
      <div className="flex border-b border-gray-200 mb-6 gap-6 flex-none">
        <button
          onClick={() => handleTabChange("summary")}
          className={`pb-3 text-sm font-black border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "summary"
              ? "border-[#D1867D] text-[#16223F]"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <span>📦</span>
          <span>Stock Summary</span>
        </button>
        <button
          onClick={() => handleTabChange("log")}
          className={`pb-3 text-sm font-black border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "log"
              ? "border-[#D1867D] text-[#16223F]"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <span>🌾</span>
          <span>Feed Log</span>
        </button>
      </div>

      {activeTab === "summary" ? (
        <>
          {/* QUICK STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 flex-none">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-inner">
                  📥
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Last Stock Refill</p>
                  <h2 className="text-2xl font-black text-[#16223F] mt-1">
                    {lastRefilledItem 
                      ? `+${lastRefilledItem.amount.toLocaleString()} KG`
                      : "No refill logs"
                    }
                  </h2>
                  {lastRefilledItem && (
                    <p className="text-xs text-emerald-600 font-semibold mt-0.5">
                      {lastRefilledItem.name} ({new Date(lastRefilledItem.date).toLocaleDateString("en-GB")})
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl shadow-inner">
                  📦
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Unique Feed Items</p>
                  <h2 className="text-2xl font-black text-[#16223F] mt-1">{currentStockItems.length} Types</h2>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${lowStockItemsCount > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                  ⚠️
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Critical Low Stock</p>
                  <h2 className="text-2xl font-black text-[#16223F] mt-1">{lowStockItemsCount} Alert{lowStockItemsCount !== 1 ? 's' : ''}</h2>
                </div>
              </div>
            </div>
          </div>

          {/* SEARCH AND FILTERS */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 flex flex-col md:flex-row gap-4 items-center justify-between flex-none">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search feed items by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm font-semibold text-[#16223F] outline-none focus:bg-white focus:border-[#D1867D] focus:ring-2 focus:ring-[#D1867D]/10 transition-all duration-200"
              />
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <FarmFilterSelector layout="horizontal" size="md" />
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Listed Items: {filteredStockItems.length}
              </div>
            </div>
          </div>

          {/* STOCK LIST */}
          <div className="flex-1 overflow-auto border border-gray-200 rounded-xl shadow-sm bg-white relative">
            {!isLoading && filteredStockItems.length === 0 && (
              <div className="p-16 text-center">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-700">No Stock Records Found</h3>
                <p className="text-gray-500 mt-2 text-sm">
                  Please register transactions in the Feed Log to establish inventory stock.
                </p>
              </div>
            )}

            {(isLoading || filteredStockItems.length > 0) && (
              <table className="w-full text-left min-w-[600px] relative">
                <thead className="sticky top-0 z-10 bg-gray-50 text-[#16223F] uppercase text-[10px] font-black tracking-widest shadow-sm">
                  <tr>
                    <th className="p-4 border-b">Feed Item</th>
                    <th className="p-4 border-b">Remaining Stock</th>
                    <th className="p-4 border-b text-center">Status</th>
                    <th className="p-4 border-b">Last Transaction Info</th>
                    <th className="p-4 border-b">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <SkeletonLoader type="table" columns={5} />
                  ) : (
                    filteredStockItems.map((item) => {
                      const isLow = item.remainingStock < 100;
                      const formattedDate = item.lastUpdated
                        ? new Date(item.lastUpdated).toLocaleDateString("en-GB")
                        : "-";

                      return (
                        <tr key={item.name} className="hover:bg-[#D1867D]/5 transition-colors">
                          <td className="p-4 text-sm font-black text-black">
                            🌾 {item.name}
                          </td>
                          <td className="p-4 text-sm font-extrabold text-[#16223F]">
                            {item.remainingStock.toLocaleString()} KG
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm border ${
                                isLow
                                  ? "text-red-600 bg-red-50 border-red-100"
                                  : "text-emerald-600 bg-emerald-50 border-emerald-100"
                              }`}
                            >
                              {isLow ? "LOW STOCK" : "IN STOCK"}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-semibold text-slate-500">
                            {item.lastBought > 0 ? (
                              <span className="text-emerald-600">+{item.lastBought} KG bought</span>
                            ) : item.lastUsage > 0 ? (
                              <span className="text-amber-600">-{item.lastUsage} KG used</span>
                            ) : (
                              "No transactions logged"
                            )}
                          </td>
                          <td className="p-4 text-sm font-semibold text-gray-500">
                            {formattedDate}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 w-full bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <OpsLogPg moduleConfig={config} />
        </div>
      )}
    </div>
  );
}
