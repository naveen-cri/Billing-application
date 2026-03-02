import { Router } from 'express';
import { requirePermission } from '../middleware/auth.js';
import { prepare, getDB } from '../db.js';

const router = Router();

// GET /api/customers
router.get('/', requirePermission('customers', 'read'), (req, res) => {
    try {
        const { search } = req.query;
        let customers;
        if (search) {
            customers = prepare("SELECT * FROM customers WHERE name LIKE ? OR email LIKE ? OR gstin LIKE ? ORDER BY name").all(`%${search}%`, `%${search}%`, `%${search}%`);
        } else {
            customers = prepare('SELECT * FROM customers ORDER BY name').all();
        }
        res.json(customers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/customers/:id
router.get('/:id', requirePermission('customers', 'read'), (req, res) => {
    try {
        const customer = prepare('SELECT * FROM customers WHERE id = ?').get(parseInt(req.params.id));
        if (!customer) return res.status(404).json({ error: 'Customer not found.' });
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/customers
router.post('/', requirePermission('customers', 'write'), (req, res) => {
    try {
        const { name, email, phone, address, city, state, pincode, gstin } = req.body;
        if (!name) return res.status(400).json({ error: 'Customer name is required.' });

        const result = prepare('INSERT INTO customers (name, email, phone, address, city, state, pincode, gstin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(name, email || '', phone || '', address || '', city || '', state || '', pincode || '', gstin || '');

        const customer = prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/customers/:id
router.put('/:id', requirePermission('customers', 'update'), (req, res) => {
    try {
        const { name, email, phone, address, city, state, pincode, gstin } = req.body;
        prepare('UPDATE customers SET name=?, email=?, phone=?, address=?, city=?, state=?, pincode=?, gstin=? WHERE id=?').run(name, email || '', phone || '', address || '', city || '', state || '', pincode || '', gstin || '', parseInt(req.params.id));

        const customer = prepare('SELECT * FROM customers WHERE id = ?').get(parseInt(req.params.id));
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/customers/:id
router.delete('/:id', requirePermission('customers', 'delete'), (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const db = getDB();
        const result = db.exec(`SELECT COUNT(*) FROM invoices WHERE customer_id = ${id}`);
        const count = result.length > 0 ? result[0].values[0][0] : 0;
        if (count > 0) {
            return res.status(400).json({ error: 'Cannot delete customer with existing invoices.' });
        }
        prepare('DELETE FROM customers WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete customer error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
