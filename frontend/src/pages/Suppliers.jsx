import React, { useState, useMemo , useEffect} from 'react';

const initialSuppliers = [
  { id: 1, name: 'Global Pharma', contact: 'John Doe', phone: '123-456-7890', email: 'contact@globalpharma.com' },
  { id: 2, name: 'HealthCare Supply', contact: 'Jane Smith', phone: '987-654-3210', email: 'sales@healthcaresupply.com' }
];


const PAGE_SIZE = 15;

const SupplierList = () => {

    useEffect(() => {
      const fetchSuppliers = async () => {
        try {
          const response = await fetch("http://localhost:8080/api/suppliers");
          const data = await response.json();
          setSuppliers(data);
        } catch (error) {
          console.error("Error fetching suppliers:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchSuppliers();
    }, []);

  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [loading, setLoading] = useState(true); // ✅ must define this
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({ name: '', contact: '', phone: '', email: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const filteredSuppliers = useMemo(() => {
    if (!searchTerm.trim()) return suppliers;
    return suppliers.filter(({ name, contact, email }) =>
      [name, contact, email].some(field =>
        field.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, suppliers]);

  const totalPages = Math.ceil(filteredSuppliers.length / PAGE_SIZE);
  const pagedSuppliers = filteredSuppliers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setFormData(supplier);
  };

  const openAddModal = () => {
    const emptySupplier = { id:null , name: "", contact: "", phone: "", email: "" };
    setEditingSupplier(emptySupplier);
    setFormData(emptySupplier);
  };

  const closeEditModal = () => {
    setEditingSupplier(null);
    setFormData({ name: '', contact: '', phone: '', email: '' });
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

const saveSupplier = async () => {
  try {
    const payload = {
      id: editingSupplier.id ? editingSupplier.id : null,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      address: "" // not in UI, so send empty
    };

    const response = await fetch("http://localhost:8080/api/suppliers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const savedSupplier = await response.json();

    // Update UI
    if (editingSupplier.id) {
      // update existing supplier in frontend
      setSuppliers(prev =>
        prev.map(s => (s.id === savedSupplier.id ? savedSupplier : s))
      );
    } else {
      // add new supplier in frontend
      setSuppliers(prev => [...prev, savedSupplier]);
    }

    closeEditModal();
  } catch (error) {
    console.error("Error saving supplier:", error);
  }
};



  return (
    <div className="mt-24 ml-16"
        style={{
          width: "92vw",
          backgroundColor: '#f9fafb',
          borderRadius: 12,
          padding: 40,
          minHeight: "calc(100vh - 64px)",
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#111827',
        }}>
     <div
         style={{
           display: "flex",
           justifyContent: "space-between",
           alignItems: "center",
           marginBottom: 14,
         }}
       >
        <div>
          <h1 style={{ margin: 0, fontWeight: 700, fontSize: 28 }}>Suppliers</h1>
          <p style={{ color: '#6b7280', marginTop: 4, fontSize: 14 }}>
            Manage all your medicine suppliers in one place.
          </p>
        </div>
        <button
          style={{
            backgroundColor: '#2563eb',
            color: 'white',
            padding: '10px 18px',
            borderRadius: 6,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
          }}
          onClick={() => openAddModal()}
        >
          + Add New Supplier
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
            placeholder="Search by name, contact, or email..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
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
            <th style={{ padding: '12px 12px' }}>Supplier Name</th>
            <th style={{ padding: '12px 12px' }}>Contact Person</th>
            <th style={{ padding: '12px 12px' }}>Phone Number</th>
            <th style={{ padding: '12px 12px' }}>Email</th>
            <th style={{ padding: '12px 12px', width: 60 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pagedSuppliers.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: 16, color: '#9ca3af', textAlign: 'center' }}>
                No suppliers found.
              </td>
            </tr>
          )}
          {pagedSuppliers.map(supplier => (
            <tr key={supplier.id} style={{
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgb(0 0 0 / 0.1)',
              borderRadius: 8,
              height: 48,
              verticalAlign: 'middle',
            }}>
              <td style={{ padding: '8px 12px' }}>{supplier.name}</td>
              <td style={{ padding: '8px 12px', color: '#4b5563' }}>{supplier.contact}</td>
              <td style={{ padding: '8px 12px', color: '#4b5563' }}>{supplier.phone}</td>
              <td style={{ padding: '8px 12px', color: '#4b5563' }}>{supplier.email}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center', cursor: 'pointer', color: '#6b7280' }} title="Edit" onClick={() => openEditModal(supplier)}>
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
          Showing {pagedSuppliers.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}-
          {(page - 1) * PAGE_SIZE + pagedSuppliers.length} of {filteredSuppliers.length}
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

      {editingSupplier && (
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
              width: 360,
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
              fontSize: 14,
              color: '#111827',
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 20, fontWeight: 700 }}>Edit Supplier</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ fontWeight: 600, color: '#374151' }}>
                Name
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  style={{
                    marginTop: 6,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    outline: 'none',
                    width: '100%',
                  }}
                />
              </label>
              <label style={{ fontWeight: 600, color: '#374151' }}>
                Contact Person
                <input
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  style={{
                    marginTop: 6,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    outline: 'none',
                    width: '100%',
                  }}
                />
              </label>
              <label style={{ fontWeight: 600, color: '#374151' }}>
                Phone
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  style={{
                    marginTop: 6,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    outline: 'none',
                    width: '100%',
                  }}
                />
              </label>
              <label style={{ fontWeight: 600, color: '#374151' }}>
                Email
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  type="email"
                  style={{
                    marginTop: 6,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    outline: 'none',
                    width: '100%',
                  }}
                />
              </label>
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={closeEditModal}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveSupplier}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierList;