import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'billflow-secret-key-2026';

export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
}

export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions.' });
        }
        next();
    };
}

const PERMISSIONS = {
    customers: { read: ['Admin', 'Accountant', 'Sales'], write: ['Admin', 'Accountant', 'Sales'], update: ['Admin', 'Accountant', 'Sales'], delete: ['Admin'] },
    products: { read: ['Admin', 'Accountant', 'Sales'], write: ['Admin', 'Accountant', 'Sales'], update: ['Admin', 'Accountant', 'Sales'], delete: ['Admin'] },
    invoices: { read: ['Admin', 'Accountant', 'Sales'], write: ['Admin', 'Accountant', 'Sales'], update: ['Admin', 'Accountant'], delete: ['Admin'] },
    payments: { read: ['Admin', 'Accountant'], write: ['Admin', 'Accountant'] },
    reports: { read: ['Admin', 'Accountant'] },
    settings: { read: ['Admin'], write: ['Admin'] },
    users: { manage: ['Admin'] }
};

export function requirePermission(resource, action = 'read') {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        const allowedRoles = PERMISSIONS[resource]?.[action] || [];
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions.' });
        }

        next();
    };
}

export { JWT_SECRET };
