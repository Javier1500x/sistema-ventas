const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Conexión a Turso (cloud) o SQLite local si no hay variables de entorno
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:inventory.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Función de ayuda: ejecutar consulta que devuelve filas
const query = async (sql, args = []) => {
  const result = await db.execute({ sql, args });
  return result.rows;
};

// Función de ayuda: ejecutar consulta que no devuelve filas (INSERT, UPDATE, DELETE)
const run = async (sql, args = []) => {
  const result = await db.execute({ sql, args });
  return { lastInsertRowid: result.lastInsertRowid, rowsAffected: result.rowsAffected };
};

// Función para inicializar la base de datos y crear las tablas
const initDb = async () => {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS sales_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productId TEXT NOT NULL,
      productName TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      date TEXT,
      transactionId INTEGER,
      paymentMethod TEXT,
      receivedAmount REAL,
      changeAmount REAL
    );

    CREATE TABLE IF NOT EXISTS cash_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      date TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'seller',
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL,
      category TEXT,
      manual_code TEXT UNIQUE,
      cost_price REAL DEFAULT 0,
      image TEXT,
      supplier_id INTEGER,
      classification TEXT DEFAULT 'B'
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_name TEXT,
      phone TEXT,
      email TEXT,
      address TEXT
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER,
      total_cost REAL,
      date TEXT,
      notes TEXT,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER,
      product_id INTEGER,
      quantity INTEGER,
      cost_price REAL,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS cash_closings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE,
      starting_cash REAL DEFAULT 0,
      total_sales REAL DEFAULT 0,
      total_entries REAL DEFAULT 0,
      total_exits REAL DEFAULT 0,
      expected_cash REAL DEFAULT 0,
      actual_cash REAL DEFAULT 0,
      difference REAL DEFAULT 0,
      notes TEXT,
      status TEXT DEFAULT 'open'
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Insertar offset de tiempo por defecto si no existe
  await db.execute({
    sql: "INSERT OR IGNORE INTO settings (key, value) VALUES ('time_offset', '-6')",
    args: []
  });

  await seedInitialUsers();

  // Migración: Asegurar que existe la columna 'classification' en 'products'
  try {
    await db.execute("ALTER TABLE products ADD COLUMN classification TEXT DEFAULT 'B'");
    console.log("Migración exitosa: Columna 'classification' añadida.");
  } catch (e) {
    // Si ya existe, ignoramos el error
    if (!e.message.includes('duplicate column name') && !e.message.includes('already exists')) {
      console.log("Aviso de migración:", e.message);
    }
  }

  console.log('Base de datos inicializada correctamente.');
};

const seedInitialUsers = async () => {
  const users = [
    { name: 'Fèlix (Admin)', email: 'felix@tienda.com', password: 'felix', role: 'admin' },
    { name: 'Vendedor Turno', email: 'vendedor@tienda.com', password: '123', role: 'seller' },
    { name: 'Gerente Inventario', email: 'gerente@tienda.com', password: 'abc', role: 'inventory_manager' }
  ];

  for (const user of users) {
    const rows = await query('SELECT id FROM users WHERE email = ?', [user.email]);
    if (rows.length === 0) {
      const password_hash = await bcrypt.hash(user.password, 10);
      await run(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [user.name, user.email, password_hash, user.role]
      );
      console.log(`Usuario ${user.email} creado.`);
    }
  }
};

// --- Usuarios ---
const getUserByEmail = async (email) => {
  const rows = await query("SELECT * FROM users WHERE email = ? AND status = 'active'", [email]);
  return rows[0] || null;
};

const getAllUsers = async () => {
  return query('SELECT id, name, email, role, status FROM users', []);
};

const createUser = async ({ name, email, password, role }) => {
  const password_hash = await bcrypt.hash(password, 10);
  const result = await run(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, password_hash, role]
  );
  return { id: Number(result.lastInsertRowid), name, email, role, status: 'active' };
};

const updateUser = async (id, { name, email, role, status, password }) => {
  let sql = 'UPDATE users SET name = ?, email = ?, role = ?, status = ?';
  const params = [name, email, role, status];
  if (password) {
    const password_hash = await bcrypt.hash(password, 10);
    sql += ', password_hash = ?';
    params.push(password_hash);
  }
  sql += ' WHERE id = ?';
  params.push(id);
  await run(sql, params);
  return { id, name, email, role, status };
};

const deleteUser = async (id) => {
  const result = await run("UPDATE users SET status = 'inactive' WHERE id = ?", [id]);
  return { id, changes: result.rowsAffected };
};

// --- Productos ---
const getAllProducts = async () => {
  return query('SELECT * FROM products', []);
};

const createProduct = async ({ name, price, stock, category, manual_code, image, supplier_id, classification }) => {
  const result = await run(
    'INSERT INTO products (name, price, stock, category, manual_code, cost_price, image, supplier_id, classification) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)',
    [name, price, stock, category, manual_code, image, supplier_id, classification || 'B']
  );
  return { id: Number(result.lastInsertRowid), name, price, stock, category, manual_code, image, supplier_id, classification };
};

const updateProduct = async (id, { name, price, stock, category, manual_code, image, supplier_id, classification }) => {
  await run(
    'UPDATE products SET name = ?, price = ?, stock = ?, category = ?, manual_code = ?, image = ?, supplier_id = ?, classification = ? WHERE id = ?',
    [name, price, stock, category, manual_code, image, supplier_id, classification || 'B', id]
  );
  return { id, name, price, stock, category, manual_code, image, supplier_id, classification };
};

const deleteProduct = async (id) => {
  const result = await run('DELETE FROM products WHERE id = ?', [id]);
  return { changes: result.rowsAffected };
};

const updateProductStock = async (productId, stockChange) => {
  const result = await run('UPDATE products SET stock = stock + ? WHERE id = ?', [stockChange, productId]);
  return { changes: result.rowsAffected };
};

// --- Ventas ---
const insertSale = async ({ productId, productName, quantity, price, transactionId, paymentMethod, receivedAmount, changeAmount, date }) => {
  const result = await run(
    'INSERT INTO sales_history (productId, productName, quantity, price, transactionId, paymentMethod, receivedAmount, changeAmount, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [productId, productName, quantity, price, transactionId, paymentMethod, receivedAmount, changeAmount, date]
  );
  return { id: Number(result.lastInsertRowid) };
};

const getAllSales = async () => {
  return query('SELECT * FROM sales_history ORDER BY date DESC', []);
};

const getSaleByTransactionId = async (transactionId) => {
  return query('SELECT * FROM sales_history WHERE transactionId = ?', [transactionId]);
};

const cancelSaleByTransactionId = async (transactionId) => {
  const result = await run('DELETE FROM sales_history WHERE transactionId = ?', [transactionId]);
  return { changes: result.rowsAffected };
};

// --- Caja ---
const addCashTransaction = async (amount, description, type, date) => {
  const result = await run(
    'INSERT INTO cash_transactions (amount, description, type, date) VALUES (?, ?, ?, ?)',
    [amount, description, type, date]
  );
  return { id: Number(result.lastInsertRowid) };
};

const getTodaysCashTransactions = async (offset) => {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const localTime = new Date(utcTime + (offset * 3600000));
  const todayStr = localTime.toISOString().split('T')[0];
  const startOfLocalDayInUTC = new Date(todayStr + 'T00:00:00Z').getTime() - (offset * 3600000);
  const startOfLocalDayISO = new Date(startOfLocalDayInUTC).toISOString();

  return query(
    'SELECT * FROM cash_transactions WHERE date >= ? OR date LIKE ? ORDER BY date DESC',
    [startOfLocalDayISO, `${todayStr}%`]
  );
};

const clearTodaysCashTransactions = async (offset) => {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const localTime = new Date(utcTime + (offset * 3600000));
  const todayStr = localTime.toISOString().split('T')[0];
  const startOfLocalDayInUTC = new Date(todayStr + 'T00:00:00Z').getTime() - (offset * 3600000);
  const startOfLocalDayISO = new Date(startOfLocalDayInUTC).toISOString();

  const result = await run(
    'DELETE FROM cash_transactions WHERE date >= ? OR date LIKE ?',
    [startOfLocalDayISO, `${todayStr}%`]
  );
  return { changes: result.rowsAffected };
};

const clearTodaysSales = async (offset) => {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const localTime = new Date(utcTime + (offset * 3600000));
  const todayStr = localTime.toISOString().split('T')[0];
  const startOfLocalDayInUTC = new Date(todayStr + 'T00:00:00Z').getTime() - (offset * 3600000);
  const startOfLocalDayISO = new Date(startOfLocalDayInUTC).toISOString();

  const result = await run(
    'DELETE FROM sales_history WHERE date >= ? OR date LIKE ?',
    [startOfLocalDayISO, `${todayStr}%`]
  );
  return { changes: result.rowsAffected };
};

// --- Proveedores ---
const getAllSuppliers = async () => query('SELECT * FROM suppliers', []);

const createSupplier = async ({ name, contact_name, phone, email, address }) => {
  const result = await run(
    'INSERT INTO suppliers (name, contact_name, phone, email, address) VALUES (?, ?, ?, ?, ?)',
    [name, contact_name, phone, email, address]
  );
  return { id: Number(result.lastInsertRowid), name, contact_name, phone, email, address };
};

const updateSupplier = async (id, { name, contact_name, phone, email, address }) => {
  await run(
    'UPDATE suppliers SET name = ?, contact_name = ?, phone = ?, email = ?, address = ? WHERE id = ?',
    [name, contact_name, phone, email, address, id]
  );
  return { id, name, contact_name, phone, email, address };
};

const deleteSupplier = async (id) => {
  const result = await run('DELETE FROM suppliers WHERE id = ?', [id]);
  return { changes: result.rowsAffected };
};

// --- Compras / Ingreso de mercadería ---
const recordPurchase = async ({ supplier_id, total_cost, date, notes, items }) => {
  const purchaseResult = await run(
    'INSERT INTO purchases (supplier_id, total_cost, date, notes) VALUES (?, ?, ?, ?)',
    [supplier_id, total_cost, date, notes]
  );
  const purchaseId = Number(purchaseResult.lastInsertRowid);

  for (const item of items) {
    await run(
      'INSERT INTO purchase_items (purchase_id, product_id, quantity, cost_price) VALUES (?, ?, ?, ?)',
      [purchaseId, item.product_id, item.quantity, item.cost_price]
    );
    await run(
      'UPDATE products SET stock = stock + ?, cost_price = ? WHERE id = ?',
      [item.quantity, item.cost_price, item.product_id]
    );
  }

  return { id: purchaseId };
};

// --- Cierre de Caja ---
const getCashClosingByDate = async (date) => {
  const rows = await query('SELECT * FROM cash_closings WHERE date = ?', [date]);
  return rows[0] || null;
};

const upsertCashClosing = async (data) => {
  const result = await run(`
    INSERT INTO cash_closings (date, starting_cash, total_sales, total_entries, total_exits, expected_cash, actual_cash, difference, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      starting_cash = excluded.starting_cash,
      total_sales = excluded.total_sales,
      total_entries = excluded.total_entries,
      total_exits = excluded.total_exits,
      expected_cash = excluded.expected_cash,
      actual_cash = excluded.actual_cash,
      difference = excluded.difference,
      notes = excluded.notes,
      status = excluded.status
  `, [
    data.date, data.starting_cash, data.total_sales, data.total_entries,
    data.total_exits, data.expected_cash, data.actual_cash, data.difference,
    data.notes, data.status
  ]);
  return { id: Number(result.lastInsertRowid) || data.id };
};

// --- Configuraciones ---
const getSetting = async (key) => {
  const rows = await query('SELECT value FROM settings WHERE key = ?', [key]);
  return rows.length > 0 ? rows[0].value : null;
};

const updateSetting = async (key, value) => {
  await run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
  return { key, value };
};

module.exports = {
  db,
  initDb,
  insertSale,
  getAllSales,
  getSaleByTransactionId,
  cancelSaleByTransactionId,
  addCashTransaction,
  getTodaysCashTransactions,
  clearTodaysCashTransactions,
  clearTodaysSales,
  getUserByEmail,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  getAllSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  recordPurchase,
  getCashClosingByDate,
  upsertCashClosing,
  getSetting,
  updateSetting
};
