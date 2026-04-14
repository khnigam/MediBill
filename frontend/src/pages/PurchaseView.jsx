import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPurchaseDetails } from "../api";

export default function PurchaseView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getPurchaseDetails(id)
      .then((data) => {
        if (!mounted) return;
        setDetails(data);
      })
      .catch(() => {
        if (!mounted) return;
        setDetails(null);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  const totals = useMemo(() => {
    const items = details?.items || [];
    const subtotal = items.reduce((acc, it) => acc + Number(it.unitPrice || 0) * Number(it.quantity || 0), 0);
    const tax = Number(details?.totalGst || 0);
    const grand = Number(details?.totalAmount || 0);
    return { subtotal, tax, grand };
  }, [details]);

  if (loading) {
    return <div className="mt-20 mx-auto p-6 w-[92vw] text-gray-500">Loading purchase...</div>;
  }

  if (!details) {
    return (
      <div className="mt-20 mx-auto p-6 w-[92vw]">
        <div className="bg-white rounded shadow p-6 text-gray-600">Purchase not found.</div>
      </div>
    );
  }

  return (
    <div className="mt-20 mx-auto p-6 bg-gray-50 rounded-md shadow-md" style={{ width: "92vw" }}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Details</h1>
        <div className="space-x-2">
          <button
            onClick={() => navigate(`/purchase?purchaseId=${details.id}&mode=edit`)}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Edit
          </button>
          <button onClick={() => navigate("/purchases")} className="px-4 py-2 rounded border border-gray-300">
            Back
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded border p-4">
          <div className="text-xs text-gray-500">Invoice No</div>
          <div className="font-semibold">{details.invoiceNo || "-"}</div>
        </div>
        <div className="bg-white rounded border p-4">
          <div className="text-xs text-gray-500">Supplier</div>
          <div className="font-semibold">{details.supplierName || "-"}</div>
        </div>
        <div className="bg-white rounded border p-4">
          <div className="text-xs text-gray-500">Date</div>
          <div className="font-semibold">{details.purchaseDate || "-"}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded border p-4">
          <div className="text-xs text-gray-500">Purchase Type</div>
          <div className="font-semibold">{details.purchaseType || "-"}</div>
        </div>
        <div className="bg-white rounded border p-4">
          <div className="text-xs text-gray-500">Tax Type</div>
          <div className="font-semibold">{details.taxType || "-"}</div>
        </div>
        <div className="bg-white rounded border p-4">
          <div className="text-xs text-gray-500">Rate Type</div>
          <div className="font-semibold">{details.rateType || "-"}</div>
        </div>
        <div className="bg-white rounded border p-4">
          <div className="text-xs text-gray-500">Payment Type</div>
          <div className="font-semibold">{details.paymentType || "-"}</div>
        </div>
      </div>

      <div className="overflow-x-auto bg-white border border-gray-200 rounded-md">
        <table className="w-full text-left text-gray-700">
          <thead className="bg-gray-100 border-b border-gray-300">
            <tr>
              <th className="px-4 py-3">Medicine</th>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">MRP</th>
                <th className="px-4 py-3 text-left">Expiry</th>
              <th className="px-4 py-3 text-right">Tax %</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(details.items || []).map((it, idx) => (
              <tr key={it.id || idx} className={idx % 2 ? "bg-gray-50" : ""}>
                <td className="px-4 py-3">{it.medicineName || "-"}</td>
                <td className="px-4 py-3">{it.batchNo || "-"}</td>
                <td className="px-4 py-3 text-right">{it.quantity ?? 0}</td>
                <td className="px-4 py-3 text-right">₹{Number(it.unitPrice || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-right">₹{Number(it.mrp || 0).toFixed(2)}</td>
                <td className="px-4 py-3">{it.expiry || "-"}</td>
                <td className="px-4 py-3 text-right">{Number(it.taxPercent || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-semibold">₹{Number(it.totalAmount || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded border p-4">
          <div className="text-xs text-gray-500">Subtotal</div>
          <div className="font-semibold">₹{totals.subtotal.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded border p-4">
          <div className="text-xs text-gray-500">Tax</div>
          <div className="font-semibold">₹{totals.tax.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded border p-4">
          <div className="text-xs text-gray-500">Grand Total</div>
          <div className="font-bold text-green-700">₹{totals.grand.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}

