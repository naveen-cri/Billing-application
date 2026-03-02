import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { Plus, Search, Edit2, Trash2, FileText, Download, Send, MessageCircle, Eye, X } from 'lucide-react';

export default function Invoices() {
    const { api, user, hasRole } = useAuth();
    const { addToast } = useToast();
    const [invoices, setInvoices] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDetail, setShowDetail] = useState(null);
    const [form, setForm] = useState({ customer_id: '', date: new Date().toISOString().split('T')[0], due_date: '', notes: '', is_igst: false });
    const [items, setItems] = useState([{ product_id: '', description: '', hsn_sac_code: '', quantity: 1, unit_price: 0, tax_rate: 18 }]);

    useEffect(() => { loadInvoices(); loadCustomers(); loadProducts(); }, []);

    const loadInvoices = async () => {
        let url = '/api/invoices?';
        if (search) url += `search=${search}&`;
        if (statusFilter) url += `status=${statusFilter}&`;
        if (paymentFilter) url += `payment_status=${paymentFilter}&`;
        if (hasRole('Sales') && !hasRole('Admin', 'Accountant')) url += `created_by=${user.id}&`;
        const res = await api(url);
        setInvoices(await res.json());
    };

    const loadCustomers = async () => { const res = await api('/api/customers'); setCustomers(await res.json()); };
    const loadProducts = async () => { const res = await api('/api/products'); setProducts(await res.json()); };

    useEffect(() => { const t = setTimeout(loadInvoices, 300); return () => clearTimeout(t); }, [search, statusFilter, paymentFilter]);

    const openCreate = () => {
        setForm({ customer_id: '', date: new Date().toISOString().split('T')[0], due_date: '', notes: '', is_igst: false });
        setItems([{ product_id: '', description: '', hsn_sac_code: '', quantity: 1, unit_price: 0, tax_rate: 18 }]);
        setShowModal(true);
    };

    const addItem = () => setItems([...items, { product_id: '', description: '', hsn_sac_code: '', quantity: 1, unit_price: 0, tax_rate: 18 }]);

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        if (field === 'product_id' && value) {
            const product = products.find(p => p.id === parseInt(value));
            if (product) {
                newItems[index].description = product.name;
                newItems[index].hsn_sac_code = product.hsn_sac_code;
                newItems[index].unit_price = product.price;
                newItems[index].tax_rate = product.tax_rate;
            }
        }
        setItems(newItems);
    };

    const removeItem = (index) => { if (items.length > 1) setItems(items.filter((_, i) => i !== index)); };

    const calcSubtotal = () => items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);
    const calcTax = () => items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0) * ((i.tax_rate || 0) / 100), 0);
    const calcTotal = () => calcSubtotal() + calcTax();

    const handleSave = async () => {
        if (!form.customer_id) { addToast('Select a customer', 'error'); return; }
        if (items.some(i => !i.description || !i.unit_price)) { addToast('Fill all item details', 'error'); return; }
        try {
            await api('/api/invoices', { method: 'POST', body: JSON.stringify({ ...form, items }) });
            addToast('Invoice created', 'success');
            setShowModal(false);
            loadInvoices();
        } catch (err) { addToast(err.message, 'error'); }
    };

    const updateStatus = async (id, status) => {
        try {
            await api(`/api/invoices/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
            addToast(`Invoice marked as ${status}`, 'success');
            loadInvoices();
            if (showDetail) viewInvoice(id);
        } catch (err) { addToast(err.message, 'error'); }
    };

    const deleteInvoice = async (id) => {
        if (!confirm('Delete this invoice?')) return;
        try {
            await api(`/api/invoices/${id}`, { method: 'DELETE' });
            addToast('Invoice deleted', 'success');
            loadInvoices();
        } catch (err) { addToast(err.message, 'error'); }
    };

    const viewInvoice = async (id) => {
        const res = await api(`/api/invoices/${id}`);
        setShowDetail(await res.json());
    };

    const downloadPdf = (id) => {
        const token = localStorage.getItem('token');
        window.open(`/api/invoices/${id}/pdf?token=${token}`, '_blank');
    };

    const shareWhatsApp = async (id) => {
        const res = await api(`/api/invoices/${id}/whatsapp`);
        const data = await res.json();
        window.open(data.url, '_blank');
    };

    const statusBadge = (status) => {
        const map = { Paid: 'success', Sent: 'info', Draft: 'neutral', Overdue: 'danger', Cancelled: 'neutral' };
        return <span className={`badge badge-${map[status] || 'neutral'}`}>{status}</span>;
    };

    const paymentBadge = (status) => {
        const map = { Paid: 'success', Partial: 'warning', Unpaid: 'danger' };
        return <span className={`badge badge-${map[status] || 'neutral'}`}>{status}</span>;
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>Invoices</h2>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={18} /> New Invoice</button>
            </div>

            <div className="toolbar">
                <div className="search-input">
                    <Search />
                    <input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="">All Status</option>
                    <option>Draft</option><option>Sent</option><option>Paid</option><option>Overdue</option><option>Cancelled</option>
                </select>
                <select className="filter-select" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
                    <option value="">All Payments</option>
                    <option>Paid</option><option>Partial</option><option>Unpaid</option>
                </select>
            </div>

            {invoices.length > 0 ? (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Customer</th>
                                <th>Date</th>
                                <th>Due Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Payment</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map(inv => (
                                <tr key={inv.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{inv.invoice_number}</td>
                                    <td>{inv.customer_name}</td>
                                    <td>{inv.date}</td>
                                    <td>{inv.due_date || '—'}</td>
                                    <td style={{ fontWeight: 600 }}>₹{inv.total.toLocaleString('en-IN')}</td>
                                    <td>{statusBadge(inv.status)}</td>
                                    <td>{paymentBadge(inv.payment_status)}</td>
                                    <td>
                                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => viewInvoice(inv.id)} title="View"><Eye size={15} /></button>
                                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => downloadPdf(inv.id)} title="PDF"><Download size={15} /></button>
                                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => shareWhatsApp(inv.id)} title="WhatsApp"><MessageCircle size={15} /></button>
                                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => deleteInvoice(inv.id)} title="Delete"><Trash2 size={15} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card empty-state">
                    <FileText size={48} />
                    <h4>No invoices yet</h4>
                    <p>Create your first invoice</p>
                </div>
            )}

            {/* Create Invoice Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Invoice" large
                footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Create Invoice</button></>}>
                <div className="form-row">
                    <div className="form-group">
                        <label>Customer *</label>
                        <select className="form-control" value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })}>
                            <option value="">Select customer</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.gstin ? `(${c.gstin})` : ''}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Tax Type</label>
                        <select className="form-control" value={form.is_igst ? 'igst' : 'cgst_sgst'} onChange={e => setForm({ ...form, is_igst: e.target.value === 'igst' })}>
                            <option value="cgst_sgst">CGST + SGST (Intra-state)</option>
                            <option value="igst">IGST (Inter-state)</option>
                        </select>
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group"><label>Invoice Date</label><input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                    <div className="form-group"><label>Due Date</label><input type="date" className="form-control" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
                </div>

                <h4 style={{ margin: '20px 0 12px', fontSize: '0.95rem' }}>Line Items</h4>
                <div className="item-row item-row-header">
                    <span>Product / Description</span><span>HSN/SAC</span><span>Qty</span><span>Price</span><span>Tax %</span><span>Amount</span><span></span>
                </div>
                {items.map((item, i) => (
                    <div className="item-row" key={i}>
                        <select className="form-control" value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                            <option value="">Select or type</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input className="form-control" value={item.hsn_sac_code} onChange={e => updateItem(i, 'hsn_sac_code', e.target.value)} placeholder="HSN" />
                        <input type="number" className="form-control" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} min="0" step="1" />
                        <input type="number" className="form-control" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} min="0" step="0.01" />
                        <input type="number" className="form-control" value={item.tax_rate} onChange={e => updateItem(i, 'tax_rate', parseFloat(e.target.value) || 0)} min="0" step="0.5" />
                        <span style={{ fontWeight: 600, padding: '8px', whiteSpace: 'nowrap' }}>₹{((item.quantity || 0) * (item.unit_price || 0)).toLocaleString('en-IN')}</span>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => removeItem(i)}><X size={14} /></button>
                    </div>
                ))}
                <button className="btn btn-secondary btn-sm" onClick={addItem} style={{ marginTop: 8 }}><Plus size={14} /> Add Item</button>

                <div className="invoice-totals">
                    <div className="total-row"><span>Subtotal:</span><span>₹{calcSubtotal().toLocaleString('en-IN')}</span></div>
                    {form.is_igst ? (
                        <div className="total-row"><span>IGST:</span><span>₹{calcTax().toLocaleString('en-IN')}</span></div>
                    ) : (<>
                        <div className="total-row"><span>CGST:</span><span>₹{(calcTax() / 2).toLocaleString('en-IN')}</span></div>
                        <div className="total-row"><span>SGST:</span><span>₹{(calcTax() / 2).toLocaleString('en-IN')}</span></div>
                    </>)}
                    <div className="total-row grand-total"><span>Total:</span><span>₹{calcTotal().toLocaleString('en-IN')}</span></div>
                </div>

                <div className="form-group" style={{ marginTop: 16 }}><label>Notes</label><textarea className="form-control" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." /></div>
            </Modal>

            {/* Invoice Detail Modal */}
            <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title={`Invoice ${showDetail?.invoice_number || ''}`} large
                footer={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {showDetail?.status === 'Draft' && <button className="btn btn-success btn-sm" onClick={() => updateStatus(showDetail.id, 'Sent')}><Send size={14} /> Mark Sent</button>}
                    {showDetail?.status !== 'Paid' && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(showDetail.id, 'Paid')}>Mark Paid</button>}
                    <button className="btn btn-secondary btn-sm" onClick={() => downloadPdf(showDetail.id)}><Download size={14} /> PDF</button>
                    <button className="btn btn-success btn-sm" onClick={() => shareWhatsApp(showDetail.id)}><MessageCircle size={14} /> WhatsApp</button>
                </div>}>
                {showDetail && (
                    <div>
                        <div className="form-row" style={{ marginBottom: 20 }}>
                            <div>
                                <p><strong>Customer:</strong> {showDetail.customer_name}</p>
                                {showDetail.customer_gstin && <p><strong>GSTIN:</strong> {showDetail.customer_gstin}</p>}
                                {showDetail.customer_phone && <p><strong>Phone:</strong> {showDetail.customer_phone}</p>}
                                {showDetail.customer_address && <p><strong>Address:</strong> {showDetail.customer_address}, {showDetail.customer_city} {showDetail.customer_state}</p>}
                            </div>
                            <div>
                                <p><strong>Date:</strong> {showDetail.date}</p>
                                <p><strong>Due Date:</strong> {showDetail.due_date || 'N/A'}</p>
                                <p><strong>Status:</strong> {statusBadge(showDetail.status)} {paymentBadge(showDetail.payment_status)}</p>
                            </div>
                        </div>

                        <div className="table-container" style={{ marginBottom: 16 }}>
                            <table>
                                <thead><tr><th>#</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Rate</th><th>Tax</th><th>Total</th></tr></thead>
                                <tbody>
                                    {showDetail.items?.map((item, i) => (
                                        <tr key={item.id}>
                                            <td>{i + 1}</td>
                                            <td>{item.description}</td>
                                            <td>{item.hsn_sac_code}</td>
                                            <td>{item.quantity}</td>
                                            <td>₹{item.unit_price?.toLocaleString('en-IN')}</td>
                                            <td>₹{item.tax_amount?.toLocaleString('en-IN')} ({item.tax_rate}%)</td>
                                            <td style={{ fontWeight: 600 }}>₹{item.total?.toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="invoice-totals">
                            <div className="total-row"><span>Subtotal:</span><span>₹{showDetail.subtotal?.toLocaleString('en-IN')}</span></div>
                            {showDetail.cgst > 0 && <div className="total-row"><span>CGST:</span><span>₹{showDetail.cgst?.toLocaleString('en-IN')}</span></div>}
                            {showDetail.sgst > 0 && <div className="total-row"><span>SGST:</span><span>₹{showDetail.sgst?.toLocaleString('en-IN')}</span></div>}
                            {showDetail.igst > 0 && <div className="total-row"><span>IGST:</span><span>₹{showDetail.igst?.toLocaleString('en-IN')}</span></div>}
                            <div className="total-row grand-total"><span>Total:</span><span>₹{showDetail.total?.toLocaleString('en-IN')}</span></div>
                            <div className="total-row"><span>Paid:</span><span>₹{showDetail.amount_paid?.toLocaleString('en-IN')}</span></div>
                            <div className="total-row" style={{ color: 'var(--warning)' }}><span>Balance:</span><span>₹{((showDetail.total || 0) - (showDetail.amount_paid || 0)).toLocaleString('en-IN')}</span></div>
                        </div>

                        {showDetail.payments?.length > 0 && (
                            <div style={{ marginTop: 20 }}>
                                <h4 style={{ fontSize: '0.9rem', marginBottom: 10 }}>Payment History</h4>
                                {showDetail.payments.map(p => (
                                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                                        <span>{p.date} — {p.method}</span>
                                        <span style={{ fontWeight: 600, color: 'var(--success)' }}>₹{p.amount.toLocaleString('en-IN')}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
