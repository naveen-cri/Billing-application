import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle } from 'lucide-react';

export default function Products() {
    const { api, hasRole } = useAuth();
    const { addToast } = useToast();
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', hsn_sac_code: '', price: '', tax_rate: '18', unit: 'Nos', stock_quantity: '0', low_stock_threshold: '10' });

    useEffect(() => { loadProducts(); }, []);

    const loadProducts = async () => {
        const res = await api(`/api/products${search ? `?search=${search}` : ''}`);
        setProducts(await res.json());
    };

    useEffect(() => { const t = setTimeout(loadProducts, 300); return () => clearTimeout(t); }, [search]);

    const openModal = (product = null) => {
        if (product) {
            setEditing(product);
            setForm({ name: product.name, description: product.description || '', hsn_sac_code: product.hsn_sac_code || '', price: String(product.price), tax_rate: String(product.tax_rate), unit: product.unit || 'Nos', stock_quantity: String(product.stock_quantity), low_stock_threshold: String(product.low_stock_threshold) });
        } else {
            setEditing(null);
            setForm({ name: '', description: '', hsn_sac_code: '', price: '', tax_rate: '18', unit: 'Nos', stock_quantity: '0', low_stock_threshold: '10' });
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        const payload = { ...form, price: parseFloat(form.price) || 0, tax_rate: parseFloat(form.tax_rate) || 0, stock_quantity: parseInt(form.stock_quantity) || 0, low_stock_threshold: parseInt(form.low_stock_threshold) || 10 };
        try {
            if (editing) {
                await api(`/api/products/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
                addToast('Product updated', 'success');
            } else {
                await api('/api/products', { method: 'POST', body: JSON.stringify(payload) });
                addToast('Product added', 'success');
            }
            setShowModal(false);
            loadProducts();
        } catch (err) { addToast(err.message, 'error'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this product?')) return;
        try {
            await api(`/api/products/${id}`, { method: 'DELETE' });
            addToast('Product deleted', 'success');
            loadProducts();
        } catch (err) { addToast(err.message, 'error'); }
    };

    const canEdit = hasRole('Admin', 'Accountant');

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>Products & Services</h2>
                {canEdit && <button className="btn btn-primary" onClick={() => openModal()}><Plus size={18} /> Add Product</button>}
            </div>

            <div className="toolbar">
                <div className="search-input">
                    <Search />
                    <input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {products.length > 0 ? (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>HSN/SAC</th>
                                <th>Price</th>
                                <th>Tax Rate</th>
                                <th>Unit</th>
                                <th>Stock</th>
                                {canEdit && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(p => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                                    <td style={{ fontFamily: 'monospace' }}>{p.hsn_sac_code}</td>
                                    <td>₹{p.price.toLocaleString('en-IN')}</td>
                                    <td>{p.tax_rate}%</td>
                                    <td>{p.unit}</td>
                                    <td>
                                        {p.stock_quantity <= 0 ? (
                                            <span className="alert-badge alert-badge-danger"><AlertTriangle size={12} /> Out of Stock</span>
                                        ) : p.stock_quantity <= p.low_stock_threshold ? (
                                            <span className="alert-badge alert-badge-warning"><AlertTriangle size={12} /> {p.stock_quantity}</span>
                                        ) : (
                                            <span style={{ color: 'var(--success)' }}>{p.stock_quantity}</span>
                                        )}
                                    </td>
                                    {canEdit && (
                                        <td>
                                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openModal(p)}><Edit2 size={15} /></button>
                                            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDelete(p.id)}><Trash2 size={15} /></button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card empty-state">
                    <Package size={48} />
                    <h4>No products yet</h4>
                    <p>Add your first product or service</p>
                </div>
            )}

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Product' : 'Add Product'}
                footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>}>
                <div className="form-group"><label>Name *</label><input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Product name" /></div>
                <div className="form-group"><label>Description</label><input className="form-control" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" /></div>
                <div className="form-row">
                    <div className="form-group"><label>HSN/SAC Code</label><input className="form-control" value={form.hsn_sac_code} onChange={e => setForm({ ...form, hsn_sac_code: e.target.value })} placeholder="e.g. 8471" /></div>
                    <div className="form-group"><label>Unit</label>
                        <select className="form-control" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                            <option>Nos</option><option>Kg</option><option>Ltr</option><option>Mtr</option><option>Sqft</option><option>Hrs</option><option>Box</option><option>Pcs</option>
                        </select>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label>Price (₹)</label><input type="number" className="form-control" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" step="0.01" /></div>
                    <div className="form-group"><label>Tax Rate (%)</label><input type="number" className="form-control" value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: e.target.value })} placeholder="18" /></div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label>Stock Quantity</label><input type="number" className="form-control" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} placeholder="0" /></div>
                    <div className="form-group"><label>Low Stock Alert</label><input type="number" className="form-control" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} placeholder="10" /></div>
                </div>
            </Modal>
        </div>
    );
}
