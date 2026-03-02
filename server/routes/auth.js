import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prepare } from '../db.js';
import { JWT_SECRET, authenticateToken, requireRole, PERMISSIONS } from '../middleware/auth.js';

const router = Router();

const VALID_ROLES = ['SuperAdmin', 'Admin', 'Accountant', 'Sales'];

// POST /api/auth/signup
router.post('/signup', (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required.' });
        }

        const existing = prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(409).json({ error: 'Email already registered.' });
        }

        const userRole = 'Sales';
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

// GET /api/auth/permissions
router.get('/permissions', authenticateToken, requireRole('SuperAdmin'), (req, res) => {
    res.json(PERMISSIONS);
});

// GET /api/auth/users (super admin only)
router.get('/users', authenticateToken, requireRole('SuperAdmin'), (req, res) => {
    try {
        const users = prepare('SELECT id, name, email, role, created_at FROM users').all();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/users (super admin only)
router.post('/users', authenticateToken, requireRole('SuperAdmin'), (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'Name, email, password and role are required.' });
        }

        if (!VALID_ROLES.includes(role)) {
            return res.status(400).json({ error: 'Invalid role.' });
        }

        const existing = prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(409).json({ error: 'Email already registered.' });
        }

        const hash = bcrypt.hashSync(password, 10);
        const result = prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(name, email, hash, role);
        const user = prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

        res.status(201).json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/auth/users/:id/role (super admin only)
router.put('/users/:id/role', authenticateToken, requireRole('SuperAdmin'), (req, res) => {
    try {
        const { role } = req.body;
        const userId = Number(req.params.id);

        if (!role || !VALID_ROLES.includes(role)) {
            return res.status(400).json({ error: 'A valid role is required.' });
        }

        const targetUser = prepare('SELECT id, role FROM users WHERE id = ?').get(userId);
        if (!targetUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        if (targetUser.id === req.user.id && role !== 'SuperAdmin') {
            return res.status(400).json({ error: 'Super Admin cannot remove own SuperAdmin role.' });
        }

        prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
        const updatedUser = prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(userId);

        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
