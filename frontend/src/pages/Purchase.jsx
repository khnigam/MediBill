import React, { useState } from "react";
import { NavLink } from "react-router-dom";

const distributors = ["Distributor A", "Distributor B", "Distributor C"];

 const batchesByMedicine = {
  "Paracetamol 500mg": ["P500-A01", "P500-B02"],
  "Ibuprofen 200mg": ["I200-A01", "I200-B02"],
};

const initialItems = [
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
    location: "e.g. Rack A1",
  }),
];

export default function EnterPurchase() {
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().substring(0, 10);
  });
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [distributor, setDistributor] = useState("");
  const [items, setItems] = useState(initialItems);
  const [saving, setSaving] = useState(false);

  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const newItems = [...prev];
      let item = { ...newItems[index] };
      if (field === "medicineName") {
        item.medicineName = value;
        item.batch = "";
        item.qty = 0;
        item.unitPrice = 0;
      } else if (field === "batch") {
        item.batch = value;
      } else if (field === "qty") {
        item.qty = Number(value);
      } else if (field === "unitPrice") {
        item.unitPrice = Number(value);
      } else if (field === "location") {
        item.location = value;
      }
      newItems[index] = item;
      return newItems;
    });
  };

  const addAnotherItem = () => {
    setItems((prev) => [
      ...prev,
      { medicineName: "", batch: "", qty: 0, unitPrice: 0, location: "e.g. Rack A1" },
    ]);
  };

  const subtotal = items.reduce((acc, item) => acc + item.qty * item.unitPrice, 0);
  const tax = subtotal * 0.05;
  const grandTotal = subtotal + tax;

  // For demonstration, these values are static for current stock info
  const currentStock = 1250;
  const expiry = "Dec 2025";
  const unitCost = 9.8;

  // Dummy API call simulation for updateItem
  const fakeApiUpdateItem = (item) =>
    new Promise((resolve) => setTimeout(() => resolve({ success: true, item }), 300));

  // Dummy API call for savePurchase
  const fakeApiSavePurchase = (data) =>
    new Promise((resolve) => setTimeout(() => resolve({ success: true, data }), 500));

  const savePurchase = async () => {
    if (!invoiceNumber.trim()) {
      alert("Please enter an invoice number.");
      return;
    }
    if (!distributor) {
      alert("Please select a distributor.");
      return;
    }
    const validItems = items.filter(
      (item) =>
        item.medicineName &&
        item.batch &&
        item.qty > 0 &&
        item.unitPrice > 0 &&
        item.location.trim()
    );
    if (validItems.length === 0) {
      alert("Please add at least one valid purchase item.");
      return;
    }

    try {
      setSaving(true);
      // Simulate updating each item via API call
      for (const item of validItems) {
        // eslint-disable-next-line no-await-in-loop
        const response = await fakeApiUpdateItem(item);
        if (!response.success) {
          alert("Failed to update an item.");
          setSaving(false);
          return;
        }
      }
      // Simulate saving the whole purchase
      const saveResponse = await fakeApiSavePurchase({
        date,
        invoiceNumber,
        distributor,
        items: validItems,
      });
      if (saveResponse.success) {
        alert("Purchase saved successfully!");
        // Reset form
        setInvoiceNumber("");
        setDistributor("");
        setItems(initialItems);
      } else {
        alert("Failed to save purchase.");
      }
    } catch (error) {
      alert("An error occurred while saving the purchase.");
    } finally {
      setSaving(false);
    }
  };

  return (
   <div
     style={{
       position: "relative",
       left: "calc(50% - 50vw)",
       marginLeft: 0,
       maxWidth: 900,
       margin: "auto",
       padding: 16,
       fontFamily: "Arial, sans-serif",
       marginTop: "80px", // adjust this based on your header height
     }}
   >
      <h2>Enter Purchase</h2>
      <p>Fill in the invoice details and add medicine items to the purchase list.</p>

      <section
        style={{
          position: "relative",
          left: "calc(50% - 50vw)",
          marginLeft: 50,
          width: "95vw",          // full width of viewport
          border: "1px solid #ddd",
          borderRadius: 10,
          padding: 16,
          backgroundColor: "#fff",
          marginBottom: 24,
          marginTop: 30, // adds space above this section
          boxSizing: "border-box", // include padding in width calculation
        }}
      >
        <h3>Invoice Details</h3>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <label style={{ flex: "1 1 150px" }}>
            Date
            <br />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: "100%", padding: 6 }}
            />
          </label>
          <label style={{ flex: "2 1 250px" }}>
            Invoice Number
            <br />
            <input
              type="text"
              placeholder="e.g., INV-2024-001"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              style={{ width: "100%", padding: 6 }}
            />
          </label>
          <label style={{ flex: "2 1 250px" }}>
            Distributor
            <br />
            <select
              value={distributor}
              onChange={(e) => setDistributor(e.target.value)}
              style={{ width: "100%", padding: 6 }}
            >
              <option value="">Select a distributor</option>
              {distributors.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>

        <table
          style={{
            width: "100%",
            marginTop: 16,
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0" }}>
              <th style={{ border: "1px solid #ccc", padding: 8, width: "30%" }}>Medicine Name</th>
              <th style={{ border: "1px solid #ccc", padding: 8, width: "12%" }}>Batch</th>
              <th style={{ border: "1px solid #ccc", padding: 8, width: "8%" }}>Qty</th>
              <th style={{ border: "1px solid #ccc", padding: 8, width: "12%" }}>Unit Price</th>
              <th style={{ border: "1px solid #ccc", padding: 8, width: "14%" }}>Total Price</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Location</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const totalPrice = (item.qty * item.unitPrice).toFixed(2);
              const medicineOptions = Object.keys(batchesByMedicine);
              const batchOptions = item.medicineName
                ? batchesByMedicine[item.medicineName] || []
                : [];

              return (
                <tr key={idx}>
                  <td style={{ border: "1px solid #ccc", padding: 4 }}>
                    <input
                      list={`medicines-list-${idx}`}
                      placeholder="Search medicine..."
                      value={item.medicineName}
                      onChange={(e) => updateItem(idx, "medicineName", e.target.value)}
                      style={{ width: "100%", padding: 6, fontSize: 14 }}
                    />
                    <datalist id={`medicines-list-${idx}`}>
                      {medicineOptions.map((med) => (
                        <option key={med} value={med} />
                      ))}
                    </datalist>
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: 4 }}>
                    <select
                      value={item.batch || ""}
                      onChange={(e) => updateItem(idx, "batch", e.target.value)}
                      style={{ width: "100%", padding: 6, fontSize: 14 }}
                      disabled={!item.medicineName}
                    >
                      <option value="">Select</option>
                      {batchOptions.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: 4 }}>
                    <input
                      type="number"
                      min={0}
                      value={item.qty}
                      onChange={(e) => updateItem(idx, "qty", e.target.value)}
                      style={{ width: "100%", padding: 6, fontSize: 14 }}
                    />
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: 4 }}>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                      style={{ width: "100%", padding: 6, fontSize: 14 }}
                    />
                  </td>
                  <td
                    style={{
                      border: "1px solid #ccc",
                      padding: 4,
                      textAlign: "right",
                      fontWeight: "bold",
                    }}
                  >
                    ${totalPrice}
                  </td>
                  <td style={{ border: "1px solid #ccc", padding: 4 }}>
                    <input
                      type="text"
                      placeholder="e.g. Rack A1"
                      value={item.location}
                      onChange={(e) => updateItem(idx, "location", e.target.value)}
                      style={{ width: "100%", padding: 6, fontSize: 14 }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button
          onClick={addAnotherItem}
          style={{
            marginTop: 12,
            backgroundColor: "transparent",
            border: "none",
            color: "#0066cc",
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
          type="button"
        >
          <span style={{ fontSize: 20, lineHeight: 0 }}>+</span> Add another item
        </button>
      </section>

      <section
        style={{
          borderTop: "1px solid #ddd",
          paddingTop: 12,
          marginBottom: 24,
          fontSize: 14,
          color: "#555",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <strong>Current Stock:</strong>{" "}
          <span style={{ color: "#0066cc" }}>{currentStock} units</span>{" "}
          <strong>Expiry:</strong> {expiry} <strong>Unit Cost:</strong> ${unitCost.toFixed(2)}
        </div>

        <div
          style={{
            textAlign: "right",
            minWidth: 150,
            fontWeight: "bold",
            fontSize: 16,
          }}
        >
          <div>
            Subtotal <span style={{ float: "right" }}>${subtotal.toFixed(2)}</span>
          </div>
          <div>
            Tax (5%) <span style={{ float: "right" }}>${tax.toFixed(2)}</span>
          </div>
          <div style={{ marginTop: 8 }}>
            Grand Total{" "}
            <span style={{ float: "right", fontWeight: "bold", fontSize: 18 }}>
              ${grandTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </section>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <button
          onClick={() => {
            setInvoiceNumber("");
            setDistributor("");
            setItems(initialItems);
          }}
          style={{
            padding: "8px 16px",
            borderRadius: 4,
            border: "1px solid #ccc",
            backgroundColor: "#fff",
            cursor: "pointer",
          }}
          type="button"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          onClick={savePurchase}
          style={{
            padding: "8px 16px",
            borderRadius: 4,
            border: "none",
            backgroundColor: "#2563eb",
            color: "#fff",
            cursor: "pointer",
          }}
          type="button"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Purchase"}
        </button>
      </div>
    </div>
  );
}