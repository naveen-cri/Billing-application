import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'billing.db');
const uploadsDir = join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

let db;

export async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Sales' CHECK(role IN ('Admin','Accountant','Sales')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      gstin TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      hsn_sac_code TEXT,
      price REAL NOT NULL DEFAULT 0,
      tax_rate REAL NOT NULL DEFAULT 18,
      unit TEXT DEFAULT 'Nos',
      stock_quantity INTEGER DEFAULT 0,
      low_stock_threshold INTEGER DEFAULT 10,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      due_date TEXT,
      subtotal REAL DEFAULT 0,
      cgst REAL DEFAULT 0,
      sgst REAL DEFAULT 0,
      igst REAL DEFAULT 0,
      total REAL DEFAULT 0,
      status TEXT DEFAULT 'Draft' CHECK(status IN ('Draft','Sent','Paid','Overdue','Cancelled')),
      payment_status TEXT DEFAULT 'Unpaid' CHECK(payment_status IN ('Unpaid','Partial','Paid')),
      amount_paid REAL DEFAULT 0,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      product_id INTEGER,
      description TEXT,
      hsn_sac_code TEXT,
      quantity REAL DEFAULT 1,
      unit_price REAL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      method TEXT DEFAULT 'Cash',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      business_name TEXT DEFAULT 'My Business',
      business_address TEXT DEFAULT '',
      business_city TEXT DEFAULT '',
      business_state TEXT DEFAULT '',
      business_pincode TEXT DEFAULT '',
      business_gstin TEXT DEFAULT '',
      business_phone TEXT DEFAULT '',
      business_email TEXT DEFAULT '',
      business_logo TEXT DEFAULT ''
    )
  `);

  // Insert default settings if not exists
  const settingsCheck = db.exec('SELECT id FROM settings WHERE id = 1');
  if (settingsCheck.length === 0 || settingsCheck[0].values.length === 0) {
    db.run('INSERT INTO settings (id) VALUES (1)');
  }

  // Seed admin user if no users exist
  const userCountResult = db.exec('SELECT COUNT(*) as count FROM users');
  const userCount = userCountResult[0].values[0][0];
  if (userCount === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.run('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', ['Admin', 'admin@billflow.com', hash, 'Admin']);
  }

  saveDB();
  return db;
}

export function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// Helper functions to match better-sqlite3 API style
export function getDB() { return db; }

export function prepare(sql) {
  return {
    run: (...params) => {
      db.run(sql, params);
      saveDB();
      return { lastInsertRowid: getLastInsertRowId(), changes: db.getRowsModified() };
    },
    get: (...params) => {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return undefined;
    },
    all: (...params) => {
      const results = [];
      const stmt = db.prepare(sql);
      stmt.bind(params);
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      return results;
    }
  };
}

function getLastInsertRowId() {
  const result = db.exec('SELECT last_insert_rowid()');
  return result[0].values[0][0];
}

export default { initDB, getDB, prepare, saveDB };
