import React, { useState, useEffect, useMemo } from "react";

const initialInventory = [
  {
    id: 1,
    medicineName: "Paracetamol 500mg",
    genericName: "Acetaminophen",
    availableStock: 1200,
    unitPrice: 0.15,
    expiryDate: "12/2025",
  },
  {
    id: 2,
    medicineName: "Amoxicillin 250mg",
    genericName: "Amoxicillin Trihydrate",
    availableStock: 45,
    unitPrice: 0.32,
    expiryDate: "08/2024",
  },
  {
    id: 3,
    medicineName: "Ibuprofen 200mg",
    genericName: "Ibuprofen",
    availableStock: 850,
    unitPrice: 0.1,
    expiryDate: "07/2024",
  },
  {
    id: 4,
    medicineName: "Lisinopril 10mg",
    genericName: "Lisinopril Dihydrate",
    availableStock: 560,
    unitPrice: 0.55,
    expiryDate: "01/2026",
  },
  {
    id: 5,
    medicineName: "Metformin 500mg",
    genericName: "Metformin Hydrochloride",
    availableStock: 2000,
    unitPrice: 0.08,
    expiryDate: "11/2025",
  },
  {
    id: 6,
    medicineName: "Atorvastatin 20mg",
    genericName: "Atorvastatin Calcium",
    availableStock: 25,
    unitPrice: 1.2,
    expiryDate: "06/2024",
  },
];

function MedicineInventory() {
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [batchModal, setBatchModal] = useState(null);
  const [batchList, setBatchList] = useState([]);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyBatchNo, setHistoryBatchNo] = useState("");
  const [historyBatchId, setHistoryBatchId] = useState(null);
  /** Default: hide disabled batches; radio switches to include them. */
  const [showDisabledBatches, setShowDisabledBatches] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const fetchInventory = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/medicines/summary");
      const data = await res.json();
      const formatted = data.map(m => ({
        id: m.id,
        medicineName: m.name,
        genericName: m.brand,
        availableStock: m.totalQuantity,
        unitPrice: m.highestMrp || 0,
        isActive: m.active !== false,
      }));
      setInventory(formatted);
    } catch (err) {
      console.error("Error fetching inventory", err);
    }
  };

  const totalMedicines = inventory.length;
  const itemsLowOnStock = inventory.filter(i => i && typeof i.availableStock === "number" && i.availableStock < 50).length;
  const itemsExpiringSoon = 0;

  const openBatchModal = async (medicine) => {
    setBatchModal(medicine);
    setShowDisabledBatches(false);

    try {
      const response = await fetch(`http://localhost:8080/api/medicines/${medicine.id}/batches`);
      const data = await response.json();
      setBatchList(data);
    } catch (err) {
      console.error("Error loading batches", err);
    }
  };

  const deleteMedicine = async (medicineId) => {
    const ok = window.confirm("Disable this medicine?");
    if (!ok) return;
    try {
      const res = await fetch(`http://localhost:8080/api/medicines/${medicineId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        let message = `Failed with status ${res.status}`;
        try {
          const body = await res.json();
          message = body?.message || body?.error || message;
        } catch {
          const text = await res.text();
          message = text || message;
        }
        throw new Error(message);
      }
      if (batchModal?.id === medicineId) closeBatchModal();
      await fetchInventory();
    } catch (err) {
      console.error("Delete medicine failed", err);
      alert("Disable medicine failed: " + err.message);
    }
  };

  const deleteBatch = async (batchId) => {
    const ok = window.confirm("Disable this batch?");
    if (!ok || !batchModal?.id) return;
    try {
      const res = await fetch(`http://localhost:8080/api/medicines/batches/${batchId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        let message = `Failed with status ${res.status}`;
        try {
          const body = await res.json();
          message = body?.message || body?.error || message;
        } catch {
          const text = await res.text();
          message = text || message;
        }
        throw new Error(message);
      }
      await openBatchModal(batchModal);
      await fetchInventory();
    } catch (err) {
      console.error("Delete batch failed", err);
      alert("Disable batch failed: " + err.message);
    }
  };

  const closeBatchModal = () => {
    setBatchModal(null);
    setBatchList([]);
    setHistoryEntries([]);
    setHistoryLoading(false);
    setHistoryError("");
    setHistoryBatchNo("");
    setHistoryBatchId(null);
    setShowDisabledBatches(false);
  };

  const visibleBatches = useMemo(() => {
    let list = [...(batchList ?? [])];
    list.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
    if (!showDisabledBatches) {
      list = list.filter((b) => b.active !== false);
    }
    return list;
  }, [batchList, showDisabledBatches]);

  useEffect(() => {
    if (!showDisabledBatches && historyBatchId != null && (batchList ?? []).length > 0) {
      const row = batchList.find((b) => b.id === historyBatchId);
      if (row && row.active === false) {
        setHistoryBatchId(null);
        setHistoryBatchNo("");
        setHistoryEntries([]);
        setHistoryError("");
        setHistoryLoading(false);
      }
    }
  }, [showDisabledBatches, historyBatchId, batchList]);

  const loadBatchHistory = async (b) => {
    if (!b?.id) return;
    setHistoryBatchId(b.id);
    setHistoryBatchNo(b.batchNo ?? "");
    setHistoryLoading(true);
    setHistoryError("");
    setHistoryEntries([]);
    try {
      const res = await fetch(`http://localhost:8080/api/batches/${b.id}/history`);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setHistoryEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Batch history failed", err);
      setHistoryError(err?.message || "Failed to load batch history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // --- FIXED SEARCH LOGIC ---
  const filteredInventory = React.useMemo(() => {
    if (!searchTerm.trim()) return inventory;

    const term = searchTerm.toLowerCase();

    // Filter out badly formed objects (should not throw if field is missing)
    return inventory.filter(item => {
      if (!item || (typeof item !== "object")) return false;
      // String coercion to avoid .toLowerCase() crashes on non-string
      const medName = String(item.medicineName ?? "").toLowerCase();
      const generic = String(item.genericName ?? "").toLowerCase();
      return medName.includes(term) || generic.includes(term);
    });
  }, [inventory, searchTerm]);
  // --- END FIX ---

  // handle page reset on search
  useEffect(() => setPage(1), [searchTerm]);

  const totalPages = Math.ceil(filteredInventory.length / PAGE_SIZE);

  const paginatedItems = filteredInventory.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <div className="w-full font-sans">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          placeholder="Search by medicine or brand..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded p-2 w-72"
        />
        <div className="space-x-2">
          <button className="border px-3 py-1 rounded">Filter</button>
          <button className="border px-3 py-1 rounded">Sort</button>
          <button className="border px-3 py-1 rounded">Export</button>
          <button className="bg-blue-600 text-white px-4 py-1 rounded">
            + Add New Medicine
          </button>
        </div>
      </div>

      <table className="w-full border-collapse bg-white shadow rounded">
        <thead>
          <tr className="border-b">
            <th className="p-3 text-left">Medicine Name</th>
            <th className="p-3 text-left">Brand</th>
            <th className="p-3 text-left">Available Stock</th>
            <th className="p-3 text-left">Unit Price</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {paginatedItems.map(item => {
            if (!item) return null;
            const lowStock = typeof item.availableStock === "number" && item.availableStock < 50;
            const isDisabled = item.isActive === false;
            return (
              <tr
                key={item.id}
                className={`border-b ${isDisabled ? "opacity-60 bg-gray-100" : "hover:bg-gray-50 cursor-pointer"}`}
                onClick={() => openBatchModal(item)}
              >

                <td className="p-3 font-semibold">
                  {item.medicineName} {isDisabled && <span className="text-xs text-gray-500">(Disabled)</span>}
                </td>
                <td className="p-3 text-gray-600">{item.genericName}</td>
                <td className={`p-3 ${lowStock ? "text-red-600 font-semibold" : ""}`}>
                  {lowStock ? "● " : ""}
                  {typeof item.availableStock === "number" ? item.availableStock.toLocaleString() : 0} units
                </td>
                <td className="p-3">₹{(item.unitPrice ?? 0).toFixed(2)}</td>
                <td className="p-3 space-x-2 text-gray-600">
                  <button disabled={isDisabled}>✏️</button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isDisabled) return;
                      deleteMedicine(item.id);
                    }}
                    title={isDisabled ? "Already disabled" : "Disable medicine"}
                  >
                    {isDisabled ? "🚫" : "🗑️"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {batchModal && (
        <div
          onClick={closeBatchModal}
          className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
          >
            <h2 className="text-xl font-bold mb-1">
              Batch Details – {batchModal.medicineName}
            </h2>
            <p className="mb-3 text-xs text-gray-500">
              Click a batch row to load stock movement history (purchases +, sales −). Newest batches
              are listed first.
            </p>

            <div
              className="mb-4 flex flex-wrap items-center gap-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm"
              role="radiogroup"
              aria-label="Which batches to list"
            >
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="batch-visibility"
                  checked={!showDisabledBatches}
                  onChange={() => setShowDisabledBatches(false)}
                />
                <span>Active batches only</span>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="batch-visibility"
                  checked={showDisabledBatches}
                  onChange={() => setShowDisabledBatches(true)}
                />
                <span>Show disabled batches</span>
              </label>
            </div>

            <table className="w-full border-collapse rounded bg-white shadow">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="p-2 text-left text-xs font-semibold uppercase text-gray-600">Batch No</th>
                  <th className="p-2 text-left text-xs font-semibold uppercase text-gray-600">Expiry</th>
                  <th className="p-2 text-left text-xs font-semibold uppercase text-gray-600">MRP</th>
                  <th className="p-2 text-left text-xs font-semibold uppercase text-gray-600">Purchase Rate</th>
                  <th className="p-2 text-left text-xs font-semibold uppercase text-gray-600">Qty</th>
                  <th className="p-2 text-right text-xs font-semibold uppercase text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleBatches.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-sm text-gray-500">
                      {showDisabledBatches
                        ? "No batches for this medicine."
                        : 'No active batches. Choose "Show disabled batches" above to see disabled rows.'}
                    </td>
                  </tr>
                )}
                {visibleBatches.map((b = {}, idx) => (
                  <tr
                    key={b.id ?? idx}
                    className={
                      "cursor-pointer border-b transition " +
                      (historyBatchId != null && b.id === historyBatchId
                        ? "bg-indigo-50"
                        : "hover:bg-gray-50")
                    }
                    onClick={() => loadBatchHistory(b)}
                  >
                    <td className="p-2 font-medium">{b.batchNo ?? ""}</td>
                    <td className="p-2">{b.expiryDate ?? ""}</td>
                    <td className="p-2">₹{typeof b.mrp === "number" ? b.mrp.toFixed(2) : "0.00"}</td>
                    <td className="p-2">₹{typeof b.purchaseRate === "number" ? b.purchaseRate.toFixed(2) : "0.00"}</td>
                    <td className="p-2">{typeof b.quantity === "number" ? b.quantity : 0}</td>
                    <td className="p-2 text-right">
                      <button
                        type="button"
                        className={`text-sm ${b.active === false ? "text-gray-400" : "text-red-600 hover:underline"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (b.active === false) return;
                          deleteBatch(b.id);
                        }}
                      >
                        {b.active === false ? "Disabled" : "Disable"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(historyBatchNo || historyLoading || historyError || historyEntries.length > 0) && (
              <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50/80 p-4">
                <h3 className="mb-2 text-sm font-bold text-gray-800">
                  Movement history
                  {historyBatchNo ? (
                    <span className="ml-2 font-mono text-indigo-700">{historyBatchNo}</span>
                  ) : null}
                </h3>
                {historyLoading && <p className="text-sm text-gray-500">Loading…</p>}
                {historyError && (
                  <p className="text-sm text-red-600">{historyError}</p>
                )}
                {!historyLoading && !historyError && historyEntries.length === 0 && historyBatchNo && (
                  <p className="text-sm text-gray-500">No purchase or sale lines linked to this batch yet.</p>
                )}
                {!historyLoading && !historyError && historyEntries.length > 0 && (
                  <div className="max-h-56 overflow-auto rounded border border-gray-200 bg-white">
                    <table className="w-full border-collapse text-sm">
                      <thead className="sticky top-0 bg-gray-100 text-left text-xs uppercase text-gray-600">
                        <tr>
                          <th className="p-2">Date</th>
                          <th className="p-2">Type</th>
                          <th className="p-2">Reference</th>
                          <th className="p-2">Party</th>
                          <th className="p-2 text-right">Δ Qty</th>
                          <th className="p-2 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyEntries.map((row, i) => {
                          const d = Number(row.quantityDelta);
                          const pos = d > 0;
                          return (
                            <tr key={`${row.kind}-${row.lineId}-${i}`} className="border-t border-gray-100">
                              <td className="p-2 whitespace-nowrap">{row.date}</td>
                              <td className="p-2">
                                <span
                                  className={
                                    "rounded px-2 py-0.5 text-xs font-semibold " +
                                    (row.kind === "PURCHASE"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-orange-100 text-orange-800")
                                  }
                                >
                                  {row.kind === "PURCHASE" ? "IN (+)" : "OUT (−)"}
                                </span>
                              </td>
                              <td className="p-2 font-mono text-xs">{row.reference || "—"}</td>
                              <td className="p-2 max-w-[140px] truncate" title={row.counterparty}>
                                {row.counterparty || "—"}
                              </td>
                              <td
                                className={
                                  "p-2 text-right font-semibold tabular-nums " +
                                  (pos ? "text-green-700" : "text-orange-700")
                                }
                              >
                                {pos ? `+${d}` : d}
                              </td>
                              <td className="p-2 text-right tabular-nums text-gray-800">
                                {row.balanceAfter}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 text-right">
              <button
                onClick={closeBatchModal}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      <div className="mt-4 flex justify-between text-gray-600">
        <div>
          Showing{" "}
          {filteredInventory.length === 0
            ? "0"
            : (page - 1) * PAGE_SIZE + 1}{" "}
          to{" "}
          {Math.min(page * PAGE_SIZE, filteredInventory.length)} of{" "}
          {filteredInventory.length} results
        </div>

        <div className="space-x-2">
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
            className={`border px-3 py-1 rounded ${
              page === 1 ? "bg-gray-200 cursor-not-allowed" : ""
            }`}
          >
            Previous
          </button>

          <button
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            disabled={page === totalPages || totalPages === 0}
            className={`border px-3 py-1 rounded ${
              page === totalPages || totalPages === 0 ? "bg-gray-200 cursor-not-allowed" : ""
            }`}
          >
            Next
          </button>
        </div>
      </div>

      <footer className="mt-10 text-center text-gray-500 text-sm">
        © 2024 MediDistribute. All rights reserved.
      </footer>
    </div>
  );
}

const batches = {
  "Paracetamol 500mg": ["P500-A01", "P500-A02"],
  "Amoxicillin 250mg": ["A250-B01", "A250-B02"],
  "Ibuprofen 200mg": ["I200-C01"],
  "Lisinopril 10mg": ["L10-D01"],
  "Metformin 500mg": ["M500-E01", "M500-E02"],
  "Atorvastatin 20mg": ["AT20-F01"],
};

const medicinesList = Object.keys(batches);

function EnterPurchase() {
  const [date] = useState("27/10/2023");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [distributor, setDistributor] = useState("");
  const [items, setItems] = useState([
    {
      medicineName: "Paracetamol 500mg",
      batch: "P500-A01",
      qty: 100,
      unitPrice: 10.5,
      location: "Shelf A-101",
    },
    ...Array(7).fill({
      medicineName: "",
      batch: "",
      qty: 0,
      unitPrice: 0,
      location: "",
    }),
  ]);

  const distributors = ["Distributor A", "Distributor B", "Distributor C"];

  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };

      // Auto update unit price if medicine selected
      if (field === "medicineName" && value) {
        // Mock unit price from inventory
        const med = initialInventory.find((m) => m.medicineName === value);
        newItems[index].unitPrice = med ? med.unitPrice * 100 : 0;
        newItems[index].batch = batches[value] ? batches[value][0] : "";
      }
      return newItems;
    });
  };

  const subtotal = items.reduce(
    (acc, item) => acc + item.qty * item.unitPrice,
    0
  );
  const tax = subtotal * 0.05;
  const grandTotal = subtotal + tax;

  // Current stock for first item medicine selected
  const currentStock = items[0].medicineName
    ? initialInventory.find((m) => m.medicineName === items[0].medicineName)
        ?.availableStock || 0
    : 0;
  const expiryDate = items[0].medicineName
    ? initialInventory.find((m) => m.medicineName === items[0].medicineName)
        ?.expiryDate || ""
    : "";

  return (
    <div className="w-full font-sans">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Enter Purchase (demo)</h1>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Invoice Details</h2>
        <div className="grid grid-cols-3 gap-4 max-w-4xl">
          <div>
            <label className="block mb-1 font-semibold" htmlFor="date">
              Date
            </label>
            <input
              type="text"
              id="date"
              value={date}
              readOnly
              className="border rounded p-2 w-full"
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold" htmlFor="invoiceNumber">
              Invoice Number
            </label>
            <input
              id="invoiceNumber"
              placeholder="e.g., INV-2024-001"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="border rounded p-2 w-full"
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold" htmlFor="distributor">
              Distributor
            </label>
            <select
              id="distributor"
              value={distributor}
              onChange={(e) => setDistributor(e.target.value)}
              className="border rounded p-2 w-full"
            >
              <option value="">Select a distributor</option>
              {distributors.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))
          }

            </select>
          </div>
        </div>
      </section>

      <table className="w-full border-collapse bg-white shadow rounded mb-6 max-w-6xl">
        <thead>
          <tr className="border-b">
            <th className="p-3 text-left">Medicine Name</th>
            <th className="p-3 text-left">Batch</th>
            <th className="p-3 text-left">Qty</th>
            <th className="p-3 text-left">Unit Price</th>
            <th className="p-3 text-left">Total Price</th>
            <th className="p-3 text-left">Location</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const totalPrice = item.qty * item.unitPrice;
            return (
              <tr key={idx} className="border-b hover:bg-gray-50">
                <td className="p-2">
                  {idx === 0 ? (
                    <input
                      type="text"
                      value={item.medicineName}
                      readOnly
                      className="border rounded p-1 w-48 bg-gray-100"
                    />
                  ) : (
                    <input
                      type="text"
                      list="medicines"
                      placeholder="Search medicine..."
                      value={item.medicineName}
                      onChange={(e) =>
                        updateItem(idx, "medicineName", e.target.value)
                      }
                      className="border rounded p-1 w-48"
                    />
                  )}
                  <datalist id="medicines">
                    {medicinesList.map((med) => (
                      <option key={med} value={med} />
                    ))}
                  </datalist>
                </td>
                <td className="p-2">
                  <select
                    value={item.batch}
                    onChange={(e) => updateItem(idx, "batch", e.target.value)}
                    className="border rounded p-1 w-32"
                  >
                    {batches[item.medicineName]?.map((batch) => (
                      <option key={batch} value={batch}>
                        {batch}
                      </option>
                    )) || <option value="">Select</option>}
                  </select>
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    min="0"
                    value={item.qty}
                    onChange={(e) =>
                      updateItem(idx, "qty", Number(e.target.value))
                    }
                    className="border rounded p-1 w-20"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(idx, "unitPrice", Number(e.target.value))
                    }
                    className="border rounded p-1 w-20"
                  />
                </td>
                <td className="p-2">₹{totalPrice.toFixed(2)}</td>
                <td className="p-2">
                  <input
                    type="text"
                    placeholder="e.g. Rack A1"
                    value={item.location}
                    onChange={(e) =>
                      updateItem(idx, "location", e.target.value)
                    }
                    className="border rounded p-1 w-32"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button
        className="text-blue-600 mb-4 hover:underline"
        onClick={() =>
          setItems((prev) => [
            ...prev,
            {
              medicineName: "",
              batch: "",
              qty: 0,
              unitPrice: 0,
              location: "",
            },
          ])
        }
      >
        + Add another item
      </button>

      <div className="max-w-4xl bg-gray-100 rounded p-4 text-sm font-semibold space-x-4 mb-6">
        <span>
          Current Stock:{" "}
          <span className="text-blue-600">{currentStock.toLocaleString()} units</span>
        </span>
        <span>Expiry: {expiryDate}</span>
        <span>Unit Cost: ₹{items[0].unitPrice.toFixed(2)}</span>
      </div>

      <div className="max-w-4xl text-right space-y-1">
        <div>
          Subtotal: <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
        </div>
        <div>
          Tax (5%): <span className="font-semibold">₹{tax.toFixed(2)}</span>
        </div>
        <div className="text-xl font-bold">
          Grand Total: <span>₹{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="max-w-4xl mt-6 flex justify-end space-x-4">
        <button className="border px-4 py-2 rounded">Cancel</button>
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Save Purchase</button>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("inventory");

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <button
          type="button"
          className={
            "rounded-lg px-4 py-2 text-sm font-semibold transition " +
            (view === "inventory"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200")
          }
          onClick={() => setView("inventory")}
        >
          Inventory
        </button>
        <button
          type="button"
          className={
            "rounded-lg px-4 py-2 text-sm font-semibold transition " +
            (view === "purchases"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200")
          }
          onClick={() => setView("purchases")}
        >
          Enter purchase (demo)
        </button>
      </div>
      {view === "inventory" && <MedicineInventory />}
      {view === "purchases" && <EnterPurchase />}
    </div>
  );
}