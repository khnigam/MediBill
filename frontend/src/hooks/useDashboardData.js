import { useEffect, useState } from "react";
import { getSummary, getLowStockAlerts, getRecentSales } from "../api";

/**
 * Hook that fetches summary, lowStock, recentSales in parallel.
 * Uses per-endpoint fallback data when a request fails.
 */
export default function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [recentSales, setRecentSales] = useState([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.allSettled([getSummary(), getLowStockAlerts(), getRecentSales()]).then((results) => {
      if (!mounted) return;

      // summary
      if (results[0].status === "fulfilled") {
        setSummary(results[0].value);
      } else {
        setSummary({
          totalSales: 12450,
          totalSalesChange: "+5.2%",
          pendingOrders: 8,
          pendingOrdersChange: "+1.5%",
          lowStockCount: 15,
          expiringSoon: 4,
        });
      }

      // low stock
      if (results[1].status === "fulfilled") {
        setLowStock(results[1].value);
      } else {
        setLowStock([
          { name: "Paracetamol 500mg", stock: 8, levelClass: "critical" },
          { name: "Amoxicillin 250mg", stock: 12, levelClass: "critical" },
          { name: "Ibuprofen 200mg", stock: 22, levelClass: "warning" },
          { name: "Aspirin 81mg", stock: 30, levelClass: "ok" },
        ]);
      }

      // recent sales
      if (results[2].status === "fulfilled") {
        setRecentSales(results[2].value);
      } else {
        setRecentSales([
          { type: "sale", title: "Sale #S-2023-015", sub: "City Pharmacy", amount: 320.0 },
          { type: "sale", title: "Sale #S-2023-014", sub: "HealthFirst Clinic", amount: 1150.5 },
          { type: "purchase", title: "Purchase #P-2023-010", sub: "MediSupply Co.", amount: 5400.0 },
          { type: "sale", title: "Sale #S-2023-013", sub: "Wellness Drugstore", amount: 89.9 },
        ]);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  return { loading, summary, lowStock, recentSales };
}