const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
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
      changeAmount REAL,
      is_closed INTEGER DEFAULT 0
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
      stock REAL NOT NULL, -- Cambiado a REAL para permitir fracciones (ej. 0.5 libras)
      category TEXT,
      manual_code TEXT UNIQUE,
      cost_price REAL DEFAULT 0,
      image TEXT,
      supplier_id INTEGER,
      classification TEXT DEFAULT 'B',
      unit_type TEXT DEFAULT 'unit', -- 'unit', 'weight', 'volume'
      conversion_factor REAL DEFAULT 1, -- Cuántas unidades pequeñas hay en una grande
      parent_product_id INTEGER -- Para vincular Libra con Saco
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

    CREATE TABLE IF NOT EXISTS auto_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      items TEXT NOT NULL,
      total REAL NOT NULL,
      customerName TEXT,
      note TEXT,
      payWith REAL,
      status TEXT DEFAULT 'pending',
      date TEXT
    );

    CREATE TABLE IF NOT EXISTS combos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS combo_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      combo_id INTEGER,
      product_id INTEGER,
      quantity INTEGER,
      FOREIGN KEY (combo_id) REFERENCES combos(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS appliances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      watts REAL NOT NULL,
      hours_per_day REAL DEFAULT 24,
      kwh_cost REAL NOT NULL
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
  } catch (e) {}

  // Migración: Asegurar que existe la columna 'is_closed' en 'sales_history'
  try {
    await db.execute("ALTER TABLE sales_history ADD COLUMN is_closed INTEGER DEFAULT 0");
    console.log("Migración exitosa: Columna 'is_closed' añadida.");
  } catch (e) {}

  // Migración: Añadir columnas note y payWith a auto_orders
  try {
    const tableInfo = await query("PRAGMA table_info(auto_orders)");
    const hasNote = tableInfo.some(c => c.name === 'note');
    if (!hasNote) {
      await db.execute("ALTER TABLE auto_orders ADD COLUMN note TEXT");
      await db.execute("ALTER TABLE auto_orders ADD COLUMN payWith REAL");
      console.log("Migración exitosa: Columnas note y payWith añadidas a auto_orders.");
    }
    const hasPublicId = tableInfo.some(c => c.name === 'public_id');
    if (!hasPublicId) {
      await db.execute("ALTER TABLE auto_orders ADD COLUMN public_id TEXT");
      console.log("Migración exitosa: Columna public_id añadida a auto_orders.");
    }
  } catch (e) {
    console.error("Error en migración auto_orders:", e.message);
  }

  // Migración: Añadir public_id a sales_history
  try {
    const tableInfo = await query("PRAGMA table_info(sales_history)");
    const hasPublicId = tableInfo.some(c => c.name === 'public_id');
    if (!hasPublicId) {
      await db.execute("ALTER TABLE sales_history ADD COLUMN public_id TEXT");
      console.log("Migración exitosa: Columna public_id añadida a sales_history.");
    }
  } catch (e) {
    console.error("Error en migración sales_history:", e.message);
  }

  // Insertar nuevas configuraciones por defecto
  await db.execute({
    sql: "INSERT OR IGNORE INTO settings (key, value) VALUES ('estimated_prep_time', '10-15')",
    args: []
  });
  await db.execute({
    sql: "INSERT OR IGNORE INTO settings (key, value) VALUES ('shop_open', 'true')",
    args: []
  });

  // Migración: Añadir columna transactionId a auto_orders
  try {
    const tableInfo = await query("PRAGMA table_info(auto_orders)");
    const hasTransactionId = tableInfo.some(c => c.name === 'transactionId');
    if (!hasTransactionId) {
      await db.execute("ALTER TABLE auto_orders ADD COLUMN transactionId INTEGER");
      console.log("Migración exitosa: Columna transactionId añadida a auto_orders.");
    }
  } catch (e) {
    console.error("Error en migración auto_orders (transactionId):", e.message);
  }

  // Migración: Añadir columnas de fraccionamiento a products
  try {
    const tableInfo = await query("PRAGMA table_info(products)");
    if (!tableInfo.some(c => c.name === 'unit_type')) {
      await db.execute("ALTER TABLE products ADD COLUMN unit_type TEXT DEFAULT 'unit'");
      await db.execute("ALTER TABLE products ADD COLUMN conversion_factor REAL DEFAULT 1");
      await db.execute("ALTER TABLE products ADD COLUMN parent_product_id INTEGER");
      console.log("Migración exitosa: Columnas de fraccionamiento añadidas.");
    }
  } catch (e) {
    console.error("Error en migración products (fraccionamiento):", e.message);
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

const getNextManualCode = async () => {
  try {
    const rows = await query("SELECT manual_code FROM products WHERE manual_code GLOB '[0-9][0-9][0-9]' ORDER BY manual_code DESC LIMIT 1");
    if (rows.length === 0) return "001";
    const lastCode = parseInt(rows[0].manual_code, 10);
    return String(lastCode + 1).padStart(3, '0');
  } catch (error) {
    console.error("Error generating manual code:", error);
    return String(Math.floor(Math.random() * 900) + 100); // Fallback aleatorio si algo falla
  }
};

const createProduct = async ({ name, price, stock, category, manual_code, image, supplier_id, classification }) => {
  let finalCode = manual_code;
  if (!finalCode || finalCode.trim() === "") {
    finalCode = await getNextManualCode();
  }
  
  const result = await run(
    'INSERT INTO products (name, price, stock, category, manual_code, cost_price, image, supplier_id, classification) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)',
    [name, price, stock, category, finalCode, image, supplier_id, classification || 'B']
  );
  return { id: Number(result.lastInsertRowid), name, price, stock, category, manual_code: finalCode, image, supplier_id, classification };
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
  let finalTransactionId = transactionId;
  const publicId = uuidv4();
  if (finalTransactionId === null || finalTransactionId === undefined) {
    const nextProv = await getNextTransactionId();
    finalTransactionId = nextProv;
  }
  const result = await run(
    'INSERT INTO sales_history (productId, productName, quantity, price, transactionId, paymentMethod, receivedAmount, changeAmount, date, is_closed, public_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)',
    [productId, productName, quantity, price, finalTransactionId, paymentMethod, receivedAmount, changeAmount, date, publicId]
  );
  return { id: Number(result.lastInsertRowid), transactionId: finalTransactionId, publicId };
};

const getSaleByPublicId = async (publicId) => {
  // 1. Intentar buscar directamente en sales_history por public_id (ventas directas)
  let rows = await query('SELECT * FROM sales_history WHERE public_id = ?', [publicId]);
  
  if (rows.length === 0) {
    // 2. Si no hay nada, buscar si ese publicId pertenece a una auto_order
    const orderRows = await query('SELECT transactionId FROM auto_orders WHERE public_id = ? OR id = ?', [publicId, publicId]);
    if (orderRows.length > 0 && orderRows[0].transactionId) {
      // 3. Si la orden ya tiene un transactionId vinculado, buscar la venta por ese ID
      rows = await query('SELECT * FROM sales_history WHERE transactionId = ?', [orderRows[0].transactionId]);
    }
  }
  return rows;
};

const markSalesAsClosed = async (datePrefix) => {
  const result = await run('UPDATE sales_history SET is_closed = 1 WHERE date LIKE ? AND is_closed = 0', [`${datePrefix}%`]);
  return { changes: result.rowsAffected };
};

const getAllSales = async () => {
  return query('SELECT * FROM sales_history ORDER BY date DESC', []);
};

const getSaleByTransactionId = async (transactionId) => {
  return query('SELECT * FROM sales_history WHERE transactionId = ?', [transactionId]);
};

const getNextTransactionId = async () => {
  const rows = await query('SELECT MAX(transactionId) as maxId FROM sales_history', []);
  return (rows[0] && rows[0].maxId != null) ? rows[0].maxId + 1 : 1;
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

// --- Auto Órdenes (QR/Cliente) ---
const createAutoOrder = async ({ items, total, customerName, note, payWith, date }) => {
  try {
    const publicId = uuidv4();
    console.log('Intentando crear auto_order:', { customerName, total, itemsCount: items?.length });
    const result = await run(
      'INSERT INTO auto_orders (items, total, customerName, note, payWith, status, date, public_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [JSON.stringify(items), total, customerName, note, payWith, 'pending', date, publicId]
    );
    console.log('Auto_order creada con éxito ID:', result.lastInsertRowid);
    return { id: Number(result.lastInsertRowid), publicId };
  } catch (error) {
    console.error('DATABASE ERROR in createAutoOrder:', error);
    throw error;
  }
};

const getAutoOrderByPublicId = async (publicId) => {
  const rows = await query('SELECT * FROM auto_orders WHERE public_id = ? OR id = ?', [publicId, publicId]);
  if (rows.length === 0) return null;
  const order = rows[0];
  return { ...order, items: JSON.parse(order.items) };
};

const getAutoOrderById = async (id) => {
  const rows = await query('SELECT * FROM auto_orders WHERE id = ?', [id]);
  if (rows.length === 0) return null;
  const order = rows[0];
  return { ...order, items: JSON.parse(order.items) };
};

const getPendingAutoOrders = async () => {
  const rows = await query('SELECT * FROM auto_orders WHERE status IN (?, ?) ORDER BY date DESC', ['pending', 'preparing']);
  return rows.map(r => ({ ...r, items: JSON.parse(r.items) }));
};

const updateAutoOrderStatus = async (idOrPublicId, status, transactionId = null) => {
  // Determinar si es un ID numérico o un UUID
  const isNumeric = !isNaN(idOrPublicId) && !String(idOrPublicId).includes('-');
  const whereClause = isNumeric ? 'WHERE id = ?' : 'WHERE public_id = ?';

  if (transactionId !== null) {
    await run(`UPDATE auto_orders SET status = ?, transactionId = ? ${whereClause}`, [status, transactionId, idOrPublicId]);
  } else {
    await run(`UPDATE auto_orders SET status = ? ${whereClause}`, [status, idOrPublicId]);
  }
  
  // Obtener el registro actualizado para devolver el public_id al socket
  const updatedRows = await query(`SELECT * FROM auto_orders ${whereClause}`, [idOrPublicId]);
  if (updatedRows.length > 0) {
    const order = updatedRows[0];
    return { ...order, items: JSON.parse(order.items) };
  }
  return { id: idOrPublicId, status, transactionId };
};

// --- Combos ---
const getAllCombos = async () => {
  const combos = await query('SELECT * FROM combos');
  const result = [];
  for (const combo of combos) {
    const items = await query('SELECT ci.*, p.name as productName, p.price as originalPrice FROM combo_items ci JOIN products p ON ci.product_id = p.id WHERE ci.combo_id = ?', [combo.id]);
    result.push({ ...combo, items });
  }
  return result;
};

const createCombo = async ({ name, price, description, items }) => {
  const result = await run('INSERT INTO combos (name, price, description) VALUES (?, ?, ?)', [name, price, description]);
  const comboId = Number(result.lastInsertRowid);
  for (const item of items) {
    await run('INSERT INTO combo_items (combo_id, product_id, quantity) VALUES (?, ?, ?)', [comboId, item.product_id, item.quantity]);
  }
  return { id: comboId, name, price, description, items };
};

const deleteCombo = async (id) => {
  await run('DELETE FROM combo_items WHERE combo_id = ?', [id]);
  const result = await run('DELETE FROM combos WHERE id = ?', [id]);
  return { changes: result.rowsAffected };
};

// --- Appliances (Idea 9) ---
const getAllAppliances = async () => query('SELECT * FROM appliances', []);

const createAppliance = async ({ name, watts, hours_per_day, kwh_cost }) => {
  const result = await run('INSERT INTO appliances (name, watts, hours_per_day, kwh_cost) VALUES (?, ?, ?, ?)', [name, watts, hours_per_day || 24, kwh_cost]);
  return { id: Number(result.lastInsertRowid), name, watts, hours_per_day, kwh_cost };
};

const updateAppliance = async (id, { name, watts, hours_per_day, kwh_cost }) => {
  await run('UPDATE appliances SET name = ?, watts = ?, hours_per_day = ?, kwh_cost = ? WHERE id = ?', [name, watts, hours_per_day, kwh_cost, id]);
  return { id, name, watts, hours_per_day, kwh_cost };
};

const deleteAppliance = async (id) => {
  const result = await run('DELETE FROM appliances WHERE id = ?', [id]);
  return { changes: result.rowsAffected };
};

// --- Bills (Idea 11) ---
const getAllBills = async () => query('SELECT * FROM bills ORDER BY due_date DESC', []);

const createBill = async ({ type, amount, billing_month, billing_year, due_date, status, image, notes }) => {
  const result = await run(
    'INSERT INTO bills (type, amount, billing_month, billing_year, due_date, status, image, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [type, amount, billing_month, billing_year, due_date, status || 'pending', image, notes, new Date().toISOString()]
  );
  return { id: Number(result.lastInsertRowid), type, amount, billing_month, billing_year, due_date, status, notes };
};

const updateBillStatus = async (id, status) => {
  const result = await run('UPDATE bills SET status = ? WHERE id = ?', [status, id]);
  return { id, status, changes: result.rowsAffected };
};

const deleteBill = async (id) => {
  const result = await run('DELETE FROM bills WHERE id = ?', [id]);
  return { id, changes: result.rowsAffected };
};

// --- Estadísticas para el Dashboard ---
const getDashboardTotals = async () => {
  const products = await query('SELECT COUNT(*) as total, SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END) as lowStock FROM products');
  const appliances = await query('SELECT COUNT(*) as total FROM appliances');
  const salesToday = await query("SELECT SUM(price * quantity) as total FROM sales_history WHERE date LIKE ?", [`${new Date().toISOString().split('T')[0]}%`]);
  
  return {
    totalProducts: products[0].total || 0,
    lowStock: products[0].lowStock || 0,
    appliancesCount: appliances[0].total || 0,
    salesToday: salesToday[0].total || 0
  };
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
  markSalesAsClosed,
  getSetting,
  updateSetting,
  createAutoOrder,
  getAutoOrderById,
  getAutoOrderByPublicId,
  getSaleByPublicId,
  getPendingAutoOrders,
  updateAutoOrderStatus,
  getNextTransactionId,
  getAllCombos,
  createCombo,
  deleteCombo,
  getAllAppliances,
  createAppliance,
  updateAppliance,
  deleteAppliance,
  getAllBills,
  createBill,
  updateBillStatus,
  deleteBill,
  getDashboardTotals
};
