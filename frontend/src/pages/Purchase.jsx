import React, { useEffect, useState } from "react";

/**
 * EnterPurchasePage.jsx
 *
 * - Fetches medicines and suppliers (distributors)
 * - Searchable dropdowns for medicines and suppliers
 * - Tax rules: API-controlled tax makes tax readonly; default tax = 5
 * - Tax Type: exclusive/inclusive
 * - Rate Type: "actual" or "none" (if "actual" an Actual Price column is shown and posted)
 * - Unit price is always BEFORE tax; Net Unit Price = unitPrice * (1 + tax/100)
 * - Expiry can be prepopulated from batch selection when batch contains expiry; editable
 * - On Save Purchase, builds payload and POSTs to /api/purchases (adjust URL as needed)
 *
 * Note: adjust API endpoints if different in your backend.
 */

export default function EnterPurchasePage() {
  // static defaults (kept for fallback)
  const fallbackDistributors = [
    "Global Pharma",
    "HealthCare Supply",
    "MedLife Co.",
    "Pharma Inc.",
  ];

  const emptyRowTemplate = {
    medicineId: null,      // set when medicine selected from API
    medicineName: "",
    batch: "",
    qty: "",
    unitPrice: 0,          // before tax
    actualPrice: null,     // optional actual price (if rateType === "actual")
    expiry: "",
    mrp: "",
    tax: 5,
    batchOptions: [],      // batches from selected medicine
    apiTax: false,         // if true, tax is readonly (from API)
    batchMeta: null,       // store selected batch object if needed
  };

  // create 8 empty rows by default
  const initialRows = Array.from({ length: 2 }, () => ({ ...emptyRowTemplate }));

  // keyboard navigation order
  const colOrder = ["medicineName", "batch", "expiry", "mrp", "tax", "qty", "unitPrice"];

  // component state
  const [date, setDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [supplierId, setSupplierId] = useState(""); // will store supplier id
  const [supplierName, setSupplierName] = useState(""); // display name
  const [rows, setRows] = useState(initialRows);

  const [activeField, setActiveField] = useState({ row: 0, col: 0 });

  // fetched lists
  const [medicineList, setMedicineList] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // per-row dropdown/search state
  const [medSearchResults, setMedSearchResults] = useState({});
  const [medActive, setMedActive] = useState({});
  const [batchResults, setBatchResults] = useState({});
  const [batchActive, setBatchActive] = useState({});
  const [supplierSearchResults, setSupplierSearchResults] = useState([]);
  const [supplierActiveIndex, setSupplierActiveIndex] = useState(-1);

  // purchase options
  const [purchaseType, setPurchaseType] = useState("purchase"); // purchase / stock_update
  const [paymentType, setPaymentType] = useState("cash"); // cash / credit
  const [taxType, setTaxType] = useState("exclusive"); // exclusive / inclusive
  const [rateType, setRateType] = useState("none"); // "actual" or "none"

  // load medicines + suppliers + set today's date
  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/medicines/forSearch?query=");
        const data = await res.json();
        const unique = Array.from(new Map(data.map(m => [m.medicineId, m])).values());
        setMedicineList(unique);
      } catch (err) {
        console.error("failed to load medicines", err);
      }
    };

    const fetchSuppliers = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/suppliers");
        const data = await res.json();
        // backend returns array of SupplierResponse with id, name, etc.
        setSuppliers(data || []);
      } catch (err) {
        console.error("failed to load suppliers", err);
        setSuppliers([]);
      }
    };

    setDate(new Date().toISOString().split("T")[0]);
    fetchMedicines();
    fetchSuppliers();
  }, []);

  // focus logic
  useEffect(() => {
    const { row, col } = activeField;
    const colName = colOrder[col];
    const el = document.getElementById(`cell-${row}-${colName}`);
    if (el) {
      el.focus();
      if (el.setSelectionRange) {
        const len = el.value?.length || 0;
        el.setSelectionRange(len, len);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeField]);

  const handleRowChange = (index, field, value) => {
    setRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addAnotherItem = () => {
    setRows(prev => [...prev, { ...emptyRowTemplate }]);
  };

  const ensureLastRowAlwaysEmpty = (rowIndex) => {
    if (rowIndex === rows.length - 1) {
      setRows(prev => [...prev, { ...emptyRowTemplate }]);
    }
  };

  // compute row numeric results (unitPrice BEFORE tax; netUnit = after tax)
  const computeRowValues = (row) => {
    const unit = Number(row.unitPrice) || 0;
    const qty = Number(row.qty) || 0;
    const tax = Number(row.tax) || 5;

    if (taxType === "exclusive") {
      const netUnit = unit * (1 + tax / 100);
      const preTaxTotal = qty * unit;
      const taxAmount = qty * unit * (tax / 100);
      const rowTotal = qty * netUnit;
      return {
        unitBeforeTax: unit,
        netUnitInclTax: netUnit,
        preTaxTotal,
        taxAmount,
        rowTotal,
      };
    } else {
      // inclusive: unitPrice entered includes tax already
      const netUnit = unit;
      const preTaxUnit = unit / (1 + tax / 100);
      const preTaxTotal = qty * preTaxUnit;
      const taxAmount = qty * (unit - preTaxUnit);
      const rowTotal = qty * unit;
      return {
        unitBeforeTax: preTaxUnit,
        netUnitInclTax: netUnit,
        preTaxTotal,
        taxAmount,
        rowTotal,
      };
    }
  };

  // overall totals
  const totals = rows.reduce((acc, row) => {
    const isEmpty =
      !row.medicineName &&
      !row.batch &&
      (!row.qty || Number(row.qty) === 0) &&
      (!row.unitPrice || Number(row.unitPrice) === 0);

    if (isEmpty) return acc;

    const vals = computeRowValues(row);
    acc.subtotal += vals.preTaxTotal;
    acc.tax += vals.taxAmount;
    acc.grandTotal += vals.rowTotal;
    return acc;
  }, { subtotal: 0, tax: 0, grandTotal: 0 });

  // --- SEARCH HELPERS ---

  // medicine search
  const searchMedicineForRow = (text, rowIndex) => {
    if (!text || text.length < 2) {
      setMedSearchResults(prev => ({ ...prev, [rowIndex]: [] }));
      setMedActive(prev => ({ ...prev, [rowIndex]: -1 }));
      return;
    }
    const q = text.toLowerCase();
    const filtered = medicineList.filter(m =>
      (m.medicineName || "").toLowerCase().includes(q)
    );
    setMedSearchResults(prev => ({ ...prev, [rowIndex]: filtered }));
    setMedActive(prev => ({ ...prev, [rowIndex]: -1 }));
  };

  // supplier search (client-side, using fetched suppliers)
  const searchSuppliers = (text) => {
    if (!text || text.length < 1) {
      setSupplierSearchResults([]);
      setSupplierActiveIndex(-1);
      return;
    }
    const q = text.toLowerCase();
    const filtered = (suppliers || []).filter(s =>
      (s.name || s.getName || "").toLowerCase().includes(q)
    );
    setSupplierSearchResults(filtered);
    setSupplierActiveIndex(-1);
  };

  // keyboard navigation (medicine batches + general arrow nav)
  const handleKeyNav = (e, rowIndex, colName) => {
    const colIndex = colOrder.indexOf(colName);
    const medListForRow = medSearchResults[rowIndex] || [];
    const batchListForRow = batchResults[rowIndex] || [];

    // medicine dropdown navigation
    if (colName === "medicineName" && medListForRow.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMedActive(prev => {
          const cur = prev[rowIndex] ?? -1;
          const next = cur < medListForRow.length - 1 ? cur + 1 : 0;
          return { ...prev, [rowIndex]: next };
        });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMedActive(prev => {
          const cur = prev[rowIndex] ?? -1;
          const next = cur > 0 ? cur - 1 : medListForRow.length - 1;
          return { ...prev, [rowIndex]: next };
        });
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const active = medActive[rowIndex] ?? -1;
        if (active >= 0 && medListForRow[active]) {
          const m = medListForRow[active];
          setRows(prev => {
            const copy = [...prev];
            copy[rowIndex] = {
              ...copy[rowIndex],
              medicineId: m.medicineId ?? null,
              medicineName: m.medicineName,
              batchOptions: m.batches || [],
              tax: m.tax ?? 5,
              apiTax: true,
            };
            return copy;
          });
          setMedSearchResults(prev => ({ ...prev, [rowIndex]: [] }));
          setMedActive(prev => ({ ...prev, [rowIndex]: -1 }));
          ensureLastRowAlwaysEmpty(rowIndex);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMedSearchResults(prev => ({ ...prev, [rowIndex]: [] }));
        setMedActive(prev => ({ ...prev, [rowIndex]: -1 }));
        return;
      }
      return;
    }

    // batch dropdown navigation
    if (colName === "batch" && batchListForRow.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setBatchActive(prev => {
          const cur = prev[rowIndex] ?? -1;
          const next = cur < batchListForRow.length - 1 ? cur + 1 : 0;
          return { ...prev, [rowIndex]: next };
        });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setBatchActive(prev => {
          const cur = prev[rowIndex] ?? -1;
          const next = cur > 0 ? cur - 1 : batchListForRow.length - 1;
          return { ...prev, [rowIndex]: next };
        });
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const active = batchActive[rowIndex] ?? -1;
        if (active >= 0 && batchListForRow[active]) {
          const b = batchListForRow[active];
          handleRowChange(rowIndex, "batch", b.batchNo);
          handleRowChange(rowIndex, "batchMeta", b);
          if (b.expiry) handleRowChange(rowIndex, "expiry", b.expiry);
          if (b.mrp) handleRowChange(rowIndex, "mrp", b.mrp);
          setBatchResults(prev => ({ ...prev, [rowIndex]: [] }));
          setBatchActive(prev => ({ ...prev, [rowIndex]: -1 }));
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setBatchResults(prev => ({ ...prev, [rowIndex]: [] }));
        setBatchActive(prev => ({ ...prev, [rowIndex]: -1 }));
        return;
      }
      return;
    }

    // normal cell navigation
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextCol = Math.min(colIndex + 1, colOrder.length - 1);
      setActiveField({ row: rowIndex, col: nextCol });
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevCol = Math.max(colIndex - 1, 0);
      setActiveField({ row: rowIndex, col: prevCol });
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextRow = Math.min(rowIndex + 1, rows.length - 1);
      setActiveField({ row: nextRow, col: colIndex });
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevRow = Math.max(rowIndex - 1, 0);
      setActiveField({ row: prevRow, col: colIndex });
      return;
    }
  };

  // suppliers selection handlers (search dropdown)
  const onSupplierInput = (text) => {
    setSupplierName(text);
    setSupplierId("");
    searchSuppliers(text);
  };

  const selectSupplier = (s) => {
    // backend supplier objects might be { id, name, ... }
    const id = s.id ?? s.getId ?? null;
    const name = s.name ?? s.getName ?? s.companyName ?? "";
    setSupplierId(id);
    setSupplierName(name);
    setSupplierSearchResults([]);
    setSupplierActiveIndex(-1);
  };

  // medicine selection via click from dropdown
  const selectMedicineForRow = (rowIndex, m) => {
    setRows(prev => {
      const copy = [...prev];
      copy[rowIndex] = {
        ...copy[rowIndex],
        medicineId: m.medicineId ?? null,
        medicineName: m.medicineName,
        batchOptions: m.batches || [],
        tax: m.tax ?? 5,
        apiTax: true,
      };
      return copy;
    });
    setMedSearchResults(prev => ({ ...prev, [rowIndex]: [] }));
    ensureLastRowAlwaysEmpty(rowIndex);
  };

  // batch selection click
  const selectBatchForRow = (rowIndex, b) => {
    handleRowChange(rowIndex, "batch", b.batchNo);
    handleRowChange(rowIndex, "batchMeta", b);
    if (b.expiry) handleRowChange(rowIndex, "expiry", b.expiry);
    setBatchResults(prev => ({ ...prev, [rowIndex]: [] }));
    ensureLastRowAlwaysEmpty(rowIndex);
  };

  // BUILD PAYLOAD and POST
  const buildPayload = () => {
    const medicinesPayload = rows
      .filter(row => row.medicineName || row.batch || (row.qty && Number(row.qty) > 0) || (row.unitPrice && Number(row.unitPrice) > 0))
      .map(row => {
        const vals = computeRowValues(row);
        return {
          medicine_id: row.medicineId ?? null,
          medicine_name: row.medicineName ?? "",
          batch: row.batch ?? "",
          mrp: row.mrp || "",
          qty: Number(row.qty) || 0,
          unit_price: Number(row.unitPrice) || 0,         // before tax
          net_unit_price: Number(vals.netUnitInclTax) || 0, // after tax
          actual_price: row.actualPrice != null ? Number(row.actualPrice) : null,
          tax: Number(row.tax) || 0,
          expiry: row.expiry || ""
        };
      });

    const payload = {
      purchase_date: date,
      invoice_number: invoiceNumber,
      distributor_id: supplierId || null,
      purchase_type: purchaseType,
      payment_type: paymentType,
      rate_type: rateType === "actual" ? "dummy" : "actual",
      tax_type: taxType,
      medicines: medicinesPayload
    };

    return payload;
  };

  const savePurchase = async () => {
    const payload = buildPayload();
    console.log("Saving purchase payload:", payload);

    try {
      const res = await fetch("http://localhost:8080/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server error: ${res.status} ${text}`);
      }

      const data = await res.json();
      console.log("Saved purchase:", data);
      alert("Purchase saved successfully");
      // optionally clear form or redirect
    } catch (err) {
      console.error("Save failed", err);
      alert("Save failed: " + err.message);
    }
  };

//  <h1 className="text-2xl font-bold mb-4">Enter Purchase</h1>
//         <p className="mb-6 text-gray-700">Fill in the invoice details and add medicine items to the purchase list.</p>
  return (
    <div className="bg-gray-50 min-h-screen p-6 font-sans text-gray-900">
      <div className="mb-6" style={{ height: "40px" }} />
      <main className="bg-white rounded-lg shadow p-6 max-w-7xl mx-auto">


        {/* Invoice + Options */}
        <section className="mb-6 bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-3">Invoice Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 bg-white" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Invoice Number</label>
              <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="e.g., INV-2025-001" className="w-full rounded border border-gray-300 px-3 py-2" />
            </div>

            {/* Supplier search dropdown */}
            <div className="relative">
              <label className="block text-sm font-medium mb-1">Distributor / Supplier</label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => onSupplierInput(e.target.value)}
                placeholder="Search supplier..."
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
              {supplierSearchResults.length > 0 && (
                <div className="absolute z-50 bg-white border border-gray-300 rounded w-full max-h-40 overflow-y-auto shadow">
                  {supplierSearchResults.map((s, idx) => {
                    const name = s.name ?? s.getName ?? s.companyName ?? "";
                    return (
                      <div
                        key={s.id ?? idx}
                        className="px-2 py-1 cursor-pointer hover:bg-gray-200"
                        onClick={() => selectSupplier(s)}
                      >
                        {name}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Purchase options line */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Purchase Type</label>
              <select value={purchaseType} onChange={(e) => setPurchaseType(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                <option value="purchase">Purchase</option>
                <option value="stock_update">Stock Update</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Payment Type</label>
              <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tax Type</label>
              <select value={taxType} onChange={(e) => setTaxType(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                <option value="exclusive">Exclusive</option>
                <option value="inclusive">Inclusive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Rate Type</label>
              <select value={rateType} onChange={(e) => setRateType(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
                <option value="none">Actual</option>
                <option value="actual">Dummy Price</option>
              </select>
            </div>
          </div>
        </section>

        {/* Table */}
        <section>
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Medicine Name</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Batch</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Expiry</th>
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">MRP</th>
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Tax (%)</th>
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Qty</th>
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Unit Price</th>

                {rateType === "actual" && (
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Net Price</th>
                )}

                {taxType === "exclusive" && (
                  <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Net Unit Price</th>
                )}

                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Total Price(₹)</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, i) => {
                const vals = computeRowValues(row);
                const totalPrice = vals.rowTotal.toFixed(2);

                return (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-gray-300 px-3 py-2 relative">
                      <input
                        id={`cell-${i}-medicineName`}
                        type="text"
                        placeholder="Search medicine..."
                        value={row.medicineName}
                        onChange={(e) => {
                          const text = e.target.value;
                          handleRowChange(i, "medicineName", text);
                          handleRowChange(i, "medicineId", null);
                          handleRowChange(i, "apiTax", false);
                          searchMedicineForRow(text, i);
                          ensureLastRowAlwaysEmpty(i);
                        }}
                        onKeyDown={(e) => handleKeyNav(e, i, "medicineName")}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />

                      {medSearchResults[i]?.length > 0 && row.medicineName.length >= 2 && (
                        <div className="absolute z-50 bg-white border border-gray-300 rounded w-full max-h-40 overflow-y-auto shadow">
                          {medSearchResults[i].map((m, idx) => (
                            <div
                              key={m.medicineId ?? idx}
                              className={`px-2 py-1 cursor-pointer ${
                                (medActive[i] ?? -1) === idx ? "bg-blue-100" : "hover:bg-gray-200"
                              }`}
                              onMouseEnter={() => setMedActive(prev => ({ ...prev, [i]: idx }))}
                              onClick={() => selectMedicineForRow(i, m)}
                            >
                              {m.medicineName}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="w-28 border border-gray-300 px-3 py-2 relative">
                      <input
                        id={`cell-${i}-batch`}
                        type="text"
                        placeholder="search.."
                        value={row.batch}
                        onChange={(e) => {
                          const text = e.target.value;
                          handleRowChange(i, "batch", text);

                          const filtered = (row.batchOptions || []).filter(b =>
                            (b.batchNo || "").toLowerCase().includes(text.toLowerCase())
                          );
                          setBatchResults(prev => ({ ...prev, [i]: filtered }));
                          setBatchActive(prev => ({ ...prev, [i]: -1 }));
                          ensureLastRowAlwaysEmpty(i);
                        }}
                        onKeyDown={(e) => handleKeyNav(e, i, "batch")}
                        className="w-full box-border border border-gray-300 rounded px-2 py-1 text-sm"
                      />

                      {batchResults[i]?.length > 0 && (
                        <div className="absolute left-0 z-50 bg-white border border-gray-300 rounded w-[60%] max-h-40 overflow-y-auto shadow">
                          {batchResults[i].map((b, idx) => (
                            <div
                              key={b.batchId ?? idx}
                              className={`px-2 py-1 cursor-pointer ${
                                (batchActive[i] ?? -1) === idx ? "bg-blue-100" : "hover:bg-gray-200"
                              }`}
                              onMouseEnter={() => setBatchActive(prev => ({ ...prev, [i]: idx }))}
                              onClick={() => selectBatchForRow(i, b)}
                            >
                              {b.batchNo} {b.expiry ? ` (exp: ${b.expiry})` : ""}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="w-28 border border-gray-300 p-1 text-left">
                      <input
                        id={`cell-${i}-expiry`}
                        type="text"
                        placeholder="DDMMYYYY"
                        value={row.expiry}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9/-]/g, "");
                          handleRowChange(i, "expiry", v);
                          ensureLastRowAlwaysEmpty(i);
                        }}
                        onKeyDown={(e) => handleKeyNav(e, i, "expiry")}
                        className="w-full box-border border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="w-28 border border-gray-300 px-3 py-2 text-right">
                      <input
                        id={`cell-${i}-mrp`}
                        type="text"
                        inputMode="decimal"
                        placeholder="MRP"
                        value={row.mrp}
                        onChange={(e) => {
                          const v = e.target.value.replace(/,/g, ".");
                          handleRowChange(i, "mrp", v);
                          ensureLastRowAlwaysEmpty(i);
                        }}
                        onKeyDown={(e) => handleKeyNav(e, i, "mrp")}
                        className="w-full box-border border border-gray-300 rounded px-2 py-1 text-sm text-right"
                      />
                    </td>

                    <td className="w-20 border border-gray-300 px-3 py-2 text-right">
                      <input
                        id={`cell-${i}-tax`}
                        type="text"
                        value={row.tax}
                        readOnly={row.apiTax === true}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9.]/g, "");
                          handleRowChange(i, "tax", v === "" ? "" : Number(v));
                          handleRowChange(i, "apiTax", false);
                          ensureLastRowAlwaysEmpty(i);
                        }}
                        onKeyDown={(e) => handleKeyNav(e, i, "tax")}
                        className={`w-full box-border border border-gray-300 rounded px-2 py-1 text-sm text-right ${row.apiTax ? "bg-gray-100" : ""}`}
                      />
                    </td>

                    <td className="w-24 border border-gray-300 px-3 py-2 text-right">
                      <input
                        id={`cell-${i}-qty`}
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={row.qty === 0 ? "" : row.qty}
                        onChange={(e) => {
                          const v = e.target.value.replace(/,/g, ".");
                          handleRowChange(i, "qty", v);
                          ensureLastRowAlwaysEmpty(i);
                        }}
                        onKeyDown={(e) => handleKeyNav(e, i, "qty")}
                        className="w-full box-border border border-gray-300 rounded px-2 py-1 text-sm text-right"
                      />
                    </td>

                    <td className="w-24 box-border border border-gray-300 px-1 py-0 text-right">
                      <input
                        id={`cell-${i}-unitPrice`}
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={row.unitPrice === 0 ? "" : row.unitPrice}
                        onChange={(e) => {
                          const v = e.target.value.replace(/,/g, ".");
                          handleRowChange(i, "unitPrice", v);
                          ensureLastRowAlwaysEmpty(i);
                        }}
                        onKeyDown={(e) => handleKeyNav(e, i, "unitPrice")}
                        className="w-full box-border border border-gray-300 rounded px-2 py-1 text-sm text-right"
                      />
                    </td>

                    {rateType === "actual" && (
                      <td className="w-28 border border-gray-300 px-3 py-2 text-right">
                        <input
                          id={`cell-${i}-actualPrice`}
                          type="text"
                          inputMode="decimal"
                          placeholder="Actual"
                          value={row.actualPrice == null ? "" : row.actualPrice}
                          onChange={(e) => {
                            const v = e.target.value.replace(/,/g, ".");
                            handleRowChange(i, "actualPrice", v === "" ? null : Number(v));
                            ensureLastRowAlwaysEmpty(i);
                          }}
                          className="w-full box-border border border-gray-300 rounded px-2 py-1 text-sm text-right"
                        />
                      </td>
                    )}

                    {taxType === "exclusive" && (
                      <td className="w-28 border border-gray-300 px-3 py-2 text-right font-medium">
                        {Number(vals.netUnitInclTax).toFixed(2)}
                      </td>
                    )}

                    <td className="w-28 border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">
                      {totalPrice}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <button type="button" onClick={addAnotherItem} className="mt-3 text-blue-600 font-semibold text-sm hover:underline">
            + Add another item
          </button>
        </section>

        {/* totals */}
        <section className="mt-6 bg-gray-100 p-4 rounded flex justify-between items-center text-sm font-medium text-gray-700">
          <div className="space-x-2"></div>
          <div className="text-right">
            <div>Subtotal <span className="font-semibold">₹{totals.subtotal.toFixed(2)}</span></div>
            <div>Tax <span className="font-semibold">₹{totals.tax.toFixed(2)}</span></div>
            <div className="text-lg font-bold text-blue-600">Grand Total ₹{totals.grandTotal.toFixed(2)}</div>
          </div>
        </section>

        {/* actions */}
        <section className="mt-6 flex justify-end space-x-4">
          <button onClick={() => {if (!window.confirm("Are you sure?"))  { /* reset if required */ }}} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100">Cancel</button>
          <button onClick={savePurchase} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Purchase</button>
        </section>
      </main>
    </div>
  );
}
