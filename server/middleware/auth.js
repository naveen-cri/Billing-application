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
    customers: { read: ['SuperAdmin', 'Admin', 'Accountant', 'Sales'], write: ['SuperAdmin', 'Admin', 'Accountant', 'Sales'], update: ['SuperAdmin', 'Admin', 'Accountant', 'Sales'], delete: ['SuperAdmin', 'Admin'] },
    products: { read: ['SuperAdmin', 'Admin', 'Accountant', 'Sales'], write: ['SuperAdmin', 'Admin', 'Accountant', 'Sales'], update: ['SuperAdmin', 'Admin', 'Accountant', 'Sales'], delete: ['SuperAdmin', 'Admin'] },
    invoices: { read: ['SuperAdmin', 'Admin', 'Accountant', 'Sales'], write: ['SuperAdmin', 'Admin', 'Accountant', 'Sales'], update: ['SuperAdmin', 'Admin', 'Accountant'], delete: ['SuperAdmin', 'Admin'] },
    payments: { read: ['SuperAdmin', 'Admin', 'Accountant'], write: ['SuperAdmin', 'Admin', 'Accountant'] },
    reports: { read: ['SuperAdmin', 'Admin', 'Accountant'] },
    settings: { read: ['SuperAdmin', 'Admin'], write: ['SuperAdmin', 'Admin'] },
    users: { manage: ['SuperAdmin'] }
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

export { JWT_SECRET, PERMISSIONS };
