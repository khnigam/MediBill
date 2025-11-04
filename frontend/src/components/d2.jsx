import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from "recharts";

// -------------------
// Small utility: API service with fallback to dummy data
// -------------------
async function fetchDashboardData() {
  try {
    const [statsRes, salesRes, recentRes, lowStockRes] = await Promise.all([
      axios.get("/api/dashboard/stats"),
      axios.get("/api/dashboard/sales-7d"),
      axios.get("/api/dashboard/recent-transactions"),
      axios.get("/api/medicines/low-stock"),
    ]);

    return {
      stats: statsRes.data,
      sales: salesRes.data,
      recent: recentRes.data,
      lowStock: lowStockRes.data,
    };
  } catch (err) {
    // Fallback dummy data when APIs are unavailable
    console.warn("API fetch failed, using fallback dummy data:", err.message || err);

    const now = new Date();
    const sales = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      return {
        date: d.toISOString().slice(0, 10),
        value: Math.round(200 + Math.random() * 800),
      };
    });

    return {
      stats: {
        totalSales: 12450,
        ordersToday: 34,
        medicinesCount: 1250,
        lowStockCount: 6,
      },
      sales,
      recent: [
        { id: "TRX-1001", customer: "Amit Sharma", amount: 450, date: "2025-10-30" },
        { id: "TRX-1002", customer: "Sakshi Verma", amount: 1250, date: "2025-10-31" },
        { id: "TRX-1003", customer: "Rajesh Gupta", amount: 230, date: "2025-11-01" },
      ],
      lowStock: [
        { id: 1, name: "Paracetamol 500mg", stock: 3 },
        { id: 2, name: "Amoxicillin 250mg", stock: 2 },
        { id: 3, name: "Cetirizine 10mg", stock: 5 },
      ],
    };
  }
}

// -------------------
// Reusable UI components
// -------------------

function StatCard({ title, value, subtitle }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-gray-400">{subtitle}</div>}
    </div>
  );
}

function Topbar({ onToggleSidebar }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border">
      <div className="flex items-center gap-4">
        <button onClick={onToggleSidebar} className="p-2 rounded-md hover:bg-gray-100">
          ☰
        </button>
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </div>
      <div className="flex items-center gap-3">
        <input
          className="border rounded-md px-3 py-1 text-sm"
          placeholder="Search medicines, customers..."
        />
        <div className="rounded-full bg-gray-100 px-3 py-1 text-sm">Nigam</div>
      </div>
    </div>
  );
}

function Sidebar() {
  const items = [
    "Dashboard",
    "Medicines",
    "Purchases",
    "Sales",
    "Suppliers",
    "Reports",
    "Settings",
  ];
  return (
    <div className="w-56 bg-white p-4 rounded-2xl shadow-sm border h-[calc(100vh-2rem)]">
      <div className="text-xl font-bold mb-6">MediBill</div>
      <nav className="flex flex-col gap-2">
        {items.map((it) => (
          <a key={it} href="#" className="px-3 py-2 rounded-md hover:bg-gray-100">
            {it}
          </a>
        ))}
      </nav>
    </div>
  );
}

function SalesChart({ data }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border h-64">
      <div className="text-sm text-gray-500">Sales (last 7 days)</div>
      <div className="h-44 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LowStockList({ items }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border">
      <div className="text-sm text-gray-500">Low stock medicines</div>
      <ul className="mt-3 space-y-2">
        {items.map((m) => (
          <li key={m.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
            <div>
              <div className="font-medium">{m.name}</div>
              <div className="text-xs text-gray-400">Stock: {m.stock}</div>
            </div>
            <div className="text-sm text-red-600">Reorder</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecentTable({ rows }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border">
      <div className="text-sm text-gray-500">Recent transactions</div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left table-auto">
          <thead>
            <tr className="text-xs text-gray-400">
              <th className="py-2">ID</th>
              <th className="py-2">Customer</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2">{r.id}</td>
                <td className="py-2">{r.customer}</td>
                <td className="py-2">₹{r.amount}</td>
                <td className="py-2">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------
// Main Dashboard component (composes the pieces)
// -------------------

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ stats: {}, sales: [], recent: [], lowStock: [] });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const res = await fetchDashboardData();
      if (mounted) {
        setData(res);
        setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-[1200px] mx-auto grid grid-cols-12 gap-6">
        {sidebarOpen && (
          <div className="col-span-3">
            <Sidebar />
          </div>
        )}

        <div className={sidebarOpen ? "col-span-9" : "col-span-12"}>
          <div className="mb-6">
            <Topbar onToggleSidebar={() => setSidebarOpen((s) => !s)} />
          </div>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-4">
              <div className="space-y-4">
                <StatCard title="Total Sales" value={`₹${data.stats.totalSales ?? "-"}`} subtitle="(this month)" />
                <StatCard title="Orders Today" value={data.stats.ordersToday ?? "-"} />
                <StatCard title="Medicines" value={data.stats.medicinesCount ?? "-"} />
                <StatCard title="Low stock" value={data.stats.lowStockCount ?? "-"} />
              </div>
            </div>

            <div className="col-span-12 md:col-span-8">
              <SalesChart data={data.sales} />
            </div>

            <div className="col-span-12 md:col-span-6">
              <RecentTable rows={data.recent} />
            </div>

            <div className="col-span-12 md:col-span-6">
              <LowStockList items={data.lowStock} />
            </div>
          </div>

          {loading && (
            <div className="mt-6 text-center text-gray-500">Loading dashboard...</div>
          )}
        </div>
      </div>
    </div>
  );
}
