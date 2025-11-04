import React from "react";

export default function StatCard({ title, value, sub }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-3 text-2xl font-semibold text-gray-900">{value}</div>
      {sub && <div className="mt-2 text-sm">{sub}</div>}
    </div>
  );
}