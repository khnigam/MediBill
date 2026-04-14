import React, { useEffect, useMemo, useState } from "react";
import { getAllCustomers, getMedicinesForSearch, getSalesList } from "../api";

const paymentMethods = ["Cash", "Card", "UPI", "Net Banking"];

const emptyRow = {
  medicineName: "",
  batch: "",
  batchOptions: [],
  qty: "",
  unitPrice: "",
  discountPercent: "",
};

const DEFAULT_ROW_COUNT = 8;
const buildInitialRows = (discountPercent = 0) =>
  Array.from({ length: DEFAULT_ROW_COUNT }, () => ({ ...emptyRow, discountPercent }));

export default function EnterSalePage() {
  const [date, setDate] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [customer, setCustomer] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [rows, setRows] = useState(buildInitialRows(0));
  const [medicines, setMedicines] = useState([]);
  const [medicineResults, setMedicineResults] = useState({});
  const [medicineActiveIndex, setMedicineActiveIndex] = useState({});
  const [batchResults, setBatchResults] = useState({});
  const [discountMode, setDiscountMode] = useState("tax"); // "tax" | "custom"
  const [defaultDiscountPercent, setDefaultDiscountPercent] = useState("");
  const [showDiscountSetup, setShowDiscountSetup] = useState(true);
  const [hideBatchColumn, setHideBatchColumn] = useState(false);

  useEffect(() => {
    let mounted = true;

    getSalesList()
      .then((sales) => {
        if (!mounted) return;
        const maxNum = sales.reduce((max, s) => {
          const match = String(s?.invoiceNumber ?? "").match(/^UJJ(\d+)$/i);
          if (!match) return max;
          return Math.max(max, Number(match[1]));
        }, 0);
        const next = maxNum + 1;
        setBillNumber(`UJJ${String(next).padStart(2, "0")}`);
      })
      .catch(() => {
        if (!mounted) return;
        setBillNumber("UJJ01");
      });

    getAllCustomers()
      .then((list) => {
        if (!mounted) return;
        setCustomers(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!mounted) return;
        setCustomers([]);
      });

    getMedicinesForSearch("")
      .then((list) => {
        if (!mounted) return;
        const unique = Array.from(
          new Map((Array.isArray(list) ? list : []).map((m) => [m.medicineId, m])).values()
        );
        setMedicines(unique);
      })
      .catch(() => {
        if (!mounted) return;
        setMedicines([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleRowChange = (index, field, value) => {
    const newRows = [...rows];
    if (field === "qty" || field === "unitPrice" || field === "discountPercent") {
      if (value === "") {
        newRows[index] = { ...newRows[index], [field]: "" };
        setRows(newRows);
        return;
      }
      value = Number(value);
      if (isNaN(value)) value = "";
    }
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const addAnotherItem = () =>
    setRows([
      ...rows,
      {
        ...emptyRow,
        discountPercent: discountMode === "tax" ? 5 : (defaultDiscountPercent === "" ? "" : Number(defaultDiscountPercent)),
      },
    ]);

  const removeRow = (index) => {
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows.length ? newRows : [{ ...emptyRow }]);
  };

  const rowTotal = (row) => {
    const line = row.qty * row.unitPrice;
    const discount = (row.discountPercent / 100) * line;
    return line - discount;
  };

  const subtotal = rows.reduce((acc, r) => acc + rowTotal(r), 0);
  const tax = subtotal * 0.05; // 5% tax
  const grandTotal = subtotal + tax;

  const applyDefaultDiscount = () => {
    const applied = discountMode === "tax" ? 5 : (defaultDiscountPercent === "" ? "" : Number(defaultDiscountPercent));
    setRows((prev) => prev.map((r) => ({ ...r, discountPercent: applied })));
    setShowDiscountSetup(false);
  };

  const moveFocus = (currentEl, direction = 1) => {
    const focusables = Array.from(
      document.querySelectorAll('input[data-nav="sale"], select[data-nav="sale"]')
    ).filter((el) => !el.disabled && el.offsetParent !== null && !el.readOnly);

    const idx = focusables.indexOf(currentEl);
    if (idx < 0) return;
    const next = focusables[idx + direction];
    if (next) next.focus();
  };

  const handleNavKeyDown = (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      moveFocus(e.currentTarget, 1);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      moveFocus(e.currentTarget, e.shiftKey ? -1 : 1);
    }
  };

  const searchableCustomerOptions = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 20);
    return customers
      .filter((c) => {
        const owner = (c.ownerName || c.name || "").toLowerCase();
        const addr = (c.address || "").toLowerCase();
        const name = (c.name || "").toLowerCase();
        return owner.includes(q) || addr.includes(q) || name.includes(q);
      })
      .slice(0, 20);
  }, [customers, customerSearch]);

  const formatCustomerOption = (c) => {
    const owner = c.ownerName || c.name || "Unknown";
    const addr = c.address || "No address";
    return `${owner} (${addr})`;
  };

  const selectCustomer = (c) => {
    const owner = c.ownerName || c.name || "";
    setCustomer(owner);
    setCustomerSearch(formatCustomerOption(c));
    setShowCustomerDropdown(false);
  };

  const searchMedicineForRow = (text, rowIndex) => {
    if (!text || text.trim().length < 1) {
      setMedicineResults((prev) => ({ ...prev, [rowIndex]: [] }));
      setMedicineActiveIndex((prev) => ({ ...prev, [rowIndex]: -1 }));
      return;
    }
    const q = text.toLowerCase();
    const filtered = medicines.filter((m) => (m.medicineName || "").toLowerCase().includes(q));
    setMedicineResults((prev) => ({ ...prev, [rowIndex]: filtered.slice(0, 15) }));
    setMedicineActiveIndex((prev) => ({ ...prev, [rowIndex]: -1 }));
  };

  const selectMedicineForRow = (rowIndex, med) => {
    const options = Array.isArray(med.batches) ? med.batches : [];
    const highestQtyBatch = options.reduce((best, cur) => {
      const curQty = Number(cur?.quantity ?? 0);
      const bestQty = Number(best?.quantity ?? -1);
      return curQty > bestQty ? cur : best;
    }, null);

    setRows((prev) => {
      const copy = [...prev];
      copy[rowIndex] = {
        ...copy[rowIndex],
        medicineName: med.medicineName || "",
        batchOptions: options,
        batch: highestQtyBatch?.batchNo || "",
      };
      return copy;
    });
    setMedicineResults((prev) => ({ ...prev, [rowIndex]: [] }));
    setMedicineActiveIndex((prev) => ({ ...prev, [rowIndex]: -1 }));
    setBatchResults((prev) => ({ ...prev, [rowIndex]: [] }));
  };

  const handleMedicineKeyDown = (e, rowIndex) => {
    const list = medicineResults[rowIndex] || [];
    if (!list.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMedicineActiveIndex((prev) => {
        const cur = prev[rowIndex] ?? -1;
        const next = cur < list.length - 1 ? cur + 1 : 0;
        return { ...prev, [rowIndex]: next };
      });
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setMedicineActiveIndex((prev) => {
        const cur = prev[rowIndex] ?? -1;
        const next = cur > 0 ? cur - 1 : list.length - 1;
        return { ...prev, [rowIndex]: next };
      });
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const active = medicineActiveIndex[rowIndex] ?? -1;
      const selected = active >= 0 ? list[active] : list[0];
      if (selected) selectMedicineForRow(rowIndex, selected);
    }
  };

  const searchBatchForRow = (text, rowIndex) => {
    const options = rows[rowIndex]?.batchOptions || [];
    if (!options.length) {
      setBatchResults((prev) => ({ ...prev, [rowIndex]: [] }));
      return;
    }
    const q = (text || "").toLowerCase();
    const filtered = options.filter((b) => (b.batchNo || "").toLowerCase().includes(q));
    setBatchResults((prev) => ({ ...prev, [rowIndex]: filtered.slice(0, 20) }));
  };

  const selectBatchForRow = (rowIndex, b) => {
    handleRowChange(rowIndex, "batch", b.batchNo || "");
    setBatchResults((prev) => ({ ...prev, [rowIndex]: [] }));
  };

  const locationColumnEnabled = false;

  const tableColSpan = useMemo(() => {
    let cols = 5; // medicine, qty, unit, total, action
    if (!hideBatchColumn) cols += 1;
    if (discountMode === "custom") cols += 1;
    if (locationColumnEnabled) cols += 1;
    return cols;
  }, [discountMode, hideBatchColumn, locationColumnEnabled]);

  return (
    <div className="bg-gray-50 min-h-screen p-6 font-sans text-gray-900">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-green-600 text-white px-3 py-1 rounded font-semibold text-sm">
            Stitch - Sales
          </div>
          <nav className="space-x-4 text-gray-700 font-medium">
            <a href="#" className="hover:text-green-600">Dashboard</a>
            <a href="#" className="hover:text-green-600">Inventory</a>
            <a href="#" className="underline font-bold text-green-700">Sales</a>
            <a href="#" className="hover:text-green-600">Reports</a>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <button className="bg-green-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-green-700 transition">
            Log Out
          </button>
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-semibold">U</div>
        </div>
      </header>

      <main className="bg-white rounded-lg shadow p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Enter Sale</h1>
        <p className="mb-6 text-gray-700">Create a sales bill by adding medicine items below.</p>

        {showDiscountSetup && (
          <section className="mb-6 bg-green-50 border border-green-200 p-4 rounded">
            <h2 className="font-semibold mb-2">Initial Sale Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="defaultDiscount">
                  Default Discount (%)
                </label>
                <div className="flex gap-2">
                  <select
                    data-nav="sale"
                    onKeyDown={handleNavKeyDown}
                    value={discountMode}
                    onChange={(e) => setDiscountMode(e.target.value)}
                    className="w-40 rounded border border-gray-300 px-3 py-2 bg-white"
                  >
                    <option value="tax">Fixed to Tax (5%)</option>
                    <option value="custom">Custom Fixed</option>
                  </select>
                  <input
                    data-nav="sale"
                    onKeyDown={handleNavKeyDown}
                    id="defaultDiscount"
                    type="text"
                    inputMode="decimal"
                    disabled={discountMode !== "custom"}
                    value={defaultDiscountPercent}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.]/g, "");
                      const oneDot = cleaned.replace(/^(\d*\.?\d*).*$/, "$1");
                      setDefaultDiscountPercent(oneDot === "" ? 0 : Number(oneDot));
                    }}
                    className={`w-full rounded border border-gray-300 px-3 py-2 ${
                      discountMode !== "custom" ? "bg-gray-100 text-gray-500" : "bg-white"
                    }`}
                    placeholder="e.g. 7.5"
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hideBatchColumn}
                  onChange={(e) => setHideBatchColumn(e.target.checked)}
                />
                Hide batch field for this sale
              </label>
              <div>
                <button
                  type="button"
                  onClick={applyDefaultDiscount}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Apply and Continue
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              This discount is auto-filled in all existing rows and any new rows you add.
            </p>
          </section>
        )}

        <section className="mb-6 bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-3">Bill Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="date">Date</label>
              <input
                data-nav="sale"
                onKeyDown={handleNavKeyDown}
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="billNumber">Bill Number</label>
              <input type="text" id="billNumber" value={billNumber} readOnly className="w-full rounded border border-gray-300 px-3 py-2 bg-gray-100 text-gray-700 cursor-not-allowed" />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium mb-1" htmlFor="customer">Customer</label>
              <input
                data-nav="sale"
                onKeyDown={handleNavKeyDown}
                id="customer"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setCustomer("");
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 120)}
                placeholder="Search customer by owner or address..."
                className="w-full rounded border border-gray-300 px-3 py-2 bg-white"
              />
              {showCustomerDropdown && searchableCustomerOptions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded border border-gray-300 bg-white shadow">
                  {searchableCustomerOptions.map((c) => (
                    <button
                      key={c.id ?? `${c.name}-${c.address}`}
                      type="button"
                      onMouseDown={() => selectCustomer(c)}
                      className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                    >
                      <div className="font-medium text-sm text-gray-800">{c.ownerName || c.name || "-"}</div>
                      <div className="text-xs text-gray-500">{c.address || "No address"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="paymentMethod">Payment</label>
              <select
                data-nav="sale"
                onKeyDown={handleNavKeyDown}
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                <option value="">Select payment</option>
                {paymentMethods.map((p) => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
          </div>
        </section>

        <section>
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Medicine Name</th>
                {!hideBatchColumn && (
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Batch</th>
                )}
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Qty</th>
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Unit Price</th>
                {discountMode === "custom" && (
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Discount %</th>
                )}
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Line Total</th>
                <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const total = rowTotal(row).toFixed(2);
                return (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-gray-300 px-3 py-2 relative">
                      <input
                        data-nav="sale"
                        onKeyDown={(e) => {
                          handleMedicineKeyDown(e, i);
                          handleNavKeyDown(e);
                        }}
                        type="text"
                        placeholder="Search medicine..."
                        value={row.medicineName}
                        onChange={(e) => {
                          handleRowChange(i, "medicineName", e.target.value);
                          searchMedicineForRow(e.target.value, i);
                        }}
                        onBlur={() =>
                          setTimeout(() => {
                            setMedicineResults((prev) => ({ ...prev, [i]: [] }));
                            setMedicineActiveIndex((prev) => ({ ...prev, [i]: -1 }));
                          }, 120)
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                      {medicineResults[i]?.length > 0 && (
                        <div className="absolute z-20 mt-1 w-[95%] max-h-48 overflow-auto rounded border border-gray-300 bg-white shadow">
                          {medicineResults[i].map((m, idx) => (
                            <button
                              key={m.medicineId ?? idx}
                              type="button"
                              onMouseDown={() => selectMedicineForRow(i, m)}
                              onMouseEnter={() =>
                                setMedicineActiveIndex((prev) => ({ ...prev, [i]: idx }))
                              }
                              className={`block w-full text-left px-3 py-2 text-sm ${
                                (medicineActiveIndex[i] ?? -1) === idx
                                  ? "bg-blue-100"
                                  : "hover:bg-gray-100"
                              }`}
                            >
                              {m.medicineName}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    {!hideBatchColumn && (
                      <td className="border border-gray-300 px-3 py-2 relative">
                        <input
                          data-nav="sale"
                          onKeyDown={handleNavKeyDown}
                          type="text"
                          value={row.batch}
                          onChange={(e) => {
                            handleRowChange(i, "batch", e.target.value);
                            searchBatchForRow(e.target.value, i);
                          }}
                          onFocus={() => searchBatchForRow(row.batch || "", i)}
                          onBlur={() => setTimeout(() => setBatchResults((prev) => ({ ...prev, [i]: [] })), 120)}
                          placeholder={
                            (row.batchOptions || []).length > 0
                              ? "Search batch..."
                              : "Select medicine first"
                          }
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        {(row.batchOptions || []).length > 0 && batchResults[i]?.length > 0 && (
                          <div className="absolute z-20 mt-1 w-[95%] max-h-40 overflow-auto rounded border border-gray-300 bg-white shadow">
                            {batchResults[i].map((b, idx) => (
                              <button
                                key={b.batchId ?? idx}
                                type="button"
                                onMouseDown={() => selectBatchForRow(i, b)}
                                className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                              >
                                <div className="flex items-center justify-between">
                                  <span>{b.batchNo}</span>
                                  <span className="text-xs text-gray-500">
                                    Qty: {Number(b.quantity ?? 0)}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    )}
                    <td className="border border-gray-300 px-3 py-2 text-right">
                      <input
                        data-nav="sale"
                        onKeyDown={handleNavKeyDown}
                        type="number"
                        min="0"
                        placeholder="0"
                        value={row.qty}
                        onChange={(e) => handleRowChange(i, "qty", e.target.value)}
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right">
                      <input
                        data-nav="sale"
                        onKeyDown={handleNavKeyDown}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={row.unitPrice}
                        onChange={(e) => handleRowChange(i, "unitPrice", e.target.value)}
                        className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                      />
                    </td>
                    {discountMode === "custom" && (
                      <td className="border border-gray-300 px-3 py-2 text-right">
                        <input
                          data-nav="sale"
                          onKeyDown={handleNavKeyDown}
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0"
                          value={row.discountPercent}
                          onChange={(e) => handleRowChange(i, "discountPercent", e.target.value)}
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                        />
                      </td>
                    )}
                    <td className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">₹{total}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <button type="button" onClick={() => removeRow(i)} className="text-sm text-red-600 hover:underline">Remove</button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={tableColSpan} className="text-center py-4 text-gray-500">
                    No rows
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-3 flex items-center justify-between">
            <button type="button" onClick={addAnotherItem} className="text-green-600 font-semibold text-sm hover:underline">+ Add another item</button>
          </div>
        </section>

        <section className="mt-6 bg-gray-100 p-4 rounded flex justify-between items-center text-sm font-medium text-gray-700">
          <div />
          <div className="text-right">
            <div>Subtotal <span className="font-semibold">₹{subtotal.toFixed(2)}</span></div>
            <div>Tax (5%) <span className="font-semibold">₹{tax.toFixed(2)}</span></div>
            <div className="text-lg font-bold text-green-600">Grand Total ₹{grandTotal.toFixed(2)}</div>
          </div>
        </section>

        <section className="mt-6 flex justify-end space-x-4">
          <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100" onClick={() => alert("Sale cancelled")}>Cancel</button>
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" onClick={() => alert("Sale saved")}>Save Sale</button>
        </section>
      </main>
    </div>
  );
}
