import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { initDB } from './db.js';
import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customers.js';
import productRoutes from './routes/products.js';
import invoiceRoutes from './routes/invoices.js';
import paymentRoutes from './routes/payments.js';
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';
import { authenticateToken } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', authenticateToken, customerRoutes);
app.use('/api/products', authenticateToken, productRoutes);
app.use('/api/invoices', authenticateToken, invoiceRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Initialize DB then start server
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 BillFlow API server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
