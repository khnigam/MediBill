import React, { useState } from "react";

const sampleSales = [
  { id: "INV-00123", date: "2023-10-26", customer: "John Doe", total: "$1,250.75", status: "Completed" },
  { id: "INV-00122", date: "2023-10-25", customer: "Jane Smith", total: "$850.00", status: "Pending" },
  { id: "INV-00121", date: "2023-10-25", customer: "Michael Johnson", total: "$2,500.50", status: "Completed" },
  { id: "INV-00120", date: "2023-10-24", customer: "Emily Davis", total: "$320.00", status: "Returned" },
  { id: "INV-00119", date: "2023-10-23", customer: "Chris Lee", total: "$5,430.20", status: "Completed" },
];

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
  const [tab, setTab] = useState("All");
  const [q, setQ] = useState("");
  const [dateFilter, setDateFilter] = useState("All Time");

  const filterByDate = (date) => {
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

  const filtered = sampleSales.filter((s) => {
    const matchesTab = tab === "All" ? true : s.status === tab;
    const text = (s.id + s.customer + s.date + s.total).toLowerCase();
    const matchesQuery = q.trim() === "" ? true : text.includes(q.toLowerCase());
    const matchesDate = filterByDate(s.date);
    return matchesTab && matchesQuery && matchesDate;
  });

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
            15 <span className="text-sm text-green-500 font-medium">+5.2%</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500">Total Revenue (This Month)</div>
          <div className="mt-3 text-2xl font-bold">
            $25,480.50 <span className="text-sm text-green-500 font-medium">+1.8%</span>
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
              {filtered.map((s) => (
                <tr key={s.id} className="odd:bg-white even:bg-gray-50">
                  <td className="py-4 px-4 text-blue-600 font-medium">{`#${s.id}`}</td>
                  <td className="py-4 px-4 text-gray-600">
                    {new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="py-4 px-4 text-gray-700">{s.customer}</td>
                  <td className="py-4 px-4 text-gray-700">{s.total}</td>
                  <td className="py-4 px-4">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="py-4 px-4 text-gray-400 flex gap-3">
                    <button title="View">👁️</button>
                    <button title="Edit">✏️</button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
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
          <div>Showing 1–5 of 100</div>
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
