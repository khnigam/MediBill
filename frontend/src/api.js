// Dummy API functions that simulate latency and random failures.
// Each endpoint can fail independently.

function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
function randomFail(chance = 0.25) {
  return Math.random() < chance;
}

export async function getSummary() {
  try {
    const res = await fetch("http://localhost:8080/api/medicines/dashboardStats");
    if (!res.ok) {
      throw new Error(`Dashboard stats request failed: ${res.status}`);
    }

    const data = await res.json();
    return {
      totalSales: Number(data?.totalSalesThisMonth ?? 0),
      // Backend currently returns absolute stats only; keep change fields neutral for UI.
      totalSalesChange: "0%",
      pendingOrders: 0,
      pendingOrdersChange: "0%",
      lowStockCount: Number(data?.lowStockCount ?? 0),
      expiringSoon: Number(data?.expiringSoon ?? 0),
    };
  } catch (error) {
    // Fallback keeps dashboard usable when backend is down/unreachable.
    await wait(200 + Math.random() * 600);
    if (randomFail()) return Promise.reject(new Error("Network error: summary"));
    return {
      totalSales: 12450,
      totalSalesChange: "+5.2%",
      pendingOrders: 8,
      pendingOrdersChange: "+1.5%",
      lowStockCount: 15,
      expiringSoon: 4,
    };
  }
}

export async function getLowStockAlerts() {
  try {
    const res = await fetch("http://localhost:8080/api/medicines/dashboard/lowStock");
    if (!res.ok) {
      throw new Error(`Low stock request failed: ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data)
      ? data.map((item) => ({
          name: String(item?.name ?? ""),
          stock: Number(item?.stock ?? 0),
          levelClass: String(item?.levelClass ?? "ok"),
        }))
      : [];
  } catch (error) {
    await wait(200 + Math.random() * 700);
    if (randomFail()) return Promise.reject(new Error("Network error: low stock"));
    return [
      { name: "Paracetamol 500mg", stock: 8, levelClass: "critical" },
      { name: "Amoxicillin 250mg", stock: 12, levelClass: "critical" },
      { name: "Ibuprofen 200mg", stock: 22, levelClass: "warning" },
      { name: "Aspirin 81mg", stock: 30, levelClass: "ok" },
    ];
  }
}

export async function getRecentSales() {
  try {
    const res = await fetch("http://localhost:8080/api/medicines/dashboard/recentSales");
    if (!res.ok) {
      throw new Error(`Recent sales request failed: ${res.status}`);
    }
    const data = await res.json();
    return Array.isArray(data)
      ? data.map((item) => ({
          type: String(item?.type ?? "sale"),
          title: String(item?.title ?? "Sale #-"),
          sub: String(item?.sub ?? "Walk-in Customer"),
          amount: Number(item?.amount ?? 0),
        }))
      : [];
  } catch (error) {
    await wait(200 + Math.random() * 700);
    if (randomFail()) return Promise.reject(new Error("Network error: recent sales"));
    return [
      { type: "sale", title: "Sale #S-2023-015", sub: "City Pharmacy", amount: 320.0 },
      { type: "sale", title: "Sale #S-2023-014", sub: "HealthFirst Clinic", amount: 1150.5 },
      { type: "purchase", title: "Purchase #P-2023-010", sub: "MediSupply Co.", amount: 5400.0 },
      { type: "sale", title: "Sale #S-2023-013", sub: "Wellness Drugstore", amount: 89.9 },
    ];
  }
}