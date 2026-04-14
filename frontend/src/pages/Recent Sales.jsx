import React, { useEffect, useMemo, useState } from "react";
import { getSalesList } from "../api";

function StatusBadge({ status }) {
  const base = "px-3 py-1 rounded-full text-sm font-medium";
  const map = {
    Completed: "bg-green-100 text-green-700",
    Pending: "bg-yellow-100 text-yellow-700",
    Returned: "bg-red-100 text-red-700",
  };
  return <span className={`${base} ${map[status] || "bg-gray-100 text-gray-700"}`}>{status}</span>;
}

export default function App() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("All");
  const [q, setQ] = useState("");
  const [dateFilter, setDateFilter] = useState("All Time");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    getSalesList()
      .then((rows) => {
        if (!mounted) return;
        setSales(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!mounted) return;
        setError("Could not load sales data");
        setSales([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filterByDate = (date) => {
    if (!date) return false;
    const d = new Date(date);
    const now = new Date();
    if (dateFilter === "Today") return d.toDateString() === now.toDateString();
    if (dateFilter === "This Week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo && d <= now;
    }
    if (dateFilter === "This Month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  };

  const filtered = sales.filter((s) => {
    const matchesTab = tab === "All" ? true : s.status === tab;
    const text = `${s.invoiceNumber}${s.customer}${s.date}${s.totalAmount}`.toLowerCase();
    const matchesQuery = q.trim() === "" ? true : text.includes(q.toLowerCase());
    const matchesDate = filterByDate(s.date);
    return matchesTab && matchesQuery && matchesDate;
  });

  const todaySalesCount = useMemo(() => {
    const today = new Date().toDateString();
    return sales.filter((s) => s.date && new Date(s.date).toDateString() === today).length;
  }, [sales]);

  const monthRevenue = useMemo(() => {
    const now = new Date();
    return sales
      .filter((s) => {
        if (!s.date) return false;
        const d = new Date(s.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((acc, s) => acc + Number(s.totalAmount || 0), 0);
  }, [sales]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Sales Overview</h1>
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by customer or invoice..."
              className="w-80 pl-4 pr-10 py-2 border rounded-lg bg-white text-sm border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
          </div>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border border-gray-200 bg-white rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {["All Time", "Today", "This Week", "This Month"].map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">Total Sales (Today)</div>
          <div className="mt-3 text-2xl font-bold">
            {todaySalesCount}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">Total Revenue (This Month)</div>
          <div className="mt-3 text-2xl font-bold">
            ₹{monthRevenue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Tabs + Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        {/* Tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {["All", "Completed", "Pending", "Returned"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  tab === t ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="text-gray-400">📅 ⚙️</div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="py-3 px-4">INVOICE #</th>
                <th className="py-3 px-4">DATE</th>
                <th className="py-3 px-4">CUSTOMER NAME</th>
                <th className="py-3 px-4">TOTAL AMOUNT</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && (
                <tr>
                  <td colSpan="6" className="py-6 px-4 text-center text-gray-400">
                    Loading sales...
                  </td>
                </tr>
              )}
              {error && !loading && (
                <tr>
                  <td colSpan="6" className="py-6 px-4 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              )}
              {filtered.map((s) => (
                <tr key={`${s.id}-${s.invoiceNumber}`} className="odd:bg-white even:bg-gray-50">
                  <td className="py-4 px-4 text-blue-600 font-medium">{`#${s.invoiceNumber}`}</td>
                  <td className="py-4 px-4 text-gray-600">
                    {new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="py-4 px-4 text-gray-700">{s.customer}</td>
                  <td className="py-4 px-4 text-gray-700">₹{Number(s.totalAmount || 0).toLocaleString()}</td>
                  <td className="py-4 px-4">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="py-4 px-4 text-gray-400 flex gap-3">
                    <button title="View">👁️</button>
                    <button title="Edit">✏️</button>
                  </td>
                </tr>
              ))}

              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-6 px-4 text-center text-gray-400">
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <div>Showing {filtered.length} of {sales.length}</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 rounded-md bg-gray-100">Previous</button>
            <div className="px-3 py-1 rounded-md bg-blue-600 text-white">1</div>
            <button className="px-3 py-1 rounded-md bg-gray-100">2</button>
            <button className="px-3 py-1 rounded-md bg-gray-100">3</button>
            <button className="px-3 py-1 rounded-md bg-gray-100">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
