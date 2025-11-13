import React, { useState } from "react";

const paymentMethods = ["Cash", "Card", "UPI", "Net Banking"];

const emptyRow = {
  medicineName: "",
  batch: "",
  qty: 0,
  unitPrice: 0,
  discountPercent: 0,
  location: "",
};

// default 8 empty rows
const initialRows = Array.from({ length: 8 }, () => ({ ...emptyRow }));

export default function EnterSalePage() {
  const [date, setDate] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [customer, setCustomer] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [rows, setRows] = useState(initialRows);

  const handleRowChange = (index, field, value) => {
    const newRows = [...rows];
    if (field === "qty" || field === "unitPrice" || field === "discountPercent") {
      value = Number(value);
      if (isNaN(value)) value = 0;
    }
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const addAnotherItem = () => setRows([...rows, { ...emptyRow }]);

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

        <section className="mb-6 bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-3">Bill Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="date">Date</label>
              <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="billNumber">Bill Number</label>
              <input type="text" id="billNumber" placeholder="e.g., BIL-2025-001" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="customer">Customer</label>
              <input type="text" id="customer" placeholder="Customer name (optional)" value={customer} onChange={(e) => setCustomer(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="paymentMethod">Payment</label>
              <select id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2">
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
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Batch</th>
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Qty</th>
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Unit Price</th>
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Discount %</th>
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">Line Total</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Location</th>
                <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const total = rowTotal(row).toFixed(2);
                return (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-gray-300 px-3 py-2">
                      <input type="text" placeholder="Search medicine..." value={row.medicineName} onChange={(e) => handleRowChange(i, "medicineName", e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      <input type="text" value={row.batch} onChange={(e) => handleRowChange(i, "batch", e.target.value)} placeholder="Batch" className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right">
                      <input type="number" min="0" value={row.qty} onChange={(e) => handleRowChange(i, "qty", e.target.value)} className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right" />
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right">
                      <input type="number" min="0" step="0.01" value={row.unitPrice} onChange={(e) => handleRowChange(i, "unitPrice", e.target.value)} className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right" />
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right">
                      <input type="number" min="0" max="100" step="0.01" value={row.discountPercent} onChange={(e) => handleRowChange(i, "discountPercent", e.target.value)} className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right" />
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">₹{total}</td>
                    <td className="border border-gray-300 px-3 py-2">
                      <input type="text" placeholder="e.g. Rack A1" value={row.location} onChange={(e) => handleRowChange(i, "location", e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-center">
                      <button type="button" onClick={() => removeRow(i)} className="text-sm text-red-600 hover:underline">Remove</button>
                    </td>
                  </tr>
                );
              })}
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
