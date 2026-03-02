import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prepare } from '../db.js';
import { JWT_SECRET, authenticateToken } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/signup
router.post('/signup', (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required.' });
        }

        const existing = prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(409).json({ error: 'Email already registered.' });
        }

        const validRoles = ['Admin', 'Accountant', 'Sales'];
        const userRole = validRoles.includes(role) ? role : 'Sales';
        const hash = bcrypt.hashSync(password, 10);

        const result = prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(name, email, hash, userRole);

        const token = jwt.sign({ id: result.lastInsertRowid, name, email, role: userRole }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ token, user: { id: result.lastInsertRowid, name, email, role: userRole } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const valid = bcrypt.compareSync(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
    try {
        const user = prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found.' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/auth/users (admin only)
router.get('/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Admin only.' });
    try {
        const users = prepare('SELECT id, name, email, role, created_at FROM users').all();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
