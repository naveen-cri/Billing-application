import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { Plus, Search, Edit2, Trash2, Users } from 'lucide-react';

export default function Customers() {
    const { api } = useAuth();
    const { addToast } = useToast();
    const [customers, setCustomers] = useState([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '', gstin: '' });

    useEffect(() => { loadCustomers(); }, []);

    const loadCustomers = async () => {
        const res = await api(`/api/customers${search ? `?search=${search}` : ''}`);
        setCustomers(await res.json());
    };

    useEffect(() => { const t = setTimeout(loadCustomers, 300); return () => clearTimeout(t); }, [search]);

    const openModal = (customer = null) => {
        if (customer) {
            setEditing(customer);
            setForm({ name: customer.name, email: customer.email || '', phone: customer.phone || '', address: customer.address || '', city: customer.city || '', state: customer.state || '', pincode: customer.pincode || '', gstin: customer.gstin || '' });
        } else {
            setEditing(null);
            setForm({ name: '', email: '', phone: '', address: '', city: '', state: '', pincode: '', gstin: '' });
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            if (editing) {
                await api(`/api/customers/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
                addToast('Customer updated', 'success');
            } else {
                await api('/api/customers', { method: 'POST', body: JSON.stringify(form) });
                addToast('Customer added', 'success');
            }
            setShowModal(false);
            loadCustomers();
        } catch (err) { addToast(err.message, 'error'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this customer?')) return;
        try {
            const res = await api(`/api/customers/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) { addToast(data.error || 'Failed to delete', 'error'); return; }
            addToast('Customer deleted successfully', 'success');
            loadCustomers();
        } catch (err) { addToast(err.message || 'Delete failed', 'error'); }
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>Customers</h2>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    <Plus size={18} /> Add Customer
                </button>
            </div>

            <div className="toolbar">
                <div className="search-input">
                    <Search />
                    <input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {customers.length > 0 ? (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>GSTIN</th>
                                <th>City</th>
                                <th>State</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(c => (
                                <tr key={c.id}>
                                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                                    <td>{c.email}</td>
                                    <td>{c.phone}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{c.gstin}</td>
                                    <td>{c.city}</td>
                                    <td>{c.state}</td>
                                    <td>
                                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openModal(c)}><Edit2 size={15} /></button>
                                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDelete(c.id)}><Trash2 size={15} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card empty-state">
                    <Users size={48} />
                    <h4>No customers yet</h4>
                    <p>Add your first customer to get started</p>
                </div>
            )}

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Customer' : 'Add Customer'}
                footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>}>
                <div className="form-row">
                    <div className="form-group"><label>Name *</label><input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Customer name" /></div>
                    <div className="form-group"><label>Email</label><input type="email" className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email address" /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label>Phone</label><input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" /></div>
                    <div className="form-group"><label>GSTIN</label><input className="form-control" value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value })} placeholder="22AAAAA0000A1Z5" /></div>
                </div>
                <div className="form-group"><label>Address</label><input className="form-control" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street address" /></div>
                <div className="form-row">
                    <div className="form-group"><label>City</label><input className="form-control" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="City" /></div>
                    <div className="form-group"><label>State</label><input className="form-control" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="State" /></div>
                </div>
                <div className="form-group"><label>Pincode</label><input className="form-control" value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} placeholder="Pincode" style={{ maxWidth: 200 }} /></div>
            </Modal>
        </div>
    );
}
