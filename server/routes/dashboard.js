import { Router } from 'express';
import { prepare } from '../db.js';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', (req, res) => {
    try {
        const { period } = req.query;
        let dateFilter = '';
        const today = new Date().toISOString().split('T')[0];

        if (period === 'daily') {
            dateFilter = ` AND date = '${today}'`;
        } else if (period === 'monthly') {
            const month = today.substring(0, 7);
            dateFilter = ` AND date LIKE '${month}%'`;
        } else if (period === 'yearly') {
            const year = today.substring(0, 4);
            dateFilter = ` AND date LIKE '${year}%'`;
        }

        const totalSales = prepare(`SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE payment_status = 'Paid'${dateFilter}`).get();
        const totalRevenue = prepare(`SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE 1=1${dateFilter}`).get();
        const outstanding = prepare(`SELECT COALESCE(SUM(total - amount_paid), 0) as total FROM invoices WHERE payment_status != 'Paid'`).get();
        const customerCount = prepare('SELECT COUNT(*) as count FROM customers').get();
        const invoiceCount = prepare(`SELECT COUNT(*) as count FROM invoices WHERE 1=1${dateFilter}`).get();
        const paidCount = prepare(`SELECT COUNT(*) as count FROM invoices WHERE payment_status = 'Paid'${dateFilter}`).get();
        const unpaidCount = prepare(`SELECT COUNT(*) as count FROM invoices WHERE payment_status != 'Paid'${dateFilter}`).get();

        res.json({
            totalSales: totalSales?.total || 0,
            totalRevenue: totalRevenue?.total || 0,
            outstanding: outstanding?.total || 0,
            customerCount: customerCount?.count || 0,
            invoiceCount: invoiceCount?.count || 0,
            paidCount: paidCount?.count || 0,
            unpaidCount: unpaidCount?.count || 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/dashboard/gst-summary
router.get('/gst-summary', (req, res) => {
    try {
        const summary = prepare(`SELECT COALESCE(SUM(cgst), 0) as total_cgst, COALESCE(SUM(sgst), 0) as total_sgst, COALESCE(SUM(igst), 0) as total_igst, COALESCE(SUM(cgst + sgst + igst), 0) as total_gst FROM invoices`).get();
        res.json(summary || { total_cgst: 0, total_sgst: 0, total_igst: 0, total_gst: 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/dashboard/monthly-revenue
router.get('/monthly-revenue', (req, res) => {
    try {
        const data = prepare(`
      SELECT strftime('%Y-%m', date) as month, 
             SUM(total) as revenue, 
             COUNT(*) as count 
      FROM invoices 
      WHERE date >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', date) 
      ORDER BY month
    `).all();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/dashboard/recent-invoices
router.get('/recent-invoices', (req, res) => {
    try {
        const invoices = prepare(`SELECT i.*, c.name as customer_name FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id ORDER BY i.created_at DESC LIMIT 10`).all();
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
