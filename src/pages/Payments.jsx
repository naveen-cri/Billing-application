import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { CreditCard, Plus, MessageCircle, Search } from 'lucide-react';

export default function Payments() {
    const { api } = useAuth();
    const { addToast } = useToast();
    const [invoices, setInvoices] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [form, setForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], method: 'Cash', notes: '' });

    useEffect(() => { loadInvoices(); }, []);

    const loadInvoices = async () => {
        const res = await api('/api/invoices');
        const data = await res.json();
        setInvoices(data.filter(i => i.payment_status !== 'Paid'));
    };

    const openPayment = (invoice) => {
        setSelectedInvoice(invoice);
        setForm({ amount: String(invoice.total - invoice.amount_paid), date: new Date().toISOString().split('T')[0], method: 'Cash', notes: '' });
        setShowModal(true);
    };

    const handlePay = async () => {
        try {
            const res = await api('/api/payments', { method: 'POST', body: JSON.stringify({ invoice_id: selectedInvoice.id, amount: parseFloat(form.amount), date: form.date, method: form.method, notes: form.notes }) });
            if (!res.ok) { const d = await res.json(); addToast(d.error, 'error'); return; }
            addToast('Payment recorded', 'success');
            setShowModal(false);
            loadInvoices();
        } catch (err) { addToast(err.message, 'error'); }
    };

    const sendReminder = async (invoiceId) => {
        const res = await api(`/api/payments/reminder/${invoiceId}`);
        const data = await res.json();
        window.open(data.whatsappUrl, '_blank');
    };

    const paymentBadge = (status) => {
        const map = { Paid: 'success', Partial: 'warning', Unpaid: 'danger' };
        return <span className={`badge badge-${map[status] || 'neutral'}`}>{status}</span>;
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>Payment Tracking</h2>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="stat-card">
                    <div className="stat-card-header"><div className="stat-card-label">Unpaid Invoices</div></div>
                    <div className="stat-card-value">{invoices.filter(i => i.payment_status === 'Unpaid').length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header"><div className="stat-card-label">Partial Payments</div></div>
                    <div className="stat-card-value">{invoices.filter(i => i.payment_status === 'Partial').length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header"><div className="stat-card-label">Total Outstanding</div></div>
                    <div className="stat-card-value">₹{invoices.reduce((s, i) => s + (i.total - i.amount_paid), 0).toLocaleString('en-IN')}</div>
                </div>
            </div>

            {invoices.length > 0 ? (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Customer</th>
                                <th>Total</th>
                                <th>Paid</th>
                                <th>Balance</th>
                                <th>Status</th>
                                <th>Due Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map(inv => (
                                <tr key={inv.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{inv.invoice_number}</td>
                                    <td>{inv.customer_name}</td>
                                    <td>₹{inv.total.toLocaleString('en-IN')}</td>
                                    <td style={{ color: 'var(--success)' }}>₹{inv.amount_paid.toLocaleString('en-IN')}</td>
                                    <td style={{ fontWeight: 600, color: 'var(--warning)' }}>₹{(inv.total - inv.amount_paid).toLocaleString('en-IN')}</td>
                                    <td>{paymentBadge(inv.payment_status)}</td>
                                    <td>{inv.due_date || '—'}</td>
                                    <td>
                                        <button className="btn btn-primary btn-sm" onClick={() => openPayment(inv)}><CreditCard size={14} /> Pay</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => sendReminder(inv.id)} title="Send Reminder"><MessageCircle size={14} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card empty-state">
                    <CreditCard size={48} />
                    <h4>All paid!</h4>
                    <p>No outstanding invoices</p>
                </div>
            )}

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Record Payment — ${selectedInvoice?.invoice_number}`}
                footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handlePay}>Record Payment</button></>}>
                {selectedInvoice && (
                    <>
                        <div style={{ background: 'var(--bg-input)', padding: 14, borderRadius: 'var(--radius-sm)', marginBottom: 16, border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ color: 'var(--text-muted)' }}>Invoice Total:</span>
                                <span style={{ fontWeight: 600 }}>₹{selectedInvoice.total.toLocaleString('en-IN')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ color: 'var(--text-muted)' }}>Already Paid:</span>
                                <span style={{ color: 'var(--success)' }}>₹{selectedInvoice.amount_paid.toLocaleString('en-IN')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.05rem' }}>
                                <span>Balance:</span>
                                <span style={{ color: 'var(--warning)' }}>₹{(selectedInvoice.total - selectedInvoice.amount_paid).toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group"><label>Amount (₹)</label><input type="number" className="form-control" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                            <div className="form-group"><label>Date</label><input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                        </div>
                        <div className="form-group"><label>Payment Method</label>
                            <select className="form-control" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                                <option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Cheque</option><option>Card</option><option>Other</option>
                            </select>
                        </div>
                        <div className="form-group"><label>Notes</label><input className="form-control" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Payment reference / notes" /></div>
                    </>
                )}
            </Modal>
        </div>
    );
}
