import { Router } from 'express';
import { requirePermission } from '../middleware/auth.js';
import { prepare } from '../db.js';

const router = Router();

// GET /api/reports/sales
router.get('/sales', requirePermission('reports', 'read'), (req, res) => {
    try {
        const { from, to } = req.query;
        let sql = `SELECT i.*, c.name as customer_name FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE 1=1`;
        const params = [];
        if (from) { sql += ' AND i.date >= ?'; params.push(from); }
        if (to) { sql += ' AND i.date <= ?'; params.push(to); }
        sql += ' ORDER BY i.date DESC';

        const invoices = prepare(sql).all(...params);
        const summary = {
            totalInvoices: invoices.length,
            totalAmount: invoices.reduce((s, i) => s + Number(i.total), 0),
            totalPaid: invoices.reduce((s, i) => s + Number(i.amount_paid), 0),
            totalOutstanding: invoices.reduce((s, i) => s + (Number(i.total) - Number(i.amount_paid)), 0)
        };

        res.json({ invoices, summary });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/gst
router.get('/gst', requirePermission('reports', 'read'), (req, res) => {
    try {
        const { from, to } = req.query;
        let sql = `SELECT i.invoice_number, i.date, c.name as customer_name, c.gstin as customer_gstin, i.subtotal, i.cgst, i.sgst, i.igst, i.total FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE 1=1`;
        const params = [];
        if (from) { sql += ' AND i.date >= ?'; params.push(from); }
        if (to) { sql += ' AND i.date <= ?'; params.push(to); }
        sql += ' ORDER BY i.date DESC';

        const invoices = prepare(sql).all(...params);
        const summary = {
            totalCgst: invoices.reduce((s, i) => s + Number(i.cgst), 0),
            totalSgst: invoices.reduce((s, i) => s + Number(i.sgst), 0),
            totalIgst: invoices.reduce((s, i) => s + Number(i.igst), 0),
            totalGst: invoices.reduce((s, i) => s + Number(i.cgst) + Number(i.sgst) + Number(i.igst), 0),
            totalTaxableAmount: invoices.reduce((s, i) => s + Number(i.subtotal), 0)
        };

        res.json({ invoices, summary });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/reports/outstanding
router.get('/outstanding', requirePermission('reports', 'read'), (req, res) => {
    try {
        const invoices = prepare(`SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE i.payment_status != 'Paid' ORDER BY i.due_date ASC`).all();

        const summary = {
            totalOutstanding: invoices.reduce((s, i) => s + (Number(i.total) - Number(i.amount_paid)), 0),
            totalInvoices: invoices.length
        };

        res.json({ invoices, summary });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
