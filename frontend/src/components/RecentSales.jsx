import React, { useEffect, useMemo, useState } from "react";
import { getRecentSales } from "../api";

export default function RecentSales({ sales = [] }) {
  const [fallbackSales, setFallbackSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasExternalSales = Array.isArray(sales) && sales.length > 0;

  useEffect(() => {
    let mounted = true;
    if (hasExternalSales) return undefined;

    setLoading(true);
    setError("");

    getRecentSales()
      .then((data) => {
        if (!mounted) return;
        setFallbackSales(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!mounted) return;
        setError("Could not load recent sales");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [hasExternalSales]);

  const visibleSales = useMemo(() => {
    return hasExternalSales ? sales : fallbackSales;
  }, [hasExternalSales, sales, fallbackSales]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-8 w-full">
      <h3 className="text-lg font-semibold mb-4">Recent Sales</h3>
      <ul className="space-y-4">
        {visibleSales.map((s, i) => (
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
            <div className="font-semibold ml-2 text-gray-800">₹{Number(s?.amount ?? 0).toLocaleString()}</div>
          </li>
        ))}
        {!loading && !error && visibleSales.length === 0 && (
          <li className="text-center text-gray-500">No recent transactions</li>
        )}
        {loading && <li className="text-center text-gray-500">Loading recent sales...</li>}
        {error && <li className="text-center text-red-500">{error}</li>}
      </ul>
    </div>
  );
}