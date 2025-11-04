import React from "react";

export default function LowStockTable({ items = [] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 w-full">
      <h3 className="text-lg font-semibold mb-4">Low Stock Alerts</h3>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-sm text-gray-500 border-b">
              <th className="py-3">MEDICINE NAME</th>
              <th className="py-3">STOCK LEVEL</th>
              <th className="py-3 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="align-top">
                <td className="py-4 text-gray-700">{it.name}</td>
                <td className="py-4">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      it.levelClass === "critical"
                        ? "bg-red-50 text-red-600"
                        : it.levelClass === "warning"
                        ? "bg-yellow-50 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {it.stock} units
                  </span>
                </td>
                <td className="py-4 text-right">
                  <a href="#" className="text-blue-600 font-medium">
                    Reorder
                  </a>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan="3" className="py-6 text-center text-gray-500">
                  No low stock items
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}