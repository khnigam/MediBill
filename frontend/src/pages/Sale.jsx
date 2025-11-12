import React, { useState } from "react";

const customers = ["Customer A", "Customer B", "Customer C"];

const batchesByMedicine = {
  "Paracetamol 500mg": ["P500-A01", "P500-B02"],
  "Ibuprofen 200mg": ["I200-A01", "I200-B02"],
};

const initialItems = [
  {
    medicineName: "Paracetamol 500mg",
    batch: "P500-A01",
    qty: 1,
    unitPrice: 12.5, // selling price (can differ from purchase)
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

export default function EnterSale() {
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().substring(0, 10);
  });
  const [billNumber, setBillNumber] = useState("");
  const [customer, setCustomer] = useState("");
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
  const tax = subtotal * 0.05; // keep same 5% for parity; change if your GST differs
  const grandTotal = subtotal + tax;

  // Demo stock/meta (can be wired to real data later)
  const currentStock = 1250;
  const expiry = "Dec 2025";
  const unitMrp = 12.5;

  // Simulated APIs
  const fakeApiUpdateItem = (item) =>
    new Promise((resolve) => setTimeout(() => resolve({ success: true, item }), 300));

  const fakeApiSaveSale = (data) =>
    new Promise((resolve) => setTimeout(() => resolve({ success: true, data }), 500));

  const saveSale = async () => {
    if (!billNumber.trim()) {
      alert("Please enter a bill number.");
      return;
    }
    if (!customer) {
      alert("Please select a customer.");
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
      alert("Please add at least one valid sale item.");
      return;
    }

    try {
      setSaving(true);
      for (const item of validItems) {
        // eslint-disable-next-line no-await-in-loop
        const response = await fakeApiUpdateItem(item);
        if (!response.success) {
          alert("Failed to update an item.");
          setSaving(false);
          return;
        }
      }
      const saveResponse = await fakeApiSaveSale({
        date,
        billNumber,
        customer,
        items: validItems,
        totals: { subtotal, tax, grandTotal },
      });
      if (saveResponse.success) {
        alert("Sale saved successfully!");
        // Reset form
        setBillNumber("");
        setCustomer("");
        setItems(initialItems);
      } else {
        alert("Failed to save sale.");
      }
    } catch (e) {
      alert("An error occurred while saving the sale.");
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
        marginTop: "80px", // keep content below fixed header (h-16)
      }}
    >
      <h2>Enter Sale</h2>
      <p>Fill in the bill details and add medicine items to the sale list.</p>

      {/* Full-bleed section like in Purchase */}
      <section
        style={{
          position: "relative",
          left: "calc(50% - 50vw)",
          marginLeft: 50,
          width: "95vw",
          border: "1px solid #ddd",
          borderRadius: 10,
          padding: 16,
          backgroundColor: "#fff",
          marginBottom: 24,
          marginTop: 30,
          boxSizing: "border-box",
        }}
      >
        <h3>Bill Details</h3>
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
            Bill Number
            <br />
            <input
              type="text"
              placeholder="e.g., BILL-2024-001"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              style={{ width: "100%", padding: 6 }}
            />
          </label>
          <label style={{ flex: "2 1 250px" }}>
            Customer
            <br />
            <select
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              style={{ width: "100%", padding: 6 }}
            >
              <option value="">Select a customer</option>
              {customers.map((c) => (
                <option key={c} value={c}>
                  {c}
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
                      list={`sale-medicines-list-${idx}`}
                      placeholder="Search medicine..."
                      value={item.medicineName}
                      onChange={(e) => updateItem(idx, "medicineName", e.target.value)}
                      style={{ width: "100%", padding: 6, fontSize: 14 }}
                    />
                    <datalist id={`sale-medicines-list-${idx}`}>
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
          <strong>Expiry:</strong> {expiry} <strong>MRP:</strong> ${unitMrp.toFixed(2)}
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
            setBillNumber("");
            setCustomer("");
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
          onClick={saveSale}
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
          {saving ? "Saving..." : "Save Sale"}
        </button>
      </div>
    </div>
  );
}
