import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import StatCard from "../components/StatCard";
import LowStockTable from "../components/LowStockTable";
import RecentSales from "../components/RecentSales";
import useDashboardData from "../hooks/useDashboardData";

export default function Dashboard() {
  const { loading, summary, lowStock, recentSales } = useDashboardData();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen((open) => !open);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen flex">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col min-h-screen">

        <main className={`p-3 max-w-7xl mx-auto transition-all duration-300 ${sidebarOpen ? "ml-0" : "ml-0"}`}>
          <h1 className="text-3xl font-semibold text-gray-900 mb-6">Dashboard</h1>

          {!summary ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
              Loading dashboard...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-6 mb-6">
                <StatCard
                  title="Total Sales (This Month)"
                  value={`₹${(summary?.totalSales || 0).toLocaleString()}`}
                  sub={<span className="text-green-600">↗ {summary?.totalSalesChange}</span>}
                />
                <StatCard
                  title="Pending Purchase Orders"
                  value={summary?.pendingOrders ?? 0}
                  sub={<span className="text-green-600">↗ {summary?.pendingOrdersChange}</span>}
                />
                <StatCard
                  title="Low Stock Alerts"
                  value={summary?.lowStockCount ?? 0}
                  sub={<span className="text-yellow-600">⚠ Critical</span>}
                />
                <StatCard
                  title="Expiring Soon"
                  value={summary?.expiringSoon ?? 0}
                  sub={<span className="text-gray-500">Next 30 days</span>}
                />
              </div>

              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-8">
                  <LowStockTable items={lowStock} />
                </div>
                <div className="col-span-4">
                  <RecentSales sales={recentSales} />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}