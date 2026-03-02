import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { IndianRupee, TrendingUp, Users, FileText, AlertTriangle, Package } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Dashboard() {
    const { api } = useAuth();
    const [stats, setStats] = useState({});
    const [gstSummary, setGstSummary] = useState({});
    const [monthlyData, setMonthlyData] = useState([]);
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [period, setPeriod] = useState('monthly');
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, [period]);

    const loadData = async () => {
        try {
            const [statsRes, gstRes, monthlyRes, recentRes, stockRes] = await Promise.all([
                api(`/api/dashboard/stats?period=${period}`),
                api('/api/dashboard/gst-summary'),
                api('/api/dashboard/monthly-revenue'),
                api('/api/dashboard/recent-invoices'),
                api('/api/products/low-stock')
            ]);
            setStats(await statsRes.json());
            setGstSummary(await gstRes.json());
            setMonthlyData(await monthlyRes.json());
            setRecentInvoices(await recentRes.json());
            setLowStock(await stockRes.json());
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const chartData = {
        labels: monthlyData.map(d => {
            const [y, m] = d.month.split('-');
            return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        }),
        datasets: [{
            label: 'Revenue',
            data: monthlyData.map(d => d.revenue),
            backgroundColor: 'rgba(99, 102, 241, 0.6)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(17, 17, 40, 0.95)',
                borderColor: 'rgba(99, 102, 241, 0.3)',
                borderWidth: 1,
                titleColor: '#e8e8f0',
                bodyColor: '#9ca3af',
                padding: 12,
                callbacks: { label: (ctx) => `₹${ctx.parsed.y.toLocaleString('en-IN')}` }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#6b7280' } },
            y: {
                grid: { color: 'rgba(99, 102, 241, 0.06)' },
                ticks: { color: '#6b7280', callback: v => `₹${(v / 1000).toFixed(0)}K` }
            }
        }
    };

    const statusBadge = (status) => {
        const map = { Paid: 'success', Sent: 'info', Draft: 'neutral', Overdue: 'danger', Cancelled: 'neutral' };
        return <span className={`badge badge-${map[status] || 'neutral'}`}>{status}</span>;
    };

    const paymentBadge = (status) => {
        const map = { Paid: 'success', Partial: 'warning', Unpaid: 'danger' };
        return <span className={`badge badge-${map[status] || 'neutral'}`}>{status}</span>;
    };

    if (loading) return <div className="loading"><div className="spinner"></div></div>;

    return (
        <div className="animate-in">
            <div className="page-header">
                <h2>Dashboard</h2>
                <div className="period-toggle">
                    {['daily', 'monthly', 'yearly'].map(p => (
                        <button key={p} className={`period-btn ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-label">Total Sales</div>
                        <div className="stat-card-icon"><IndianRupee size={20} /></div>
                    </div>
                    <div className="stat-card-value">₹{(stats.totalSales || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-label">Outstanding</div>
                        <div className="stat-card-icon"><TrendingUp size={20} /></div>
                    </div>
                    <div className="stat-card-value">₹{(stats.outstanding || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-label">Customers</div>
                        <div className="stat-card-icon"><Users size={20} /></div>
                    </div>
                    <div className="stat-card-value">{stats.customerCount || 0}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <div className="stat-card-label">Invoices</div>
                        <div className="stat-card-icon"><FileText size={20} /></div>
                    </div>
                    <div className="stat-card-value">{stats.invoiceCount || 0}</div>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="card chart-card">
                    <h3>Monthly Revenue</h3>
                    <div style={{ height: 280 }}>
                        {monthlyData.length > 0 ? <Bar data={chartData} options={chartOptions} /> :
                            <div className="empty-state"><p>No revenue data yet. Create invoices to see chart.</p></div>}
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: 16 }}>GST Summary</h3>
                    <div className="gst-summary-card">
                        <div className="gst-item">
                            <label>CGST</label>
                            <div className="value">₹{(gstSummary.total_cgst || 0).toLocaleString('en-IN')}</div>
                        </div>
                        <div className="gst-item">
                            <label>SGST</label>
                            <div className="value">₹{(gstSummary.total_sgst || 0).toLocaleString('en-IN')}</div>
                        </div>
                        <div className="gst-item">
                            <label>IGST</label>
                            <div className="value">₹{(gstSummary.total_igst || 0).toLocaleString('en-IN')}</div>
                        </div>
                        <div className="gst-item">
                            <label>Total GST</label>
                            <div className="value" style={{ color: 'var(--accent)' }}>₹{(gstSummary.total_gst || 0).toLocaleString('en-IN')}</div>
                        </div>
                    </div>

                    {lowStock.length > 0 && (
                        <div style={{ marginTop: 24 }}>
                            <h4 style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                <AlertTriangle size={16} color="var(--warning)" /> Low Stock Alerts
                            </h4>
                            {lowStock.slice(0, 5).map(p => (
                                <div key={p.id} className={`alert-badge ${p.stock_quantity === 0 ? 'alert-badge-danger' : 'alert-badge-warning'}`} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, width: '100%' }}>
                                    <span><Package size={14} /> {p.name}</span>
                                    <span>{p.stock_quantity} left</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="card">
                <h3 style={{ marginBottom: 16 }}>Recent Invoices</h3>
                {recentInvoices.length > 0 ? (
                    <div className="table-container" style={{ border: 'none' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Customer</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Payment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentInvoices.map(inv => (
                                    <tr key={inv.id}>
                                        <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                                        <td>{inv.customer_name}</td>
                                        <td>{inv.date}</td>
                                        <td>₹{inv.total.toLocaleString('en-IN')}</td>
                                        <td>{statusBadge(inv.status)}</td>
                                        <td>{paymentBadge(inv.payment_status)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <FileText size={48} />
                        <h4>No invoices yet</h4>
                        <p>Create your first invoice to get started</p>
                    </div>
                )}
            </div>
        </div>
    );
}
