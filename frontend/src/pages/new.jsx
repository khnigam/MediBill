import React from 'react';
import { Link } from 'react-router-dom';

const medicines = [
  { id: 'paracetamol-500mg', name: 'Paracetamol 500mg', genericName: 'Acetaminophen', stock: 1200, unitPrice: 0.15, expiry: '12/2025' },
  { id: 'amoxicillin-250mg', name: 'Amoxicillin 250mg', genericName: 'Amoxicillin Trihydrate', stock: 45, unitPrice: 0.32, expiry: '08/2024' },
  // Add more as needed
];

const MedicineList = () => {
  return (
    <div style={{ padding: 20 }}>
      <h1>Medicine Inventory</h1>
      <table border="1" cellPadding="8" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Medicine Name</th>
            <th>Generic Name</th>
            <th>Available Stock</th>
            <th>Unit Price</th>
            <th>Expiry Date</th>
          </tr>
        </thead>
        <tbody>
          {medicines.map(med => (
            <tr key={med.id}>
              <td><Link to={`/medicines/${med.id}/batches`}>{med.name}</Link></td>
              <td>{med.genericName}</td>
              <td>{med.stock} units</td>
              <td>${med.unitPrice.toFixed(2)}</td>
              <td>{med.expiry}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MedicineList;

// MedicineBatchDetails.jsx
import React from 'react';
import { useParams, Link } from 'react-router-dom';

const batchData = {
  'paracetamol-500mg': {
    totalQuantity: 12500,
    numberOfBatches: 8,
    manufacturer: 'Pharma Inc.',
    genericName: 'Acetaminophen',
    category: 'Tablet, Analgesic',
    storageConditions: 'Store in a cool, dry place away from direct sunlight.',
    batches: [
      { batchNo: 'B-1029384', expiryDate: '12 Dec 2025', mfgDate: '13 Dec 2023', quantity: 2500, supplier: 'Global Pharma', costPrice: 2.5 },
      { batchNo: 'B-1029385', expiryDate: '28 Aug 2024', mfgDate: '29 Aug 2022', quantity: 1500, supplier: 'HealthCare Supply', costPrice: 2.45 },
      // Add more batches as needed
    ],
  },
  // Add data for other medicines if needed
};

const MedicineBatchDetails = () => {
  const { medicineId } = useParams();
  const medicine = batchData[medicineId];

  if (!medicine) {
    return (
      <div style={{ padding: 20 }}>
        <p>Medicine not found.</p>
        <Link to="/medicines">Back to Medicine List</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <Link to="/medicines">&larr; Back to Medicine List</Link>
      <h2>{medicineId.replace(/-/g, ' ').toUpperCase()}</h2>
      <p>Detailed view of all available batches and stock information.</p>

      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        <div style={{ border: '1px solid #ccc', padding: 10, width: 150 }}>
          <strong>Total Quantity Available</strong>
          <div style={{ fontSize: 24 }}>{medicine.totalQuantity.toLocaleString()} Units</div>
        </div>
        <div style={{ border: '1px solid #ccc', padding: 10, width: 150 }}>
          <strong>Number of Batches</strong>
          <div style={{ fontSize: 24 }}>{medicine.numberOfBatches}</div>
        </div>
      </div>

      <div style={{ border: '1px solid #ccc', padding: 15, marginBottom: 20, maxWidth: 400 }}>
        <div><strong>Manufacturer:</strong> {medicine.manufacturer}</div>
        <div><strong>Generic Name:</strong> {medicine.genericName}</div>
        <div><strong>Category:</strong> {medicine.category}</div>
        <div><strong>Storage Conditions:</strong> {medicine.storageConditions}</div>
      </div>

      <h3>All Batches ({medicine.batches.length})</h3>
      <table border="1" cellPadding="8" cellSpacing="0" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>BATCH NO.</th>
            <th>EXPIRY DATE</th>
            <th>MFG. DATE</th>
            <th>QUANTITY</th>
            <th>SUPPLIER</th>
            <th>COST PRICE</th>
          </tr>
        </thead>
        <tbody>
          {medicine.batches.map((batch, idx) => (
            <tr key={idx}>
              <td>{batch.batchNo}</td>
              <td>{batch.expiryDate}</td>
              <td>{batch.mfgDate}</td>
              <td>{batch.quantity.toLocaleString()}</td>
              <td>{batch.supplier}</td>
              <td>${batch.costPrice.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MedicineBatchDetails;
