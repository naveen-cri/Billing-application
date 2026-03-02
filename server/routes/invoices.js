import { Router } from 'express';
import { prepare, saveDB } from '../db.js';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = Router();

function generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const last = prepare("SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1").get(`INV-${year}-%`);
    let seq = 1;
    if (last) {
        const parts = last.invoice_number.split('-');
        seq = parseInt(parts[2]) + 1;
    }
    return `INV-${year}-${String(seq).padStart(4, '0')}`;
}

// GET /api/invoices
router.get('/', (req, res) => {
    try {
        const { status, payment_status, search, created_by } = req.query;
        let sql = `SELECT i.*, c.name as customer_name, c.gstin as customer_gstin 
               FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE 1=1`;
        const params = [];

        if (status) { sql += ' AND i.status = ?'; params.push(status); }
        if (payment_status) { sql += ' AND i.payment_status = ?'; params.push(payment_status); }
        if (created_by) { sql += ' AND i.created_by = ?'; params.push(parseInt(created_by)); }
        if (search) { sql += ' AND (i.invoice_number LIKE ? OR c.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

        sql += ' ORDER BY i.created_at DESC';
        const invoices = prepare(sql).all(...params);
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/invoices/:id
router.get('/:id', (req, res) => {
    try {
        if (req.params.id === 'undefined') return res.status(400).json({ error: 'Invalid ID' });
        const invoice = prepare(`SELECT i.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone, c.address as customer_address, c.city as customer_city, c.state as customer_state, c.pincode as customer_pincode, c.gstin as customer_gstin FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE i.id = ?`).get(parseInt(req.params.id));
        if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

        const items = prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(parseInt(req.params.id));
        const payments = prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY date DESC').all(parseInt(req.params.id));

        res.json({ ...invoice, items, payments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/invoices
router.post('/', (req, res) => {
    try {
        const { customer_id, date, due_date, items, notes, is_igst } = req.body;
        if (!customer_id || !items || !items.length) {
            return res.status(400).json({ error: 'Customer and at least one item required.' });
        }

        const invoice_number = generateInvoiceNumber();
        let subtotal = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;

        for (const item of items) {
            const itemTotal = (item.quantity || 1) * (item.unit_price || 0);
            const taxAmount = itemTotal * ((item.tax_rate || 0) / 100);
            subtotal += itemTotal;
            if (is_igst) {
                totalIgst += taxAmount;
            } else {
                totalCgst += taxAmount / 2;
                totalSgst += taxAmount / 2;
            }
        }

        const total = subtotal + totalCgst + totalSgst + totalIgst;
        const created_by = req.user ? req.user.id : null;

        const result = prepare(`INSERT INTO invoices (invoice_number, customer_id, date, due_date, subtotal, cgst, sgst, igst, total, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(invoice_number, parseInt(customer_id), date || new Date().toISOString().split('T')[0], due_date || '', Math.round(subtotal * 100) / 100, Math.round(totalCgst * 100) / 100, Math.round(totalSgst * 100) / 100, Math.round(totalIgst * 100) / 100, Math.round(total * 100) / 100, notes || '', created_by);

        const invoiceId = result.lastInsertRowid;

        for (const item of items) {
            const qty = item.quantity || 1;
            const price = item.unit_price || 0;
            const itemTotal = qty * price;
            const taxAmount = itemTotal * ((item.tax_rate || 0) / 100);
            prepare('INSERT INTO invoice_items (invoice_id, product_id, description, hsn_sac_code, quantity, unit_price, tax_rate, tax_amount, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(invoiceId, item.product_id ? parseInt(item.product_id) : null, item.description || '', item.hsn_sac_code || '', qty, price, item.tax_rate || 0, Math.round(taxAmount * 100) / 100, Math.round((itemTotal + taxAmount) * 100) / 100);

            if (item.product_id) {
                prepare('UPDATE products SET stock_quantity = MAX(0, stock_quantity - ?) WHERE id = ?').run(qty, parseInt(item.product_id));
            }
        }

        saveDB();
        const invoice = prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
        res.status(201).json(invoice);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/invoices/:id
router.put('/:id', (req, res) => {
    try {
        const { customer_id, date, due_date, items, notes, is_igst, status } = req.body;

        if (status) {
            prepare('UPDATE invoices SET status = ? WHERE id = ?').run(status, parseInt(req.params.id));
            saveDB();
            const invoice = prepare('SELECT * FROM invoices WHERE id = ?').get(parseInt(req.params.id));
            return res.json(invoice);
        }

        let subtotal = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;

        if (items) {
            for (const item of items) {
                const itemTotal = (item.quantity || 1) * (item.unit_price || 0);
                const taxAmount = itemTotal * ((item.tax_rate || 0) / 100);
                subtotal += itemTotal;
                if (is_igst) { totalIgst += taxAmount; } else { totalCgst += taxAmount / 2; totalSgst += taxAmount / 2; }
            }
        }

        const total = subtotal + totalCgst + totalSgst + totalIgst;

        prepare('UPDATE invoices SET customer_id=?, date=?, due_date=?, subtotal=?, cgst=?, sgst=?, igst=?, total=?, notes=? WHERE id=?').run(parseInt(customer_id), date, due_date || '', Math.round(subtotal * 100) / 100, Math.round(totalCgst * 100) / 100, Math.round(totalSgst * 100) / 100, Math.round(totalIgst * 100) / 100, Math.round(total * 100) / 100, notes || '', parseInt(req.params.id));

        if (items) {
            prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(parseInt(req.params.id));
            for (const item of items) {
                const qty = item.quantity || 1;
                const price = item.unit_price || 0;
                const itemTotal = qty * price;
                const taxAmount = itemTotal * ((item.tax_rate || 0) / 100);
                prepare('INSERT INTO invoice_items (invoice_id, product_id, description, hsn_sac_code, quantity, unit_price, tax_rate, tax_amount, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(parseInt(req.params.id), item.product_id ? parseInt(item.product_id) : null, item.description || '', item.hsn_sac_code || '', qty, price, item.tax_rate || 0, Math.round(taxAmount * 100) / 100, Math.round((itemTotal + taxAmount) * 100) / 100);
            }
        }

        saveDB();
        const invoice = prepare(`SELECT i.*, c.name as customer_name FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE i.id = ?`).get(parseInt(req.params.id));
        res.json(invoice);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/invoices/:id
router.delete('/:id', (req, res) => {
    try {
        prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(parseInt(req.params.id));
        prepare('DELETE FROM invoices WHERE id = ?').run(parseInt(req.params.id));
        saveDB();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/invoices/:id/pdf
router.get('/:id/pdf', (req, res) => {
    try {
        const invoice = prepare(`SELECT i.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone, c.address as customer_address, c.city as customer_city, c.state as customer_state, c.pincode as customer_pincode, c.gstin as customer_gstin FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE i.id = ?`).get(parseInt(req.params.id));
        if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

        const items = prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(parseInt(req.params.id));
        const settings = prepare('SELECT * FROM settings WHERE id = 1').get();

        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
        doc.pipe(res);

        // Header with logo
        if (settings && settings.business_logo) {
            const logoPath = join(__dirname, '..', 'uploads', settings.business_logo);
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 50, 30, { width: 80 });
            }
        }

        // Business info
        const bizX = (settings && settings.business_logo) ? 140 : 50;
        doc.fontSize(20).font('Helvetica-Bold').text(settings?.business_name || 'Business Name', bizX, 40);
        doc.fontSize(9).font('Helvetica').text(settings?.business_address || '', bizX, 65);
        if (settings?.business_city) doc.text(`${settings.business_city}, ${settings.business_state || ''} ${settings.business_pincode || ''}`);
        if (settings?.business_phone) doc.text(`Phone: ${settings.business_phone}`);
        if (settings?.business_email) doc.text(`Email: ${settings.business_email}`);
        if (settings?.business_gstin) doc.text(`GSTIN: ${settings.business_gstin}`);

        doc.moveDown(2);
        doc.fontSize(16).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
        doc.moveDown(0.5);

        const detailsY = doc.y;
        doc.fontSize(10).font('Helvetica-Bold').text('Invoice Number:', 50, detailsY);
        doc.font('Helvetica').text(invoice.invoice_number, 160, detailsY);
        doc.font('Helvetica-Bold').text('Date:', 50, detailsY + 16);
        doc.font('Helvetica').text(invoice.date, 160, detailsY + 16);
        if (invoice.due_date) {
            doc.font('Helvetica-Bold').text('Due Date:', 50, detailsY + 32);
            doc.font('Helvetica').text(invoice.due_date, 160, detailsY + 32);
        }

        doc.font('Helvetica-Bold').text('Bill To:', 350, detailsY);
        doc.font('Helvetica').text(invoice.customer_name, 350, detailsY + 16);
        if (invoice.customer_address) doc.text(invoice.customer_address, 350, detailsY + 32);
        if (invoice.customer_gstin) doc.text(`GSTIN: ${invoice.customer_gstin}`);

        doc.moveDown(3);
        const tableTop = doc.y;

        doc.rect(50, tableTop, 500, 20).fill('#1a1a2e');
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
        doc.text('#', 55, tableTop + 5, { width: 25 });
        doc.text('Description', 80, tableTop + 5, { width: 140 });
        doc.text('HSN/SAC', 220, tableTop + 5, { width: 60 });
        doc.text('Qty', 285, tableTop + 5, { width: 40 });
        doc.text('Rate', 330, tableTop + 5, { width: 60 });
        doc.text('Tax %', 395, tableTop + 5, { width: 40 });
        doc.text('Tax Amt', 440, tableTop + 5, { width: 50 });
        doc.text('Total', 495, tableTop + 5, { width: 55 });

        let rowY = tableTop + 25;
        doc.fillColor('#000000').font('Helvetica').fontSize(8);
        items.forEach((item, i) => {
            if (i % 2 === 0) doc.rect(50, rowY - 3, 500, 18).fill('#f5f5f5').fillColor('#000000');
            doc.text(String(i + 1), 55, rowY, { width: 25 });
            doc.text(item.description || '', 80, rowY, { width: 140 });
            doc.text(item.hsn_sac_code || '', 220, rowY, { width: 60 });
            doc.text(String(item.quantity), 285, rowY, { width: 40 });
            doc.text(`₹${Number(item.unit_price).toFixed(2)}`, 330, rowY, { width: 60 });
            doc.text(`${item.tax_rate}%`, 395, rowY, { width: 40 });
            doc.text(`₹${Number(item.tax_amount).toFixed(2)}`, 440, rowY, { width: 50 });
            doc.text(`₹${Number(item.total).toFixed(2)}`, 495, rowY, { width: 55 });
            rowY += 18;
        });

        rowY += 10;
        doc.font('Helvetica').fontSize(10);
        doc.text('Subtotal:', 380, rowY); doc.text(`₹${Number(invoice.subtotal).toFixed(2)}`, 480, rowY);
        rowY += 18;
        if (invoice.cgst > 0) { doc.text('CGST:', 380, rowY); doc.text(`₹${Number(invoice.cgst).toFixed(2)}`, 480, rowY); rowY += 18; }
        if (invoice.sgst > 0) { doc.text('SGST:', 380, rowY); doc.text(`₹${Number(invoice.sgst).toFixed(2)}`, 480, rowY); rowY += 18; }
        if (invoice.igst > 0) { doc.text('IGST:', 380, rowY); doc.text(`₹${Number(invoice.igst).toFixed(2)}`, 480, rowY); rowY += 18; }

        doc.rect(370, rowY, 180, 1).fill('#333');
        rowY += 8;
        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('Total:', 380, rowY); doc.text(`₹${Number(invoice.total).toFixed(2)}`, 480, rowY);

        if (invoice.notes) {
            rowY += 40;
            doc.font('Helvetica-Bold').fontSize(10).text('Notes:', 50, rowY);
            doc.font('Helvetica').fontSize(9).text(invoice.notes, 50, rowY + 15, { width: 300 });
        }

        doc.fontSize(8).font('Helvetica').fillColor('#666').text('This is a computer-generated invoice.', 50, 750, { align: 'center' });

        doc.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/invoices/:id/whatsapp
router.get('/:id/whatsapp', (req, res) => {
    try {
        const invoice = prepare(`SELECT i.*, c.name as customer_name, c.phone as customer_phone FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id WHERE i.id = ?`).get(parseInt(req.params.id));
        if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

        const message = `Hello ${invoice.customer_name},\n\nInvoice ${invoice.invoice_number} for ₹${Number(invoice.total).toFixed(2)} has been generated.\nDate: ${invoice.date}\nDue: ${invoice.due_date || 'N/A'}\n\nThank you for your business!`;
        const phone = (invoice.customer_phone || '').replace(/[^0-9]/g, '');
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

        res.json({ url, message });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
