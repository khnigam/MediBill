import React from "react";

export default function RecentSales({ sales = [] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 w-full">
      <h3 className="text-lg font-semibold mb-4">Recent Sales</h3>
      <ul className="space-y-4">
        {sales.map((s, i) => (
          <li key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  s.type === "sale" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                }`}
              >
                {s.type === "sale" ? "↓" : "↑"}
              </div>
              <div>
                <div className="font-medium text-gray-800">{s.title}</div>
                <div className="text-sm text-gray-500">{s.sub}</div>
              </div>
            </div>
            <div className="font-semibold text-gray-800">${s.amount.toLocaleString()}</div>
          </li>
        ))}
        {sales.length === 0 && <li className="text-center text-gray-500">No recent transactions</li>}
      </ul>
    </div>
  );
}