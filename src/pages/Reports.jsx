import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart3, FileText, IndianRupee, AlertTriangle } from 'lucide-react';

export default function Reports() {
    const { api } = useAuth();
    const [activeTab, setActiveTab] = useState('sales');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [salesData, setSalesData] = useState(null);
    const [gstData, setGstData] = useState(null);
    const [outstandingData, setOutstandingData] = useState(null);
    const [loading, setLoading] = useState(false);

    const loadReport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (dateFrom) params.set('from', dateFrom);
            if (dateTo) params.set('to', dateTo);

            if (activeTab === 'sales') {
                const res = await api(`/api/reports/sales?${params}`);
                setSalesData(await res.json());
            } else if (activeTab === 'gst') {
                const res = await api(`/api/reports/gst?${params}`);
                setGstData(await res.json());
            } else {
                const res = await api('/api/reports/outstanding');
                setOutstandingData(await res.json());
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    useEffect(() => { loadReport(); }, [activeTab]);

    const statusBadge = (status) => {
        const map = { Paid: 'success', Sent: 'info', Draft: 'neutral', Overdue: 'danger' };
        return <span className={`badge badge-${map[status] || 'neutral'}`}>{status}</span>;
    };

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>Reports</h2>
            </div>

            <div className="tabs">
                {['sales', 'gst', 'outstanding'].map(tab => (
                    <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                        {tab === 'sales' && <><IndianRupee size={14} /> Sales</>}
                        {tab === 'gst' && <><BarChart3 size={14} /> GST</>}
                        {tab === 'outstanding' && <><AlertTriangle size={14} /> Outstanding</>}
                    </button>
                ))}
            </div>

            {activeTab !== 'outstanding' && (
                <div className="toolbar">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.75rem' }}>From</label>
                        <input type="date" className="form-control" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 160 }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.75rem' }}>To</label>
                        <input type="date" className="form-control" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 160 }} />
                    </div>
                    <button className="btn btn-primary" onClick={loadReport} style={{ alignSelf: 'flex-end' }}>Generate</button>
                </div>
            )}

            {loading && <div className="loading"><div className="spinner"></div></div>}

            {/* Sales Report */}
            {activeTab === 'sales' && salesData && !loading && (
                <>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        <div className="stat-card"><div className="stat-card-label">Total Invoices</div><div className="stat-card-value">{salesData.summary.totalInvoices}</div></div>
                        <div className="stat-card"><div className="stat-card-label">Total Amount</div><div className="stat-card-value">₹{salesData.summary.totalAmount.toLocaleString('en-IN')}</div></div>
                        <div className="stat-card"><div className="stat-card-label">Received</div><div className="stat-card-value" style={{ color: 'var(--success)' }}>₹{salesData.summary.totalPaid.toLocaleString('en-IN')}</div></div>
                        <div className="stat-card"><div className="stat-card-label">Outstanding</div><div className="stat-card-value" style={{ color: 'var(--warning)' }}>₹{salesData.summary.totalOutstanding.toLocaleString('en-IN')}</div></div>
                    </div>
                    {salesData.invoices.length > 0 && (
                        <div className="table-container">
                            <table>
                                <thead><tr><th>Invoice #</th><th>Customer</th><th>Date</th><th>Total</th><th>Paid</th><th>Status</th></tr></thead>
                                <tbody>
                                    {salesData.invoices.map(inv => (
                                        <tr key={inv.id}>
                                            <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                                            <td>{inv.customer_name}</td>
                                            <td>{inv.date}</td>
                                            <td>₹{inv.total.toLocaleString('en-IN')}</td>
                                            <td>₹{inv.amount_paid.toLocaleString('en-IN')}</td>
                                            <td>{statusBadge(inv.status)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* GST Report */}
            {activeTab === 'gst' && gstData && !loading && (
                <>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                        <div className="stat-card"><div className="stat-card-label">Taxable Amount</div><div className="stat-card-value">₹{gstData.summary.totalTaxableAmount.toLocaleString('en-IN')}</div></div>
                        <div className="stat-card"><div className="stat-card-label">CGST</div><div className="stat-card-value">₹{gstData.summary.totalCgst.toLocaleString('en-IN')}</div></div>
                        <div className="stat-card"><div className="stat-card-label">SGST</div><div className="stat-card-value">₹{gstData.summary.totalSgst.toLocaleString('en-IN')}</div></div>
                        <div className="stat-card"><div className="stat-card-label">IGST</div><div className="stat-card-value">₹{gstData.summary.totalIgst.toLocaleString('en-IN')}</div></div>
                        <div className="stat-card"><div className="stat-card-label">Total GST</div><div className="stat-card-value" style={{ color: 'var(--accent)' }}>₹{gstData.summary.totalGst.toLocaleString('en-IN')}</div></div>
                    </div>
                    {gstData.invoices.length > 0 && (
                        <div className="table-container">
                            <table>
                                <thead><tr><th>Invoice #</th><th>Date</th><th>Customer</th><th>GSTIN</th><th>Taxable</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total</th></tr></thead>
                                <tbody>
                                    {gstData.invoices.map((inv, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                                            <td>{inv.date}</td>
                                            <td>{inv.customer_name}</td>
                                            <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{inv.customer_gstin}</td>
                                            <td>₹{inv.subtotal.toLocaleString('en-IN')}</td>
                                            <td>₹{inv.cgst.toLocaleString('en-IN')}</td>
                                            <td>₹{inv.sgst.toLocaleString('en-IN')}</td>
                                            <td>₹{inv.igst.toLocaleString('en-IN')}</td>
                                            <td style={{ fontWeight: 600 }}>₹{inv.total.toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Outstanding Report */}
            {activeTab === 'outstanding' && outstandingData && !loading && (
                <>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                        <div className="stat-card"><div className="stat-card-label">Total Outstanding</div><div className="stat-card-value" style={{ color: 'var(--warning)' }}>₹{outstandingData.summary.totalOutstanding.toLocaleString('en-IN')}</div></div>
                        <div className="stat-card"><div className="stat-card-label">Unpaid Invoices</div><div className="stat-card-value">{outstandingData.summary.totalInvoices}</div></div>
                    </div>
                    {outstandingData.invoices.length > 0 && (
                        <div className="table-container">
                            <table>
                                <thead><tr><th>Invoice #</th><th>Customer</th><th>Total</th><th>Paid</th><th>Balance</th><th>Due Date</th><th>Status</th></tr></thead>
                                <tbody>
                                    {outstandingData.invoices.map(inv => (
                                        <tr key={inv.id}>
                                            <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                                            <td>{inv.customer_name}</td>
                                            <td>₹{inv.total.toLocaleString('en-IN')}</td>
                                            <td>₹{inv.amount_paid.toLocaleString('en-IN')}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--warning)' }}>₹{(inv.total - inv.amount_paid).toLocaleString('en-IN')}</td>
                                            <td>{inv.due_date || '—'}</td>
                                            <td>{statusBadge(inv.status)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
