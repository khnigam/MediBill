import React, { useState } from "react";
import { useEffect } from "react";

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

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const totalMedicines = inventory.length;
  const itemsLowOnStock = inventory.filter(i => i.availableStock < 50).length;
  const itemsExpiringSoon = 0;

    const openBatchModal = async (medicine) => {
      setBatchModal(medicine);

      try {
        const response = await fetch(`http://localhost:8080/api/medicines/${medicine.id}/batches`);
        const data = await response.json();
        setBatchList(data);
      } catch (err) {
        console.error("Error loading batches", err);
      }
    };

const closeBatchModal = () => {
  setBatchModal(null);
  setBatchList([]);
};


  useEffect(() => {
    fetch("http://localhost:8080/api/medicines/summary")
      .then(res => res.json())
      .then(data => {
        const formatted = data.map(m => ({
          id: m.id,
          medicineName: m.name,
          genericName: m.brand,
          availableStock: m.totalQuantity,
          unitPrice: m.highestMrp || 0,
        }));
        setInventory(formatted);
      })
      .catch(err => console.error("Error fetching inventory", err));
  }, []);

  const filteredInventory = inventory.filter(item =>
    item.medicineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.genericName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // handle page reset on search
  useEffect(() => setPage(1), [searchTerm]);

  const totalPages = Math.ceil(filteredInventory.length / PAGE_SIZE);

  const paginatedItems = filteredInventory.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <div className="container mx-auto p-6 font-sans">

      {/* header + stats kept same */}

      <div className="mb-4 flex justify-between items-center">
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
            const lowStock = item.availableStock < 50;
            return (
              <tr
                key={item.id}
                className="border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => openBatchModal(item)}
              >

                <td className="p-3 font-semibold">{item.medicineName}</td>
                <td className="p-3 text-gray-600">{item.genericName}</td>
                <td className={`p-3 ${lowStock ? "text-red-600 font-semibold" : ""}`}>
                  {lowStock ? "● " : ""}
                  {item.availableStock.toLocaleString()} units
                </td>
                <td className="p-3">₹{item.unitPrice.toFixed(2)}</td>
                <td className="p-3 space-x-2 text-gray-600">
                  <button>✏️</button>
                  <button>🗑️</button>
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
            className="bg-white p-6 rounded-lg shadow-xl w-[600px]"
          >
            <h2 className="text-xl font-bold mb-4">
              Batch Details – {batchModal.medicineName}
            </h2>

            <table className="w-full border-collapse bg-white shadow rounded">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Batch No</th>
                  <th className="p-2 text-left">Expiry</th>
                  <th className="p-2 text-left">MRP</th>
                  <th className="p-2 text-left">Purchase Rate</th>
                  <th className="p-2 text-left">Qty</th>
                </tr>
              </thead>
              <tbody>
                {batchList.map((b, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2">{b.batchNo}</td>
                    <td className="p-2">{b.expiryDate}</td>
                    <td className="p-2">₹{b.mrp.toFixed(2)}</td>
                    <td className="p-2">₹{b.purchaseRate.toFixed(2)}</td>
                    <td className="p-2">{b.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>

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
            disabled={page === totalPages}
            className={`border px-3 py-1 rounded ${
              page === totalPages ? "bg-gray-200 cursor-not-allowed" : ""
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
    <div className="container mx-auto p-6 font-sans">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Enter Purchase</h1>
        <nav className="space-x-4 text-blue-600">
          <a href="#dashboard">Dashboard</a>
          <a href="#inventory">Inventory</a>
          <a href="#purchases" className="font-semibold">
            Purchases
          </a>
          <a href="#reports">Reports</a>
        </nav>
        <button className="bg-blue-600 text-white px-4 py-1 rounded">Log Out</button>
      </header>

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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <div className="font-bold text-lg text-blue-700">MediDistribute</div>
        <div className="space-x-6 text-blue-600 font-semibold">
          <button
            className={view === "inventory" ? "underline" : ""}
            onClick={() => setView("inventory")}
          >
            Inventory
          </button>
          <button
            className={view === "purchases" ? "underline" : ""}
            onClick={() => setView("purchases")}
          >
            Purchases
          </button>
          <button>Suppliers</button>
          <button>Reports</button>
        </div>
        <div>
          <button className="rounded-full bg-gray-300 w-8 h-8">U</button>
        </div>
      </nav>
      {view === "inventory" && <MedicineInventory />}
      {view === "purchases" && <EnterPurchase />}
    </div>
  );
}