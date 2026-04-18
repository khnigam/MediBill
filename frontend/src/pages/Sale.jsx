import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getAllCustomers,
  getMedicinesForSearch,
  getSaleDetails,
  getSalesList,
  saveSale,
  updateSale,
} from "../api";

const paymentMethods = ["Cash", "Card", "UPI", "Net Banking"];

const emptyRow = {
  medicineId: null,
  medicineName: "",
  batch: "",
  batchOptions: [],
  qty: "",
  unitPrice: "",
  discountPercent: "",
  taxPercent: 5,
};

const DEFAULT_ROW_COUNT = 8;
const buildInitialRows = (discountPercent = 0) =>
  Array.from({ length: DEFAULT_ROW_COUNT }, () => ({ ...emptyRow, discountPercent }));

export default function EnterSalePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const saleId = searchParams.get("saleId");
  const mode = searchParams.get("mode") || "create";
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit" && !!saleId;

  const [date, setDate] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [customer, setCustomer] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerActiveIndex, setCustomerActiveIndex] = useState(-1);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [rows, setRows] = useState(buildInitialRows(0));
  const [medicines, setMedicines] = useState([]);
  const [medicineResults, setMedicineResults] = useState({});
  const [medicineActiveIndex, setMedicineActiveIndex] = useState({});
  const [batchResults, setBatchResults] = useState({});
  const [batchActiveIndex, setBatchActiveIndex] = useState({});
  const [discountMode, setDiscountMode] = useState("tax"); // "tax" | "custom" | "zero"
  const [saleType, setSaleType] = useState("sale"); // "sale" | "stock_issue"
  const [defaultDiscountPercent, setDefaultDiscountPercent] = useState("");
  const [showDiscountSetup, setShowDiscountSetup] = useState(true);
  const [hideBatchColumn, setHideBatchColumn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    Object.entries(batchActiveIndex).forEach(([rowKey, activeIdx]) => {
      const rowIndex = Number(rowKey);
      if (Number.isNaN(rowIndex) || activeIdx == null || activeIdx < 0) return;
      const el = document.getElementById(`batch-option-${rowIndex}-${activeIdx}`);
      if (el) {
        el.scrollIntoView({ block: "nearest" });
      }
    });
  }, [batchActiveIndex, batchResults]);

  useEffect(() => {
    if (customerActiveIndex == null || customerActiveIndex < 0) return;
    const el = document.getElementById(`customer-option-${customerActiveIndex}`);
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [customerActiveIndex, showCustomerDropdown, customers]);

  useEffect(() => {
    let mounted = true;
    if (!saleId) {
      setDate(new Date().toISOString().slice(0, 10));
    }

    getSalesList()
      .then((sales) => {
        if (!mounted) return;
        if (saleId) return;
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

  useEffect(() => {
    if (!saleId) {
      setInitialLoadDone(true);
      return;
    }
    if (initialLoadDone) return;
    let mounted = true;
    getSaleDetails(saleId)
      .then((details) => {
        if (!mounted || !details) return;
        setDate(details.date || "");
        setBillNumber(details.invoiceNumber || "");
        setCustomerSearch(details.customerName || "");
        setCustomer(details.customerName || "");
        setSelectedCustomerId(details.customerId ?? null);
        setSaleType(details.saleType || "sale");
        setShowDiscountSetup(false);
        const mappedRows = (details.items || []).map((it) => {
          const med = medicines.find((m) => Number(m.medicineId) === Number(it.medicineId));
          return {
            ...emptyRow,
            medicineId: it.medicineId ?? null,
            medicineName: it.medicineName || "",
            batch: it.batchName || "",
            batchOptions: Array.isArray(med?.batches) ? med.batches : [],
            qty: it.quantity ?? "",
            unitPrice: it.price ?? "",
            taxPercent: it.taxPercent ?? 5,
            discountPercent: it.discountPercent ?? "",
          };
        });
        setRows(mappedRows.length ? mappedRows : [{ ...emptyRow }]);
      })
      .catch((err) => {
        alert(err?.message || "Failed to load sale details.");
      })
      .finally(() => {
        if (!mounted) return;
        setInitialLoadDone(true);
      });
    return () => {
      mounted = false;
    };
  }, [saleId, medicines, initialLoadDone]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => (c?.id ?? null) === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const getEffectiveDiscountPercent = (row) => {
    if (discountMode === "custom") return Number(row.discountPercent || 0);
    if (discountMode === "zero") return 0;
    return Number(row.taxPercent || 5);
  };

  const getPricingBreakdown = (row) => {
    const qty = Number(row.qty || 0);
    const unitPrice = Number(row.unitPrice || 0);
    const gross = qty * unitPrice;
    const taxPercent = Number(row.taxPercent || 5);
    const includedTaxAmount = taxPercent > 0 ? gross * (taxPercent / (100 + taxPercent)) : 0;
    const discountPercent = getEffectiveDiscountPercent(row);
    const discountAmount =
      discountMode === "tax"
        ? includedTaxAmount
        : discountMode === "custom"
          ? gross * (discountPercent / 100)
          : 0;
    const net = gross - discountAmount;
    const taxAmount = discountMode === "custom" ? net * (taxPercent / 100) : includedTaxAmount;
    const lineTotal = discountMode === "custom" ? net + taxAmount : gross;
    return { qty, unitPrice, gross, taxPercent, includedTaxAmount, discountPercent, discountAmount, net, taxAmount, lineTotal };
  };

  const handleRowChange = (index, field, value) => {
    const newRows = [...rows];
    if (field === "qty" || field === "unitPrice" || field === "discountPercent" || field === "taxPercent") {
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
        discountPercent:
          discountMode === "custom"
            ? (defaultDiscountPercent === "" ? "" : Number(defaultDiscountPercent))
            : discountMode === "zero"
              ? 0
              : 5,
      },
    ]);

  const removeRow = (index) => {
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows.length ? newRows : [{ ...emptyRow }]);
  };

  const totals = rows.reduce(
    (acc, r) => {
      const breakdown = getPricingBreakdown(r);
      acc.totalPrice += breakdown.gross;
      acc.totalDiscount += breakdown.discountAmount;
      acc.taxAmount += breakdown.taxAmount;
      acc.taxableAmount += breakdown.net;
      return acc;
    },
    { totalPrice: 0, totalDiscount: 0, taxAmount: 0, taxableAmount: 0 }
  );

  const tax = totals.taxAmount;
  const subtotal = totals.taxableAmount;
  const grandTotal = subtotal + tax;

  const applyDefaultDiscount = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        discountPercent:
          discountMode === "custom"
            ? (defaultDiscountPercent === "" ? "" : Number(defaultDiscountPercent))
            : discountMode === "zero"
              ? 0
              : Number(r.taxPercent || 5),
      }))
    );
    setShowDiscountSetup(false);
  };

  const moveFocus = (currentEl, direction = 1) => {
    const focusables = Array.from(
      document.querySelectorAll('input[data-nav="sale"], select[data-nav="sale"]')
    ).filter(
      (el) =>
        !el.disabled &&
        el.offsetParent !== null &&
        (!el.readOnly || el.dataset.navReadonly === "true")
    );

    const idx = focusables.indexOf(currentEl);
    if (idx < 0) return;
    const next = focusables[idx + direction];
    if (next) next.focus();
  };

  const moveFocusByRow = (currentEl, direction = 1) => {
    const row = Number(currentEl?.dataset?.navRow);
    const col = Number(currentEl?.dataset?.navCol);
    if (Number.isNaN(row) || Number.isNaN(col)) return;
    const target = document.querySelector(
      `[data-nav="sale"][data-nav-row="${row + direction}"][data-nav-col="${col}"]`
    );
    if (
      target &&
      !target.disabled &&
      target.offsetParent !== null &&
      (!target.readOnly || target.dataset.navReadonly === "true")
    ) {
      target.focus();
    }
  };

  const handleNavKeyDown = (e) => {
    if (e.defaultPrevented) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      moveFocus(e.currentTarget, 1);
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveFocus(e.currentTarget, -1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocusByRow(e.currentTarget, 1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocusByRow(e.currentTarget, -1);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      moveFocus(e.currentTarget, e.shiftKey ? -1 : 1);
    }
  };

  const searchableCustomerOptions = useMemo(() => {
    const q = (customerSearch || "")
      .toLowerCase()
      .replace(/[(),]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!q) return customers.slice(0, 50);
    const qTokens = q.split(" ").filter(Boolean);
    return customers
      .filter((c) => {
        const owner = (c.ownerName || c.name || "").toLowerCase();
        const addr = (c.address || "").toLowerCase();
        const name = (c.name || "").toLowerCase();
        const combined = `${owner} ${addr} ${name}`.replace(/\s+/g, " ").trim();
        return qTokens.every((token) => combined.includes(token));
      })
      .slice(0, 50);
  }, [customers, customerSearch]);

  const formatCustomerOption = (c) => {
    const owner = c.ownerName || c.name || "Unknown";
    const addr = c.address || "No address";
    return `${owner} (${addr})`;
  };

  const getCustomerIdKey = (value) => String(value ?? "");

  const selectCustomer = (c) => {
    const owner = c.ownerName || c.name || "";
    setCustomer(owner);
    setCustomerSearch(formatCustomerOption(c));
    setSelectedCustomerId(c?.id ?? null);
    setShowCustomerDropdown(false);
    setCustomerActiveIndex(-1);
  };

  const openCustomerDropdown = () => {
    setShowCustomerDropdown(true);
    if (searchableCustomerOptions.length === 0) {
      setCustomerSearch("");
      setCustomerActiveIndex(customers.length > 0 ? 0 : -1);
      return;
    }
    const selectedIndex = searchableCustomerOptions.findIndex(
      (c) => getCustomerIdKey(c?.id) === getCustomerIdKey(selectedCustomerId)
    );
    setCustomerActiveIndex(selectedIndex >= 0 ? selectedIndex : searchableCustomerOptions.length > 0 ? 0 : -1);
  };

  const handleCustomerKeyDown = (e) => {
    const options = searchableCustomerOptions;
    if (!showCustomerDropdown) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        openCustomerDropdown();
      }
      return;
    }
    if (!options.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCustomerActiveIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCustomerActiveIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const selected = options[customerActiveIndex >= 0 ? customerActiveIndex : 0];
      if (selected) selectCustomer(selected);
    }
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

    const appliedTaxPercent = Number(med?.gst ?? highestQtyBatch?.gst ?? 5);
    setRows((prev) => {
      const copy = [...prev];
      copy[rowIndex] = {
        ...copy[rowIndex],
        medicineId: med.medicineId ?? null,
        medicineName: med.medicineName || "",
        batchOptions: options,
        batch: highestQtyBatch?.batchNo || "",
        taxPercent: appliedTaxPercent,
        discountPercent:
          discountMode === "custom"
            ? copy[rowIndex].discountPercent
            : discountMode === "zero"
              ? 0
              : appliedTaxPercent,
      };
      return copy;
    });
    setMedicineResults((prev) => ({ ...prev, [rowIndex]: [] }));
    setMedicineActiveIndex((prev) => ({ ...prev, [rowIndex]: -1 }));
    setBatchResults((prev) => ({ ...prev, [rowIndex]: [] }));
    setBatchActiveIndex((prev) => ({ ...prev, [rowIndex]: -1 }));
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
      setBatchActiveIndex((prev) => ({ ...prev, [rowIndex]: -1 }));
      return;
    }
    if (text === "__ALL__") {
      const selectedBatchNo = rows[rowIndex]?.batch || "";
      const selectedIndex = options.findIndex((b) => (b.batchNo || "") === selectedBatchNo);
      setBatchResults((prev) => ({ ...prev, [rowIndex]: options.slice(0, 20) }));
      setBatchActiveIndex((prev) => ({
        ...prev,
        [rowIndex]: selectedIndex >= 0 ? Math.min(selectedIndex, 19) : 0,
      }));
      return;
    }
    const q = (text || "").toLowerCase();
    const filtered = options.filter((b) => (b.batchNo || "").toLowerCase().includes(q));
    setBatchResults((prev) => ({ ...prev, [rowIndex]: filtered.slice(0, 20) }));
    setBatchActiveIndex((prev) => ({ ...prev, [rowIndex]: -1 }));
  };

  const selectBatchForRow = (rowIndex, b) => {
    setRows((prev) => {
      const copy = [...prev];
      const medicineTax = Number(copy[rowIndex]?.taxPercent ?? 5);
      copy[rowIndex] = {
        ...copy[rowIndex],
        batch: b.batchNo || "",
        taxPercent: medicineTax,
        discountPercent:
          discountMode === "custom"
            ? copy[rowIndex].discountPercent
            : discountMode === "zero"
              ? 0
              : medicineTax,
      };
      return copy;
    });
    setBatchResults((prev) => ({ ...prev, [rowIndex]: [] }));
    setBatchActiveIndex((prev) => ({ ...prev, [rowIndex]: -1 }));
  };

  const handleBatchKeyDown = (e, rowIndex) => {
    const list = batchResults[rowIndex] || [];
    if (!list.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setBatchActiveIndex((prev) => {
        const cur = prev[rowIndex] ?? -1;
        const next = cur < list.length - 1 ? cur + 1 : 0;
        return { ...prev, [rowIndex]: next };
      });
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setBatchActiveIndex((prev) => {
        const cur = prev[rowIndex] ?? -1;
        const next = cur > 0 ? cur - 1 : list.length - 1;
        return { ...prev, [rowIndex]: next };
      });
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const active = batchActiveIndex[rowIndex] ?? -1;
      const selected = active >= 0 ? list[active] : list[0];
      if (selected) selectBatchForRow(rowIndex, selected);
    }
  };

  const handleSaveSale = async () => {
    const customerNameForSave = (
      selectedCustomer
        ? (selectedCustomer.ownerName || selectedCustomer.name || "")
        : (customerSearch || customer || "")
    ).trim();
    const licenseNumber = (selectedCustomer?.licenseNumber || "").trim();
    let effectiveSaleType = saleType;

    if (
      saleType === "sale" &&
      customerNameForSave &&
      !licenseNumber
    ) {
      const continueAsStockIssue = window.confirm(
        "Selected customer has no license details. Press OK to continue as Stock Issue, or Cancel to review customer details."
      );
      if (!continueAsStockIssue) return;
      effectiveSaleType = "stock_issue";
      setSaleType("stock_issue");
    }

    const cleanedItems = rows
      .map((r) => {
        const breakdown = getPricingBreakdown(r);
        const selectedBatch = (r.batchOptions || []).find((b) => (b.batchNo || "") === (r.batch || ""));
        return {
          medicineId: r.medicineId ?? null,
          medicineName: r.medicineName,
          batchId: selectedBatch?.batchId ?? null,
          batch: r.batch,
          batchName: r.batch,
          quantity: Number(r.qty || 0),
          mrp: Number(selectedBatch?.mrp ?? 0),
          expiryDate: selectedBatch?.expiryDate ?? null,
          unitPrice: Number(r.unitPrice || 0),
          taxPercent: Number(r.taxPercent || 5),
          taxAmount: Number(breakdown.taxAmount || 0),
          discountPercent: getEffectiveDiscountPercent(r),
          discountAmount: Number(breakdown.discountAmount || 0),
          netPrice: Number(breakdown.net || 0),
          lineTotal: Number(breakdown.lineTotal || 0),
        };
      })
      .filter((r) => r.medicineId && r.quantity > 0 && r.unitPrice > 0);

    if (!date) {
      alert("Please select sale date.");
      return;
    }
    if (!billNumber) {
      alert("Invoice number is required.");
      return;
    }
    if (cleanedItems.length === 0) {
      alert("Please add at least one valid medicine row.");
      return;
    }
    if (!hideBatchColumn && cleanedItems.some((x) => !x.batch)) {
      alert("Please select batch in each row.");
      return;
    }

    try {
      setSaving(true);
      if (isEditMode) {
        await updateSale(saleId, {
          date,
          invoiceNumber: billNumber,
          customerId: selectedCustomerId,
          customerName: customerNameForSave,
          saleType: effectiveSaleType,
          paymentMethod,
          hideBatchField: hideBatchColumn,
          discountMode,
          items: cleanedItems,
        });
      } else {
        await saveSale({
          date,
          invoiceNumber: billNumber,
          customerId: selectedCustomerId,
          customerName: customerNameForSave,
          saleType: effectiveSaleType,
          paymentMethod,
          hideBatchField: hideBatchColumn,
          discountMode,
          items: cleanedItems,
        });
      }
      alert(isEditMode ? "Sale updated successfully." : "Sale saved successfully.");
      if (!isEditMode) {
        const match = String(billNumber).match(/^UJJ(\d+)$/i);
        const next = (match ? Number(match[1]) : 0) + 1;
        setBillNumber(`UJJ${String(next).padStart(2, "0")}`);
        setRows(buildInitialRows(discountMode === "custom" ? Number(defaultDiscountPercent || 0) : 0));
      }
    } catch (error) {
      alert(error?.message || "Failed to save sale.");
    } finally {
      setSaving(false);
    }
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
    <div className="font-sans text-gray-900">
      <main className="mx-auto max-w-7xl rounded-lg bg-white p-6 shadow">
        <h1 className="text-2xl font-bold mb-4">
          {isViewMode ? "View Sale" : isEditMode ? "Edit Sale" : "Enter Sale"}
        </h1>
        <p className="mb-6 text-gray-700">
          {isViewMode
            ? "View sales bill details."
            : isEditMode
              ? "Edit saved sales bill and update stock accordingly."
              : "Create a sales bill by adding medicine items below."}
        </p>
        {!initialLoadDone && <p className="mb-4 text-sm text-gray-500">Loading sale details...</p>}

        <fieldset disabled={isViewMode} className={isViewMode ? "opacity-95" : ""}>

        {showDiscountSetup && (
          <section className="mb-6 bg-green-50 border border-green-200 p-4 rounded">
            <h2 className="font-semibold mb-2">Initial Sale Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
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
                    <option value="zero">Zero Discount</option>
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
                    placeholder={discountMode === "custom" ? "e.g. 7.5" : "Auto"}
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
                <label className="block text-sm font-medium mb-1" htmlFor="saleType">
                  Sale Type
                </label>
                <select
                  id="saleType"
                  value={saleType}
                  onChange={(e) => setSaleType(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 bg-white"
                >
                  <option value="sale">Sale</option>
                  <option value="stock_issue">Stock Issue</option>
                </select>
              </div>
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
                data-nav-readonly="true"
                onKeyDown={(e) => {
                  handleCustomerKeyDown(e);
                  handleNavKeyDown(e);
                }}
                id="customer"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setCustomer("");
                  setSelectedCustomerId(null);
                  setShowCustomerDropdown(true);
                  setCustomerActiveIndex(0);
                }}
                onFocus={openCustomerDropdown}
                onClick={openCustomerDropdown}
                onBlur={() =>
                  setTimeout(() => {
                    setShowCustomerDropdown(false);
                    setCustomerActiveIndex(-1);
                  }, 180)
                }
                placeholder="Search customer..."
                className="w-full rounded border border-gray-300 px-3 py-2 bg-white"
              />
              {showCustomerDropdown && searchableCustomerOptions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded border border-gray-300 bg-white shadow">
                  {searchableCustomerOptions.map((c, idx) => (
                    <button
                      id={`customer-option-${idx}`}
                      key={c.id ?? `${c.name}-${c.address}`}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectCustomer(c);
                      }}
                      onMouseEnter={() =>
                        setCustomerActiveIndex(
                          searchableCustomerOptions.findIndex(
                            (x) => getCustomerIdKey(x.id) === getCustomerIdKey(c.id)
                          )
                        )
                      }
                      className={`block w-full text-left px-3 py-2 ${
                        getCustomerIdKey(searchableCustomerOptions[customerActiveIndex]?.id) === getCustomerIdKey(c.id)
                          ? "bg-blue-100"
                          : "hover:bg-gray-100"
                      }`}
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
                const breakdown = getPricingBreakdown(row);
                const total = breakdown.lineTotal.toFixed(2);
                const colMedicine = 0;
                const colBatch = hideBatchColumn ? null : 1;
                const colQty = hideBatchColumn ? 1 : 2;
                const colUnit = hideBatchColumn ? 2 : 3;
                const colDiscount = discountMode === "custom" ? (hideBatchColumn ? 3 : 4) : null;
                return (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-gray-300 px-3 py-2 relative">
                      <input
                        data-nav="sale"
                        data-nav-row={i}
                        data-nav-col={colMedicine}
                        onKeyDown={(e) => {
                          handleMedicineKeyDown(e, i);
                          handleNavKeyDown(e);
                        }}
                        type="text"
                        placeholder="Search medicine..."
                        value={row.medicineName}
                        onChange={(e) => {
                          setRows((prev) => {
                            const copy = [...prev];
                            copy[i] = {
                              ...copy[i],
                              medicineName: e.target.value,
                              medicineId: null,
                              batch: "",
                              batchOptions: [],
                            };
                            return copy;
                          });
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
                          data-nav-readonly="true"
                          data-nav-row={i}
                          data-nav-col={colBatch}
                          onKeyDown={(e) => {
                            handleBatchKeyDown(e, i);
                            handleNavKeyDown(e);
                          }}
                          type="text"
                          value={row.batch}
                          readOnly
                          onFocus={() => searchBatchForRow("__ALL__", i)}
                          onClick={() => searchBatchForRow("__ALL__", i)}
                          onBlur={() =>
                            setTimeout(() => {
                              setBatchResults((prev) => ({ ...prev, [i]: [] }));
                              setBatchActiveIndex((prev) => ({ ...prev, [i]: -1 }));
                            }, 120)
                          }
                          placeholder={
                            (row.batchOptions || []).length > 0
                              ? "Select batch..."
                              : "Select medicine first"
                          }
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white cursor-pointer"
                        />
                        {(row.batchOptions || []).length > 0 && batchResults[i]?.length > 0 && (
                          <div className="absolute z-20 mt-1 w-[95%] max-h-40 overflow-auto rounded border border-gray-300 bg-white shadow">
                            {batchResults[i].map((b, idx) => (
                              <button
                                id={`batch-option-${i}-${idx}`}
                                key={b.batchId ?? idx}
                                type="button"
                                onMouseDown={() => selectBatchForRow(i, b)}
                                onMouseEnter={() =>
                                  setBatchActiveIndex((prev) => ({ ...prev, [i]: idx }))
                                }
                                className={`block w-full text-left px-3 py-2 text-sm ${
                                  (batchActiveIndex[i] ?? -1) === idx
                                    ? "bg-blue-100"
                                    : "hover:bg-gray-100"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{b.batchNo}</span>
                                  <span className="text-xs text-gray-500">
                                    Qty: {Number(b.quantity ?? 0)} | MRP: ₹{Number(b.mrp ?? 0).toFixed(2)}
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
                        data-nav-row={i}
                        data-nav-col={colQty}
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
                        data-nav-row={i}
                        data-nav-col={colUnit}
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
                          data-nav-row={i}
                          data-nav-col={colDiscount}
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
            <div>Total Price <span className="font-semibold">₹{totals.totalPrice.toFixed(2)}</span></div>
            <div>Total Discount <span className="font-semibold">₹{totals.totalDiscount.toFixed(2)}</span></div>
            <div>Subtotal <span className="font-semibold">₹{subtotal.toFixed(2)}</span></div>
            <div>
              Tax (
              {discountMode === "tax"
                ? "Matched as discount %"
                : discountMode === "zero"
                  ? "Included in unit price"
                  : "Medicine-wise GST"}
              ) <span className="font-semibold">₹{tax.toFixed(2)}</span>
            </div>
            <div className="text-lg font-bold text-green-600">Grand Total ₹{grandTotal.toFixed(2)}</div>
          </div>
        </section>

        </fieldset>

        <section className="mt-6 flex justify-end space-x-4">
          <button
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            onClick={() => navigate("/sales")}
          >
            {isViewMode ? "Back to Sales" : "Cancel"}
          </button>
          {!isViewMode && (
            <button
              className={`px-4 py-2 text-white rounded ${saving ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}
              onClick={handleSaveSale}
              disabled={saving}
            >
              {saving ? "Saving..." : isEditMode ? "Update Sale" : "Save Sale"}
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
