import { Router } from 'express';
import { requirePermission } from '../middleware/auth.js';
import { prepare } from '../db.js';

const router = Router();

// GET /api/products
router.get('/', requirePermission('products', 'read'), (req, res) => {
    try {
        const { search } = req.query;
        let products;
        if (search) {
            products = prepare("SELECT * FROM products WHERE name LIKE ? OR hsn_sac_code LIKE ? ORDER BY name").all(`%${search}%`, `%${search}%`);
        } else {
            products = prepare('SELECT * FROM products ORDER BY name').all();
        }
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/products/low-stock
router.get('/low-stock', requirePermission('products', 'read'), (req, res) => {
    try {
        const products = prepare('SELECT * FROM products WHERE stock_quantity <= low_stock_threshold ORDER BY stock_quantity ASC').all();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/products/:id
router.get('/:id', requirePermission('products', 'read'), (req, res) => {
    try {
        const product = prepare('SELECT * FROM products WHERE id = ?').get(parseInt(req.params.id));
        if (!product) return res.status(404).json({ error: 'Product not found.' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/products
router.post('/', requirePermission('products', 'write'), (req, res) => {
    try {
        const { name, description, hsn_sac_code, price, tax_rate, unit, stock_quantity, low_stock_threshold } = req.body;
        if (!name) return res.status(400).json({ error: 'Product name is required.' });

        const result = prepare('INSERT INTO products (name, description, hsn_sac_code, price, tax_rate, unit, stock_quantity, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(name, description || '', hsn_sac_code || '', price || 0, tax_rate ?? 18, unit || 'Nos', stock_quantity || 0, low_stock_threshold || 10);

        const product = prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/products/:id
router.put('/:id', requirePermission('products', 'update'), (req, res) => {
    try {
        const { name, description, hsn_sac_code, price, tax_rate, unit, stock_quantity, low_stock_threshold } = req.body;
        prepare('UPDATE products SET name=?, description=?, hsn_sac_code=?, price=?, tax_rate=?, unit=?, stock_quantity=?, low_stock_threshold=? WHERE id=?').run(name, description || '', hsn_sac_code || '', price || 0, tax_rate ?? 18, unit || 'Nos', stock_quantity || 0, low_stock_threshold || 10, parseInt(req.params.id));

        const product = prepare('SELECT * FROM products WHERE id = ?').get(parseInt(req.params.id));
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/products/:id
router.delete('/:id', requirePermission('products', 'delete'), (req, res) => {
    try {
        prepare('DELETE FROM products WHERE id = ?').run(parseInt(req.params.id));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
