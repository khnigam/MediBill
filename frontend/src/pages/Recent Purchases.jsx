import React, { useEffect, useMemo, useState } from "react";
import { deletePurchase, getRecentPurchases } from "../api";
import { useNavigate } from "react-router-dom";

const statusColors = {
  Received: "bg-green-200 text-green-700",
  Pending: "bg-yellow-200 text-yellow-700",
  Paid: "bg-blue-200 text-blue-700",
};

export default function RecentPurchases() {
  const [purchasesData, setPurchasesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [statusFilter, setStatusFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const query = search.trim();
    const effectiveQuery = query.length >= 3 ? query : "";

    getRecentPurchases(effectiveQuery)
      .then((data) => {
        if (!mounted) return;
        setPurchasesData(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!mounted) return;
        setPurchasesData([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [search]);

  function filterAndSortData() {
    let data = purchasesData;

    if (statusFilter) {
      data = data.filter((p) => p.status === statusFilter);
    }

    if (sortKey === "date") {
      data = [...data].sort(
        (a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate)
      );
    } else if (sortKey === "amount") {
      data = [...data].sort((a, b) => b.totalAmount - a.totalAmount);
    }

    return data;
  }

  const filteredData = useMemo(() => filterAndSortData(), [sortKey, statusFilter, purchasesData]);

  const openPurchase = (purchaseId, mode = "view") => {
    const row = purchasesData.find((p) => p.purchaseId === purchaseId);
    if (!row?.id) return;
    if (mode === "view") {
      navigate(`/purchase/view/${row.id}`);
      return;
    }
    navigate(`/purchase?purchaseId=${row.id}&mode=edit`);
  };

  const handleDelete = async (purchaseId) => {
    const row = purchasesData.find((p) => p.purchaseId === purchaseId);
    if (!row?.id) return;
    if (!window.confirm(`Delete purchase ${purchaseId}?`)) return;
    try {
      await deletePurchase(row.id);
      const refreshed = await getRecentPurchases(search.trim().length >= 3 ? search.trim() : "");
      setPurchasesData(Array.isArray(refreshed) ? refreshed : []);
    } catch (e) {
      console.error("Failed to delete purchase", e);
      alert("Failed to delete purchase");
    }
  };

  return (

    <div className="mt-20 mx-auto p-6 bg-gray-50 rounded-md shadow-md" style={{width: '92vw'}} >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recent Purchases</h1>
          <p className="text-gray-600">
            Manage and track all incoming stock and purchase orders.
          </p>
        </div>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-1"
          onClick={() => navigate("/purchase")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add New Purchase
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <input
          type="text"
          placeholder="Search by supplier name or Purchase ID..."
          className="flex-grow border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border border-gray-300 rounded px-4 py-2 focus:outline-none"
          onChange={(e) => setSortKey(e.target.value)}
          value={sortKey}
        >
          <option value="date">Sort by Date</option>
          <option value="amount">Sort by Amount</option>
        </select>

        <select
          className="border border-gray-300 rounded px-4 py-2 focus:outline-none"
          onChange={(e) => setStatusFilter(e.target.value)}
          value={statusFilter}
        >
          <option value="">Filter by Status</option>
          <option value="Received">Received</option>
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
        </select>
      </div>

      <div className="overflow-x-auto bg-white border border-gray-200 rounded-md">
        <table className="w-full text-left text-gray-700">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="px-6 py-3">Purchase Date</th>
              <th className="px-6 py-3">Supplier Name</th>
              <th className="px-6 py-3">Purchase ID</th>
              <th className="px-6 py-3">Total Amount</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-400 italic select-none">
                  Loading purchases...
                </td>
              </tr>
            )}
            {!loading && filteredData.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-6 text-gray-400 italic select-none"
                >
                  No purchases found.
                </td>
              </tr>
            )}
            {filteredData.map((purchase, idx) => (
              <tr
                key={`${purchase.id ?? "noid"}-${purchase.purchaseId ?? "nopurchaseid"}-${idx}`}
                className={idx % 2 === 0 ? "bg-gray-50" : ""}
              >
                <td className="px-6 py-4">{purchase.purchaseDate}</td>
                <td className="px-6 py-4">{purchase.supplierName}</td>
                <td className="px-6 py-4 text-blue-600 cursor-pointer hover:underline">
                  <button onClick={() => openPurchase(purchase.purchaseId, "view")} className="hover:underline">
                    {purchase.purchaseId}
                  </button>
                </td>
                <td className="px-6 py-4">₹{purchase.totalAmount.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${statusColors[purchase.status]}`}
                  >
                    {purchase.status}
                  </span>
                </td>
                <td className="px-6 py-4 flex gap-4 text-gray-600">
                  <button
                    title="View"
                    className="hover:text-gray-900"
                    aria-label="View"
                    onClick={() => openPurchase(purchase.purchaseId, "view")}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </button>
                  <button
                    title="Edit"
                    className="hover:text-gray-900"
                    aria-label="Edit"
                    onClick={() => openPurchase(purchase.purchaseId, "edit")}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.232 5.232l3.536 3.536M9 11l6-6M3 21v-3a4 4 0 014-4h3"
                      />
                    </svg>
                  </button>
                  <button
                    title="Delete"
                    className="hover:text-red-600"
                    aria-label="Delete"
                    onClick={() => handleDelete(purchase.purchaseId)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V4h6v3m-7 4v6m4-6v6m4-10v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4 text-gray-600 text-sm">
        <div>
          Showing {filteredData.length} of {purchasesData.length} results
        </div>
        <div className="flex gap-2">
          <button
            disabled
            className="border border-gray-300 rounded px-3 py-1 cursor-not-allowed text-gray-400"
          >
            Previous
          </button>
          <button className="border border-gray-300 rounded px-3 py-1 hover:bg-gray-100">
            Next
          </button>
        </div>
      </div>

    </div>
  );
}