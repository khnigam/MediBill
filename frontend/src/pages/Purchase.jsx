import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getPurchaseDetails, updatePurchase } from "../api";
import BillCsvImportPanel from "../components/BillCsvImportPanel";

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

function SupplierDropdown({
  supplierName,
  onSupplierInput,
  supplierSearchResults,
  selectSupplier,
  isViewMode
}) {
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Reset highlight when options change or dropdown closes
  useEffect(() => {
    setHighlightedIndex(supplierSearchResults.length > 0 ? 0 : -1);
  }, [supplierSearchResults.length]);

  // Handle blur to close highlight
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-1">Distributor / Supplier</label>
      <input
        ref={inputRef}
        type="text"
        value={supplierName}
        onChange={(e) => {
          onSupplierInput(e.target.value);
          setHighlightedIndex(0);
        }}
        placeholder="Search supplier..."
        className="w-full rounded border border-gray-300 px-3 py-2"
        onKeyDown={(e) => {
          if (!supplierSearchResults.length) return;

          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((i) =>
              i < supplierSearchResults.length - 1 ? i + 1 : 0
            );
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((i) =>
              i > 0 ? i - 1 : supplierSearchResults.length - 1
            );
          } else if (e.key === "Enter") {
            if (
              highlightedIndex >= 0 &&
              highlightedIndex < supplierSearchResults.length
            ) {
              selectSupplier(supplierSearchResults[highlightedIndex]);
            }
          }
        }}
        autoComplete="off"
        disabled={isViewMode}
      />
      {supplierSearchResults.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 bg-white border border-gray-300 rounded w-full max-h-40 overflow-y-auto shadow"
        >
          {supplierSearchResults.map((s, idx) => {
            const name = s.name ?? s.getName ?? s.companyName ?? "";
            const highlight = idx === highlightedIndex;
            return (
              <div
                key={s.id ?? idx}
                className={`px-2 py-1 cursor-pointer ${
                  highlight ? "bg-blue-100" : "hover:bg-gray-200"
                }`}
                style={{
                  backgroundColor: highlight ? "#DBEAFE" : undefined,
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onMouseDown={() => selectSupplier(s)}
              >
                {name}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Normalize line expiry for the API: ISO kept; compact DDMMYYYY → yyyy-MM-dd; dd/mm/yyyy → ISO. */
function expiryForApi(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{8}$/.test(s)) {
    const dd = s.slice(0, 2);
    const mm = s.slice(2, 4);
    const yyyy = s.slice(4, 8);
    return `${yyyy}-${mm}-${dd}`;
  }
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    return `${m[3]}-${mm}-${dd}`;
  }
  return s;
}

export default function EnterPurchasePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const purchaseId = searchParams.get("purchaseId");
  const mode = searchParams.get("mode") || "create";
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit" && !!purchaseId;
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

  // create 2 empty rows by default
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
  const [rateType, setRateType] = useState("none"); // "actual" or "none" or "dummy"

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

  useEffect(() => {
    if (!purchaseId) return;
    let mounted = true;

    const toDdMmYyyy = (dateStr) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return "";
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}${mm}${yyyy}`;
    };

    getPurchaseDetails(purchaseId)
      .then((details) => {
        if (!mounted || !details) return;
        setDate(details.purchaseDate || "");
        setInvoiceNumber(details.invoiceNo || "");
        setSupplierId(details.supplierId || "");
        setSupplierName(details.supplierName || "");
        setPaymentType(details.paymentType || "cash");
        setPurchaseType(details.purchaseType || "purchase");
        setTaxType(details.taxType || "exclusive");
        setRateType(details.rateType || "none");

        const mappedRows = (details.items || []).map((it) => ({
          ...emptyRowTemplate,
          medicineId: it.medicineId || null,
          medicineName: it.medicineName || "",
          batch: it.batchNo || "",
          qty: it.quantity ?? "",
          unitPrice: it.unitPrice ?? 0,
          tax: it.taxPercent ?? 5,
          mrp: it.mrp ?? "",
          expiry: toDdMmYyyy(it.expiry),
          apiTax: false,
        }));
        setRows(mappedRows.length ? mappedRows : [{ ...emptyRowTemplate }]);
      })
      .catch((err) => {
        console.error("Failed to load purchase details", err);
      });

    return () => {
      mounted = false;
    };
  }, [purchaseId]);

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
          expiry: expiryForApi(row.expiry),
        };
      });

    const distributorId =
      supplierId !== "" && supplierId != null ? Number(supplierId) : null;
    const payload = {
      purchase_date: date,
      invoice_number: invoiceNumber,
      distributor_id: Number.isFinite(distributorId) ? distributorId : null,
      purchase_type: purchaseType,
      payment_type: paymentType,
      rate_type: rateType,
      tax_type: taxType,
      medicines: medicinesPayload
    };

    return payload;
  };

  const savePurchase = async () => {
    if (isViewMode) return;
    const distributorId =
      supplierId !== "" && supplierId != null ? Number(supplierId) : null;
    if (distributorId == null || Number.isNaN(distributorId)) {
      window.alert(
        "Please select a distributor/supplier: type to search, then click a name in the list before saving."
      );
      return;
    }

    const payload = buildPayload();
    console.log("Saving purchase payload:", payload);

    try {
      if (isEditMode) {
        const updatePayload = {
          purchaseDate: date,
          invoiceNo: invoiceNumber,
          supplierId: supplierId || null,
          distributor_id: supplierId || null,
          paymentType,
          purchaseType,
          purchase_type: purchaseType,
          taxType,
          tax_type: taxType,
          rateType,
          rate_type: rateType,
          items: rows
            .filter(row => row.medicineName || row.batch || (row.qty && Number(row.qty) > 0) || (row.unitPrice && Number(row.unitPrice) > 0))
            .map((row) => {
              const vals = computeRowValues(row);
              return {
                medicineId: row.medicineId ?? null,
                medicineName: row.medicineName ?? "",
                batchNo: row.batch ?? "",
                quantity: Number(row.qty) || 0,
                unitPrice: Number(row.unitPrice) || 0,
                netUnitPrice: Number(vals.netUnitInclTax) || 0,
                taxPercent: Number(row.tax) || 0,
                mrp: row.mrp || "",
                expiry: expiryForApi(row.expiry),
              };
            }),
        };
        await updatePurchase(purchaseId, updatePayload);
        alert("Purchase updated successfully");
      } else {
        const res = await fetch("http://localhost:8080/api/purchases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Server error: ${res.status} ${text}`);
        }
        await res.json();
        alert("Purchase saved successfully");
      }

      navigate("/purchases");
    } catch (err) {
      console.error("Save failed", err);
      alert("Save failed: " + err.message);
    }
  };

  return (
    <div className="font-sans text-gray-900">
      <main className="mx-auto max-w-7xl rounded-lg bg-white p-6 shadow">
        <fieldset disabled={isViewMode} className={isViewMode ? "opacity-95" : ""}>
          {/* Invoice + Options */}
          <section className="mb-6 bg-gray-100 p-4 rounded">
            <h2 className="font-semibold mb-3">Invoice Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 bg-white"
                  disabled={isViewMode}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g., INV-2025-001"
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  disabled={isViewMode}
                />
              </div>

              {/* Supplier search dropdown with keyboard navigation - now extracted */}
              <SupplierDropdown
                supplierName={supplierName}
                onSupplierInput={onSupplierInput}
                supplierSearchResults={supplierSearchResults}
                selectSupplier={selectSupplier}
                isViewMode={isViewMode}
              />
            </div>

            {/* Purchase options line */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Purchase Type</label>
                <select
                  value={purchaseType}
                  onChange={(e) => setPurchaseType(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  disabled={isViewMode}
                >
                  <option value="purchase">Purchase</option>
                  <option value="stock_update">Stock Update</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Payment Type</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  disabled={isViewMode}
                >
                  <option value="cash">Cash</option>
                  <option value="credit">Credit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tax Type</label>
                <select
                  value={taxType}
                  onChange={(e) => setTaxType(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  disabled={isViewMode}
                >
                  <option value="exclusive">Exclusive</option>
                  <option value="inclusive">Inclusive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Rate Type</label>
                <select
                  value={rateType}
                  onChange={(e) => setRateType(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  disabled={isViewMode}
                >
                  <option value="none">Net Unit Price</option>
                  <option value="actual">Actual Price</option>
                  <option value="dummy">Dummy Price</option>
                </select>
              </div>
            </div>
          </section>

          {!isViewMode && (
            <BillCsvImportPanel
              medicineList={medicineList}
              disabled={isViewMode}
              emptyRowTemplate={emptyRowTemplate}
              onApply={(built) => {
                setRows([...built, { ...emptyRowTemplate }]);
                setMedSearchResults({});
                setMedActive({});
                setBatchResults({});
                setBatchActive({});
              }}
            />
          )}

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
                  {(rateType === "dummy") && (
                    <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Actual Price</th>
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
                          disabled={isViewMode}
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
                          disabled={isViewMode}
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
                          placeholder="DDMMYYYY or yyyy-mm-dd"
                          value={row.expiry}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^0-9/-]/g, "");
                            handleRowChange(i, "expiry", v);
                            ensureLastRowAlwaysEmpty(i);
                          }}
                          onKeyDown={(e) => handleKeyNav(e, i, "expiry")}
                          className="w-full box-border border border-gray-300 rounded px-2 py-1 text-sm"
                          disabled={isViewMode}
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
                          disabled={isViewMode}
                        />
                      </td>

                      <td className="w-20 border border-gray-300 px-3 py-2 text-right">
                        <input
                          id={`cell-${i}-tax`}
                          type="text"
                          value={row.tax}
                          readOnly={row.apiTax === true || isViewMode}
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
                          disabled={isViewMode}
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
                          disabled={isViewMode}
                        />
                      </td>

                      {(rateType === "dummy") && (
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
                            disabled={isViewMode}
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

            {!isViewMode && (
              <button
                type="button"
                onClick={addAnotherItem}
                className="mt-3 text-blue-600 font-semibold text-sm hover:underline"
              >
                + Add another item
              </button>
            )}
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
        </fieldset>

        {/* actions */}
        <section className="mt-6 flex justify-end space-x-4">
          <button
            onClick={() => navigate("/purchases")}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            Back
          </button>
          {!isViewMode && (
            <button onClick={savePurchase} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              {isEditMode ? "Update Purchase" : "Save Purchase"}
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
