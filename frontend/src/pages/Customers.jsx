import React, { useState, useMemo } from 'react';
import { useEffect } from "react";

const initialCustomers = [
  { id: 1, name: 'Amit Kumar', phone: '98765 43210', email: 'amit.k@example.com', address: 'MG Road, New Delhi', gstin: '', loyaltyPoints: 120 },
  { id: 2, name: 'Sanya Verma', phone: '91234 56789', email: 'sanya.v@example.com', address: 'Koramangala, Bangalore', gstin: '', loyaltyPoints: 45 },

];

const PAGE_SIZE = 12;

const CustomerList = () => {
useEffect(() => {
  const fetchCustomers = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/customers");
      const data = await response.json();
      // map backend fields to UI fields
      const uiList = (Array.isArray(data) ? data : []).map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phoneNumber || '',     // <-- backend -> frontend mapping
        email: c.email || '',
        address: c.address || '',
        gstin: c.gstNumber || '',       // backend gstNumber -> frontend gstin
        loyaltyPoints: c.loyaltyPoints || 0
      }));
      setCustomers(uiList);
    } catch (error) {
      console.error("Error fetching customers:", error);
      setCustomers([]);
    } finally {
      setLoading && setLoading(false);
    }
  };

  fetchCustomers();
}, []);

const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState(initialCustomers);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', gstin: '', loyaltyPoints: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    return customers.filter(({ name, phone, email, address }) =>
      [name, phone, email, address].some(field => (field || '').toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, customers]);

  const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE);
  const pagedCustomers = filteredCustomers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const openEditModal = (customer) => {
      setEditingCustomer(customer);
      setFormData({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        gstin: customer.gstin,
        loyaltyPoints: customer.loyaltyPoints
      });
    };


  const closeEditModal = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '', address: '', gstin: '', loyaltyPoints: 0 });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'loyaltyPoints' ? Number(value) || 0 : value }));
  };

const saveCustomer = async () => {
  try {
    const payload = {
      id: formData.id ?? null,
      name: formData.name,
      phoneNumber: formData.phone,    // <-- frontend -> backend mapping
      email: formData.email,
      address: formData.address,
      gstNumber: formData.gstin,      // map gstin -> gstNumber
      licenseNumber: ""               // not in UI, keep empty
    };

    const response = await fetch("http://localhost:8080/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const saved = await response.json();

    // Map saved backend object back to UI shape
    const mapped = {
      id: saved.id,
      name: saved.name,
      phone: saved.phoneNumber || '',
      email: saved.email || '',
      address: saved.address || '',
      gstin: saved.gstNumber || '',
      loyaltyPoints: saved.loyaltyPoints ?? 0
    };

    if (formData.id) {
      // UPDATE in UI
      setCustomers(prev => prev.map(c => (c.id === mapped.id ? mapped : c)));
    } else {
      // CREATE in UI
      setCustomers(prev => [...prev, mapped]);
    }

    closeEditModal();
  } catch (error) {
    console.error("Error saving customer:", error);
  }
};



  return (
    <div className="mt-24 ml-16"
    style={{
      width: '92vw',
      backgroundColor: '#f9fafb',
      borderRadius: 12,
      padding: 40,
      minHeight: 'calc(100vh - 64px)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#111827',
    }}>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
      }}>
        <div>
          <h1 style={{ margin: 0, fontWeight: 700, fontSize: 28 }}>Customers</h1>
          <p style={{ color: '#6b7280', marginTop: 4, fontSize: 14 }}>
            Manage customers, contact details and loyalty information.
          </p>
        </div>
        <button
          style={{
            backgroundColor: '#10b981',
            color: 'white',
            padding: '10px 18px',
            borderRadius: 6,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.28)',
          }}
          onClick={() => {
            setEditingCustomer({id: null,name: "",phone: "",email: "",address: "",gstin: "",loyaltyPoints: 0});
            setFormData({id: null,name: "",phone: "",email: "",address: "",gstin: "",loyaltyPoints: 0});
          }}
        >
          + Add New Customer
        </button>
      </div>

      <div style={{ display: 'flex', marginBottom: 16 }}>
        <div style={{
          flexGrow: 1,
          position: 'relative',
          maxWidth: 400,
        }}>
          <input
            type="text"
            placeholder="Search by name, phone, email or address..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
            style={{
              width: '100%',
              padding: '10px 38px 10px 12px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              fontSize: 14,
              outline: 'none',
              boxShadow: 'inset 0 1px 2px rgb(0 0 0 / 0.1)',
            }}
          />
          <svg
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 18,
              height: 18,
              fill: '#9ca3af',
              pointerEvents: 'none',
            }}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path d="M10 2a8 8 0 105.292 14.292l4.707 4.707 1.414-1.414-4.707-4.707A8 8 0 0010 2zm0 2a6 6 0 110 12 6 6 0 010-12z" />
          </svg>
        </div>
      </div>

      <table style={{
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: '0 8px',
        fontSize: 14,
      }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 13 }}>
            <th style={{ padding: '12px 12px' }}>Customer Name</th>
            <th style={{ padding: '12px 12px' }}>Phone</th>
            <th style={{ padding: '12px 12px' }}>Email</th>
            <th style={{ padding: '12px 12px' }}>Address</th>
            <th style={{ padding: '12px 12px' }}>Points</th>
            <th style={{ padding: '12px 12px', width: 60 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pagedCustomers.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 16, color: '#9ca3af', textAlign: 'center' }}>
                No customers found.
              </td>
            </tr>
          )}
          {pagedCustomers.map(customer => (
            <tr key={customer.id} style={{
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgb(0 0 0 / 0.1)',
              borderRadius: 8,
              height: 56,
              verticalAlign: 'middle',
            }}>
              <td style={{ padding: '8px 12px' }}>{customer.name}</td>
              <td style={{ padding: '8px 12px', color: '#4b5563' }}>{customer.phone}</td>
              <td style={{ padding: '8px 12px', color: '#4b5563' }}>{customer.email}</td>
              <td style={{ padding: '8px 12px', color: '#4b5563' }}>{customer.address}</td>
              <td style={{ padding: '8px 12px', color: '#4b5563' }}>{customer.loyaltyPoints ?? 0}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center', cursor: 'pointer', color: '#6b7280' }} title="Edit" onClick={() => openEditModal(customer)}>
                &#8942;
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{
        marginTop: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: '#6b7280',
        fontSize: 13,
      }}>
        <div>
          Showing {pagedCustomers.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}-
          {(page - 1) * PAGE_SIZE + pagedCustomers.length} of {filteredCustomers.length}
        </div>
        <div>
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
            style={{
              marginRight: 8,
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              backgroundColor: page === 1 ? '#f3f4f6' : 'white',
              cursor: page === 1 ? 'default' : 'pointer',
            }}
          >
            Previous
          </button>
          <button
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            disabled={page === totalPages || totalPages === 0}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              backgroundColor: (page === totalPages || totalPages === 0) ? '#f3f4f6' : 'white',
              cursor: (page === totalPages || totalPages === 0) ? 'default' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      </div>

      {editingCustomer && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex',
            justifyContent: 'center', alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={closeEditModal}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white',
              padding: 24,
              borderRadius: 12,
              width: 420,
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
              fontSize: 14,
              color: '#111827',
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 20, fontWeight: 700 }}>Edit Customer</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontWeight: 600, color: '#374151' }}>
                Name
                <input name="name" value={formData.name} onChange={handleChange} style={{ marginTop: 6, padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', width: '100%' }} />
              </label>
              <label style={{ fontWeight: 600, color: '#374151' }}>
                Phone
                <input name="phone" value={formData.phone} onChange={handleChange} style={{ marginTop: 6, padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', width: '100%' }} />
              </label>
              <label style={{ fontWeight: 600, color: '#374151' }}>
                Email
                <input name="email" value={formData.email} onChange={handleChange} type="email" style={{ marginTop: 6, padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', width: '100%' }} />
              </label>
              <label style={{ fontWeight: 600, color: '#374151' }}>
                Address
                <input name="address" value={formData.address} onChange={handleChange} style={{ marginTop: 6, padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', width: '100%' }} />
              </label>
              <label style={{ fontWeight: 600, color: '#374151' }}>
                GSTIN (optional)
                <input name="gstin" value={formData.gstin} onChange={handleChange} style={{ marginTop: 6, padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', width: '100%' }} />
              </label>
              <label style={{ fontWeight: 600, color: '#374151' }}>
                Loyalty Points
                <input name="loyaltyPoints" value={formData.loyaltyPoints} onChange={handleChange} type="number" style={{ marginTop: 6, padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', width: '100%' }} />
              </label>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={closeEditModal} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', backgroundColor: '#e5e7eb', color: '#374151', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveCustomer} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', backgroundColor: '#10b981', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerList;
