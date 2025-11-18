import React, { useState } from "react";
import { useEffect } from "react";
const distributors = [
  "Global Pharma",
  "HealthCare Supply",
  "MedLife Co.",
  "Pharma Inc.",
];

const emptyRow = {
  medicineName: "",
  batch: "",
  qty: 0,
  unitPrice: 0,
  location: "",
};

// create 8 empty rows by default
const initialRows = Array.from({ length: 8 }, () => ({ ...emptyRow }));

export default function EnterPurchasePage() {
  const [date, setDate] = useState(""); // no prepopulate
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [distributor, setDistributor] = useState("");
  const [rows, setRows] = useState(initialRows);
  const [currentStock, setCurrentStock] = useState(0); // no prepopulate
  const [expiry, setExpiry] = useState("");
  const [unitCost, setUnitCost] = useState(0);

const searchMedicine = (text) => {
  if (!text || text.length < 2) {
    setSearchResults([]);
    return;
  }

  const q = text.toLowerCase();

  const filtered = medicineList.filter((m) =>
    m.medicineName?.toLowerCase().includes(q)
  );

  setSearchResults(filtered);
};



    const [medicineList, setMedicineList] = useState([]);
    const [searchResults, setSearchResults] = useState([]);

    useEffect(() => {
      const fetchAll = async () => {
        try {
          const res = await fetch("http://localhost:8080/api/medicines/forSearch?query=");
          const data = await res.json();
          console.log("Loaded all medicines:", data);
          setMedicineList(data);
        } catch (err) {
          console.error("Fetch error:", err);
        }
      };

      fetchAll();
    }, []);


  const handleRowChange = (index, field, value) => {
    const newRows = [...rows];
    if (field === "qty" || field === "unitPrice") {
      // convert to number; empty -> 0
      value = Number(value);
      if (isNaN(value)) value = 0;
    }
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const addAnotherItem = () => {
    setRows([...rows, { ...emptyRow }]);
  };

  const subtotal = rows.reduce(
    (acc, row) => acc + row.qty * row.unitPrice,
    0
  );
  const tax = subtotal * 0.05;
  const grandTotal = subtotal + tax;

  return (
    <div className="bg-gray-50 min-h-screen p-6 font-sans text-gray-900">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-white px-3 py-1 rounded font-semibold text-sm">
            Stitch - Design with AI
          </div>
          <nav className="space-x-4 text-gray-700 font-medium">
            <a href="#" className="hover:text-blue-600">Dashboard</a>
            <a href="#" className="hover:text-blue-600">Inventory</a>
            <a href="#" className="underline font-bold text-blue-700">Purchases</a>
            <a href="#" className="hover:text-blue-600">Reports</a>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold hover:bg-blue-700 transition">
            Log Out
          </button>
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-semibold">
            U
          </div>
        </div>
      </header>

      <main className="bg-white rounded-lg shadow p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Enter Purchase</h1>
        <p className="mb-6 text-gray-700">
          Fill in the invoice details and add medicine items to the purchase list.
        </p>

        <section className="mb-6 bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-3">Invoice Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="date">
                Date
              </label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 bg-white"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="invoiceNumber"
              >
                Invoice Number
              </label>
              <input
                type="text"
                id="invoiceNumber"
                placeholder="e.g., INV-2024-001"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="distributor"
              >
                Distributor
              </label>
              <select
                id="distributor"
                value={distributor}
                onChange={(e) => setDistributor(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
              >
                <option value="">Select a distributor</option>
                {distributors.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section>
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">
                  Medicine Name
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">
                  Batch
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">
                  Qty
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">
                  Unit Price
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold">
                  Total Price
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">
                  Location
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const totalPrice = (row.qty * row.unitPrice).toFixed(2);
                return (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
<td className="border border-gray-300 px-3 py-2 relative">
  <input
    type="text"
    placeholder="Search medicine..."
    value={row.medicineName}
    onChange={(e) => {
      const text = e.target.value;
      handleRowChange(i, "medicineName", text);
      searchMedicine(text);
    }}
    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
  />

  {searchResults.length > 0 && row.medicineName.length >= 2 && (
    <div className="absolute z-50 bg-white border border-gray-300 rounded w-full max-h-40 overflow-y-auto shadow">
      {searchResults.map((m) => (
        <div
          key={m.medicineId}
          className="px-2 py-1 hover:bg-gray-200 cursor-pointer"
          onClick={() => {
            const name = m.medicineName;

            setRows(prev => {
              const copy = [...prev];
              copy[i].medicineName = name;
              copy[i].batchOptions = m.batches;
              return copy;
            });

            setSearchResults([]);
          }}


        >
          {m.medicineName}
        </div>
      ))}
    </div>
  )}
</td>


                    <td className="border border-gray-300 px-3 py-2">
                       <select
                         value={row.batch}
                         onChange={(e) => handleRowChange(i, "batch", e.target.value)}
                         className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                       >
                         <option value="">Select</option>

                         {(row.batchOptions || []).map((batch) => (
                           <option key={batch.batchId} value={batch.batchNo}>
                             {batch.batchNo}
                           </option>
                         ))}
                       </select>

                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={row.qty}
                        onChange={(e) =>
                          handleRowChange(i, "qty", e.target.value)
                        }
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.unitPrice}
                        onChange={(e) =>
                          handleRowChange(i, "unitPrice", e.target.value)
                        }
                        className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right"
                      />
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">
                      ${totalPrice}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      <input
                        type="text"
                        placeholder="e.g. Rack A1"
                        value={row.location}
                        onChange={(e) =>
                          handleRowChange(i, "location", e.target.value)
                        }
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <button
            type="button"
            onClick={addAnotherItem}
            className="mt-3 text-blue-600 font-semibold text-sm hover:underline"
          >
            + Add another item
          </button>
        </section>

        <section className="mt-6 bg-gray-100 p-4 rounded flex justify-between items-center text-sm font-medium text-gray-700">
          <div className="space-x-2">
            <label className="text-xs text-gray-600">Current Stock</label>
            <input
              type="number"
              value={currentStock}
              onChange={(e) => setCurrentStock(Number(e.target.value) || 0)}
              className="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
            />
            <label className="text-xs text-gray-600 ml-3">Expiry</label>
            <input
              type="text"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              placeholder="e.g. Dec 2025"
              className="w-36 rounded border border-gray-300 px-2 py-1 text-sm"
            />
            <label className="text-xs text-gray-600 ml-3">Unit Cost</label>
            <input
              type="number"
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(Number(e.target.value) || 0)}
              className="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <div className="text-right">
            <div>
              Subtotal <span className="font-semibold">${subtotal.toFixed(2)}</span>
            </div>
            <div>
              Tax (5%) <span className="font-semibold">${tax.toFixed(2)}</span>
            </div>
            <div className="text-lg font-bold text-blue-600">
              Grand Total ${grandTotal.toFixed(2)}
            </div>
          </div>
        </section>

        <section className="mt-6 flex justify-end space-x-4">
          <button
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            onClick={() => alert("Purchase cancelled")}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => alert("Purchase saved")}
          >
            Save Purchase
          </button>
        </section>
      </main>
    </div>
  );
}
