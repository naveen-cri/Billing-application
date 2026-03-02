import { Router } from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { prepare, saveDB } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const storage = multer.diskStorage({
    destination: join(__dirname, '..', 'uploads'),
    filename: (req, file, cb) => {
        const ext = file.originalname.split('.').pop();
        cb(null, `logo-${Date.now()}.${ext}`);
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

// GET /api/settings
router.get('/', (req, res) => {
    try {
        const settings = prepare('SELECT * FROM settings WHERE id = 1').get();
        res.json(settings || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/settings
router.put('/', (req, res) => {
    try {
        const { business_name, business_address, business_city, business_state, business_pincode, business_gstin, business_phone, business_email } = req.body;

        prepare(`UPDATE settings SET business_name=?, business_address=?, business_city=?, business_state=?, business_pincode=?, business_gstin=?, business_phone=?, business_email=? WHERE id=1`).run(
            business_name || '', business_address || '', business_city || '', business_state || '', business_pincode || '', business_gstin || '', business_phone || '', business_email || ''
        );

        saveDB();
        const settings = prepare('SELECT * FROM settings WHERE id = 1').get();
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/settings/logo
router.post('/logo', upload.single('logo'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
        prepare('UPDATE settings SET business_logo = ? WHERE id = 1').run(req.file.filename);
        saveDB();
        res.json({ filename: req.file.filename });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
