import { Router } from 'express';
import { prepare, saveDB } from '../db.js';

const router = Router();

// POST /api/payments
router.post('/', (req, res) => {
    try {
        const { invoice_id, amount, date, method, notes } = req.body;
        if (!invoice_id || !amount) return res.status(400).json({ error: 'Invoice ID and amount required.' });

        const invoice = prepare('SELECT * FROM invoices WHERE id = ?').get(parseInt(invoice_id));
        if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

        const result = prepare('INSERT INTO payments (invoice_id, amount, date, method, notes) VALUES (?, ?, ?, ?, ?)').run(parseInt(invoice_id), amount, date || new Date().toISOString().split('T')[0], method || 'Cash', notes || '');

        const newAmountPaid = Number(invoice.amount_paid) + Number(amount);
        let paymentStatus = 'Partial';
        if (newAmountPaid >= invoice.total) paymentStatus = 'Paid';
        if (newAmountPaid <= 0) paymentStatus = 'Unpaid';

        prepare('UPDATE invoices SET amount_paid = ?, payment_status = ?, status = ? WHERE id = ?').run(
            Math.round(newAmountPaid * 100) / 100,
            paymentStatus,
            paymentStatus === 'Paid' ? 'Paid' : invoice.status,
            parseInt(invoice_id)
        );

        saveDB();
        const payment = prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(payment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/payments/invoice/:invoiceId
router.get('/invoice/:invoiceId', (req, res) => {
    try {
        const payments = prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY date DESC').all(parseInt(req.params.invoiceId));
        res.json(payments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/payments/reminder/:invoiceId
router.get('/reminder/:invoiceId', (req, res) => {
    try {
        const invoice = prepare(`SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE i.id = ?`).get(parseInt(req.params.invoiceId));
        if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

        const outstanding = Number(invoice.total) - Number(invoice.amount_paid);
        const message = `Dear ${invoice.customer_name},\n\nThis is a friendly reminder that invoice ${invoice.invoice_number} has an outstanding balance of ₹${outstanding.toFixed(2)}.\n\nInvoice Total: ₹${Number(invoice.total).toFixed(2)}\nPaid: ₹${Number(invoice.amount_paid).toFixed(2)}\nBalance: ₹${outstanding.toFixed(2)}\nDue Date: ${invoice.due_date || 'N/A'}\n\nPlease make the payment at your earliest convenience.\n\nThank you!`;

        const phone = (invoice.customer_phone || '').replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

        res.json({ message, whatsappUrl, email: invoice.customer_email, outstanding });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
