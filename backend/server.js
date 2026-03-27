require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const axios = require('axios');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs'); // Usar bcryptjs para evitar errores de módulos nativos en Electron
const {
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
  getAutoOrderById,
  getAutoOrderByPublicId,
  getSaleByPublicId,
  getPendingAutoOrders,
  updateAutoOrderStatus,
  getNextTransactionId
} = require('./database');
const { getDailySummary, getSalesChartData, getComboSuggestions, getStockPredictor } = require('./decisionEngine');
const { sendWhatsAppMessage, sendLowStockAlert } = require('./notificationService');
const cron = require('node-cron');
const { generateDailyReportText, generateDailyReportPDF } = require('./reportService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3001;

// Rate limiting para seguridad
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite de 100 peticiones por IP por ventana
  message: { message: 'Demasiadas peticiones desde esta IP, por favor intente más tarde.' }
});

const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 5, // Solo 5 pedidos por cada 10 minutos por IP
  message: { message: 'Límite de pedidos alcanzado. Por favor, espere unos minutos.' }
});

app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role']
}));

console.log('--- INICIANDO SERVIDOR SISTEMA DE VENTAS V2.2 (DEBUG MODE) ---');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

// Variable para cachear el offset (se actualiza al cambiarlo)
let currentOffset = -6;

// Función para cargar el offset al inicio
const loadOffset = async () => {
  try {
    const offset = await getSetting('time_offset');
    if (offset !== null) currentOffset = parseFloat(offset);
  } catch (err) {
    console.error('Error loading time offset:', err);
  }
};
// Inicializar base de datos al arrancar (se espera antes de escuchar conexiones)
let serverReady = false;
const initPromise = (async () => {
  try {
    console.log('Iniciando inicialización de base de datos...');
    await initDb();
    console.log('Base de datos inicializada.');
    await loadOffset();
    console.log('Configuraciones cargadas.');
    serverReady = true;
  } catch (err) {
    console.error('ERROR CRÍTICO al inicializar en initPromise:', err);
    process.exit(1);
  }
})();

// Función para obtener la fecha actual en UTC ISO (para almacenamiento)
const getUTCDateISO = () => {
  return new Date().toISOString();
};

const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-for-sales-system-2024';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No se encontró el token de autenticación.' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido o expirado.' });
    req.user = user;
    next();
  });
};

const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'No tienes permisos para realizar esta acción.' });
    }
    next();
  };
};

app.post('/api/login', async (req, res, next) => {
  const { email, password } = req.body;
  console.log(`Intento de login para: ${email}`);
  try {
    if (!serverReady) {
       console.log('Login rechazado: El servidor aún no está listo.');
       return res.status(503).json({ message: 'El servidor se está iniciando, por favor espera unos segundos.' });
    }
    const user = await getUserByEmail(email);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ message: 'Credenciales incorrectas o usuario inactivo.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, SECRET_KEY, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    next(error);
  }
});

app.get('/api/users', authenticateToken, authorizeRole('admin'), async (req, res, next) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

app.post('/api/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { password, ...userData } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    const userId = await createUser({ ...userData, password_hash });
    res.status(201).json({ message: 'Usuario creado con éxito', userId });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear usuario.' });
  }
});

app.put('/api/users/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { password, ...userData } = req.body;
    if (password) {
      userData.password_hash = await bcrypt.hash(password, 10);
    }
    await updateUser(req.params.id, userData);
    res.json({ message: 'Usuario actualizado con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar usuario.' });
  }
});

app.delete('/api/users/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    await deleteUser(req.params.id);
    res.json({ message: 'Usuario desactivado con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario.' });
  }
});

app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const products = await getAllProducts();
    res.status(200).json(products);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener productos.', error: error.message });
  }
});

app.get('/api/next-manual-code', authenticateToken, async (req, res) => {
  try {
    const nextCode = await getNextManualCode();
    res.status(200).json({ nextCode });
  } catch (error) {
    console.error('Error al obtener siguiente código manual:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener código manual.' });
  }
});

app.get('/api/next-transaction-id', authenticateToken, async (req, res) => {
  try {
    const nextId = await getNextTransactionId();
    res.status(200).json({ nextId });
  } catch (error) {
    console.error('Error al obtener el siguiente ID de transacción:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener el ID de transacción.' });
  }
});

app.post('/api/products', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const newProduct = await createProduct(req.body);
    res.status(201).json({ message: 'Producto creado con éxito.', product: newProduct });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ message: 'Error en el servidor al crear producto.', error: error.message });
  }
});

app.put('/api/products/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const updatedProduct = await updateProduct(req.params.id, req.body);
    res.status(200).json({ message: 'Producto actualizado con éxito.', product: updatedProduct });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ message: 'Error en el servidor al actualizar producto.', error: error.message });
  }
});

app.delete('/api/products/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await deleteProduct(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }
    res.status(200).json({ message: 'Producto eliminado con éxito.' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ message: 'Error en el servidor al eliminar producto.', error: error.message });
  }
});

app.post('/api/record-sale', async (req, res) => {
  try {
    const { productId, productName, quantity, price, transactionId, paymentMethod, receivedAmount, changeAmount } = req.body;
    if (!productId || !quantity || !price || !transactionId || !paymentMethod) {
      return res.status(400).json({ message: 'Datos de venta incompletos o falta transactionId.' });
    }

    const date = getUTCDateISO();
    if (paymentMethod === 'Efectivo') {
      await addCashTransaction(price * quantity, `Venta en Efectivo (Transacción #${String(transactionId).slice(-5)})`, 'entry', date);
    }

    const result = await insertSale({ productId, productName, quantity, price, transactionId, paymentMethod, receivedAmount, changeAmount, date });

    // Descontar stock real en la base de datos
    await updateProductStock(productId, -quantity);

    // --- Notificación de Stock Bajo (CallMeBot WhatsApp + Reporte Completo) ---
    try {
      const products = await getAllProducts();
      const product = products.find(p => String(p.id) === String(productId));

      if (product && product.stock <= 5) {
        const phone = await getSetting('notification_phone') || "+50585853867";
        const apiKey = await getSetting('callmebot_apikey');

        if (phone && apiKey) {
          sendLowStockAlert(phone, apiKey, productName, product.stock)
            .catch(err => console.error('Error in sendLowStockAlert WhatsApp:', err));

          const fullReport = await generateDailyReportText();
          const alertMsg = `🚨 *ALERTA DE STOCK CRÍTICO* 🚨\n\nEl producto *${productName}* llegó a ${product.stock} unidades.\n\n${fullReport}`;

          sendWhatsAppMessage(phone, apiKey, alertMsg)
            .catch(err => console.error('Error in Detailed Stock Alert WhatsApp:', err));
        }
      }
    } catch (notifyError) {
      console.error('Failed to process low stock notification:', notifyError);
    }

    res.status(201).json({ message: 'Venta registrada con éxito', saleId: result.id, transactionId: result.transactionId });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor al registrar la venta', error });
  }
});

app.get('/api/sales-history', async (req, res) => {
  try {
    const sales = await getAllSales();
    res.status(200).json(sales);
  } catch (error) {
    console.error('Error al obtener el historial de ventas:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener el historial de ventas', error });
  }
});

app.post('/api/cancel-sale/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const saleToCancel = await getSaleByTransactionId(transactionId);
    if (!saleToCancel || saleToCancel.length === 0) return res.status(404).json({ message: 'Venta no encontrada.' });

    for (const itemInSale of saleToCancel) {
      await updateProductStock(itemInSale.productId, itemInSale.quantity);
    }

    const firstItem = saleToCancel[0];
    if (firstItem.paymentMethod === 'Efectivo') {
      const totalAmount = saleToCancel.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const date = getUTCDateISO();
      await addCashTransaction(-totalAmount, `Cancelación de Venta (Transacción #${String(transactionId).slice(-5)})`, 'expense', date);
    }

    await cancelSaleByTransactionId(transactionId);
    res.status(200).json({ message: 'Venta cancelada con éxito y stock devuelto.' });
  } catch (error) {
    console.error('Error al cancelar la venta:', error);
    res.status(500).json({ message: 'Error en el servidor al cancelar la venta.', error });
  }
});

app.get('/api/cash-transactions/today', async (req, res) => {
  try {
    const transactions = await getTodaysCashTransactions(currentOffset);
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener transacciones de caja.' });
  }
});

app.post('/api/cash-transactions', async (req, res) => {
  try {
    const { amount, description, type } = req.body;
    const date = getUTCDateISO();
    await addCashTransaction(amount, description, type, date);
    res.status(201).json({ message: 'Transacción de caja registrada con éxito.' });
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar transacción de caja.' });
  }
});

app.get('/api/suppliers', async (req, res) => {
  try {
    const suppliers = await getAllSuppliers();
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener proveedores.' });
  }
});

app.post('/api/suppliers', async (req, res) => {
  try {
    const supplierId = await createSupplier(req.body);
    res.status(201).json({ id: supplierId, message: 'Proveedor creado con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear proveedor.' });
  }
});

app.put('/api/suppliers/:id', async (req, res) => {
  try {
    await updateSupplier(req.params.id, req.body);
    res.json({ message: 'Proveedor actualizado con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar proveedor.' });
  }
});

app.delete('/api/suppliers/:id', async (req, res) => {
  try {
    await deleteSupplier(req.params.id);
    res.json({ message: 'Proveedor eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar proveedor.' });
  }
});

app.post('/api/purchases', async (req, res) => {
  try {
    const purchaseId = await recordPurchase(req.body);
    res.status(201).json({ id: purchaseId, message: 'Compra registrada con éxito y stock actualizado.' });
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar compra.' });
  }
});

app.get('/api/cash-closings/date/:date', async (req, res) => {
  try {
    const closing = await getCashClosingByDate(req.params.date);
    res.json(closing);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener cierre de caja.' });
  }
});

app.post('/api/cash-closings', async (req, res) => {
  try {
    console.log('--- REQUERIMIENTO DE CIERRE DE CAJA ---');
    console.log('Fecha:', req.body.date);
    console.log('Status:', req.body.status);
    
    await upsertCashClosing(req.body);

    // Si el cierre es definitivo (closed), marcar las ventas de hoy como cerradas
    if (req.body.status === 'closed') {
      console.log('Cerrando ventas activas para la fecha:', req.body.date);
      await markSalesAsClosed(req.body.date);
    }

    res.json({ message: 'Cierre de caja guardado con éxito.' });
  } catch (error) {
    console.error('ERROR EN CIERRE DE CAJA:', error);
    res.status(500).json({ message: 'Error al guardar cierre de caja.' });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    const time_offset = await getSetting('time_offset');
    const notification_phone = await getSetting('notification_phone');
    const callmebot_apikey = await getSetting('callmebot_apikey');
    const shop_open = await getSetting('shop_open');
    const estimated_prep_time = await getSetting('estimated_prep_time');
    res.json({
      time_offset: time_offset || "-6",
      notification_phone: notification_phone || '',
      callmebot_apikey: callmebot_apikey || '',
      shop_open: shop_open || 'true',
      estimated_prep_time: estimated_prep_time || '10-15'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener configuraciones' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { time_offset, notification_phone, callmebot_apikey, shop_open, estimated_prep_time } = req.body;
    if (time_offset !== undefined) {
      await updateSetting('time_offset', time_offset);
      currentOffset = parseFloat(time_offset);
    }
    if (notification_phone !== undefined) await updateSetting('notification_phone', notification_phone);
    if (callmebot_apikey !== undefined) await updateSetting('callmebot_apikey', callmebot_apikey);
    if (shop_open !== undefined) {
      await updateSetting('shop_open', shop_open);
      io.emit('shopStatusUpdate', { isShopOpen: shop_open === 'true' });
    }
    if (estimated_prep_time !== undefined) {
      await updateSetting('estimated_prep_time', estimated_prep_time);
      io.emit('prepTimeUpdate', { estimatedPrepTime: estimated_prep_time });
    }
    res.json({ message: 'Configuración actualizada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar configuraciones' });
  }
});

app.post('/api/clear-test-data', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    await clearTodaysSales();
    await clearTodaysCashTransactions();
    res.status(200).json({ message: 'Datos de prueba eliminados.' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar datos de prueba.' });
  }
});

app.get('/api/daily-summary', async (req, res) => {
  try {
    const summary = await getDailySummary();
    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el resumen diario', error });
  }
});

app.get('/api/dashboard-charts', async (req, res) => {
  try {
    const chartData = await getSalesChartData();
    res.status(200).json(chartData);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener datos para gráficos.' });
  }
});

// --- Endpoints para Auto-Órdenes (Mostrador Digital) ---
app.get('/api/public/products', publicLimiter, async (req, res) => {
  try {
    const products = await getAllProducts();
    const isShopOpen = await getSetting('shop_open') === 'true';
    const estimatedPrepTime = await getSetting('estimated_prep_time') || "10-15";

    const publicProducts = products
      .map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.image,
        category: p.category,
        stock: p.stock
      }));
    res.json({ products: publicProducts, isShopOpen, estimatedPrepTime });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener catálogo público' });
  }
});

app.post('/api/auto-orders', orderLimiter, async (req, res) => {
  try {
    const { items, customerName, note, payWith } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'El carrito está vacío o es inválido' });
    }

    const isShopOpen = await getSetting('shop_open') === 'true';
    if (!isShopOpen) {
      return res.status(503).json({ message: 'La tienda está cerrada temporalmente. No se aceptan auto-pedidos.' });
    }

    // Validación de stock y PRECIOS REALES (Seguridad)
    const allProducts = await getAllProducts();
    let recalculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const dbProduct = allProducts.find(p => String(p.id) === String(item.id));
      if (!dbProduct) return res.status(400).json({ message: `Producto no encontrado: ${item.name}` });
      if (dbProduct.stock < item.quantity) {
        return res.status(400).json({ message: `El producto "${item.name}" no tiene stock suficiente. Disponible: ${dbProduct.stock}.` });
      }
      
      // Usar precio de la DB, no del frontend
      recalculatedTotal += dbProduct.price * item.quantity;
      validatedItems.push({
        id: dbProduct.id,
        name: dbProduct.name,
        price: dbProduct.price,
        quantity: item.quantity
      });
    }

    const date = getUTCDateISO();
    const orderData = {
      items: validatedItems,
      total: recalculatedTotal,
      customerName: customerName || 'Cliente',
      note: note || '',
      payWith: payWith ? parseFloat(payWith) : null,
      date
    };

    const result = await createAutoOrder(orderData);
    
    // Notificar al admin vía Socket
    io.emit('newOrder', { id: result.id, publicId: result.publicId, ...orderData });

    res.status(201).json({ id: result.publicId, message: 'Pedido enviado con éxito' });
  } catch (error) {
    console.error('ERROR CRÍTICO AL ENVIAR PEDIDO:', error);
    res.status(500).json({ message: 'Error interno al enviar pedido', detail: error.message });
  }
});

app.get('/api/auto-orders/:id', publicLimiter, async (req, res) => {
  try {
    const order = await getAutoOrderByPublicId(req.params.id);
    if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener pedido' });
  }
});

// Endpoint público para ver el recibo generado a partir de una venta
app.get('/api/public/receipts/:id', publicLimiter, async (req, res) => {
  try {
    // Intentar buscar por public_id primero
    const sales = await getSaleByPublicId(req.params.id);
    
    if (!sales || sales.length === 0) {
      // Fallback a ID secuencial por compatibilidad temporal (Opcional, se puede quitar después)
      const oldSales = await getSaleByTransactionId(req.params.id);
      if (!oldSales || oldSales.length === 0) {
        return res.status(404).json({ error: 'Recibo no encontrado' });
      }
      const receiptData = {
        id: req.params.id,
        items: oldSales.map(s => ({ name: s.productName, quantity: s.quantity, price: s.price })),
        total: oldSales.reduce((sum, s) => sum + (s.price * s.quantity), 0),
        date: oldSales[0].date,
        paymentMethod: oldSales[0].paymentMethod,
        seller: oldSales[0].seller || 'Sistema'
      };
      return res.json(receiptData);
    }

    const receiptData = {
      id: sales[0].transactionId,
      publicId: req.params.id,
      items: sales.map(s => ({ name: s.productName, quantity: s.quantity, price: s.price })),
      total: sales.reduce((sum, s) => sum + (s.price * s.quantity), 0),
      date: sales[0].date,
      paymentMethod: sales[0].paymentMethod,
      seller: sales[0].seller || 'Sistema'
    };
    res.json(receiptData);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor al obtener recibo' });
  }
});

app.get('/api/pending-auto-orders', authenticateToken, async (req, res) => {
  try {
    const orders = await getPendingAutoOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener pedidos pendientes' });
  }
});

app.put('/api/auto-orders/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, transactionId } = req.body;
    const result = await updateAutoOrderStatus(req.params.id, status, transactionId);
    
    // Notificar al cliente vía Socket
    io.emit(`orderStatusUpdate:${req.params.id}`, { status, transactionId });
    io.emit('orderUpdate', result); // Para la vista de admin

    res.json({ message: 'Estado actualizado correctamente', ...result });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar estado del pedido' });
  }
});

app.get('/api/ai/combos/:productId', publicLimiter, async (req, res) => {
  try {
    const combos = await getComboSuggestions(req.params.productId);
    res.json(combos);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener sugerencias.' });
  }
});

app.get('/api/ai/stock-alerts', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const alerts = await getStockPredictor();
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener predicciones de stock.' });
  }
});

app.post('/api/send-report', async (req, res) => {
  try {
    const phone = await getSetting('notification_phone') || "+50585853867";
    const apiKey = await getSetting('callmebot_apikey');
    if (phone && apiKey) {
      const reportText = await generateDailyReportText();
      const finalMsg = `📑 *REPORTE SOLICITADO MANUALMENTE* 📑\n\n${reportText}`;
      await sendWhatsAppMessage(phone, apiKey, finalMsg);
      res.json({ message: 'Reporte enviado con éxito vía WhatsApp' });
    } else {
      res.status(400).json({ message: 'WhatsApp o API Key no configurados' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al enviar reporte' });
  }
});

app.get('/api/generate-only-report', async (req, res) => {
  try {
    const report = await generateDailyReportText();
    res.json({ report });
  } catch (error) {
    res.status(500).json({ message: 'Error al generar reporte' });
  }
});

app.get('/api/reports/pdf', async (req, res) => {
  try {
    const offset = await getSetting('time_offset');
    const numericOffset = offset !== null ? parseFloat(offset) : -6;
    const today = new Date(Date.now() + (numericOffset * 3600000)).toISOString().split('T')[0];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Reporte_Ventas_${today}.pdf`);

    await generateDailyReportPDF(res);
  } catch (error) {
    console.error('Error serving PDF report:', error);
    if (!res.headersSent) {
      res.status(500).send('Error al generar el reporte PDF');
    }
  }
});

cron.schedule('0 12 * * *', async () => {
  console.log('Ejecutando tarea programada: Reporte Diario 12:00 PM');
  try {
    const phone = await getSetting('notification_phone') || "+50585853867";
    const apiKey = await getSetting('callmebot_apikey');
    if (phone && apiKey) {
      const reportText = await generateDailyReportText();
      const finalMsg = `🕛 *REPORTE AUTOMÁTICO DE MEDIODÍA* 🕛\n\n${reportText}`;
      await sendWhatsAppMessage(phone, apiKey, finalMsg);
      console.log('Reporte diario enviado con éxito.');
    }
  } catch (error) {
    console.error('Error en el cron de reporte diario:', error);
  }
}, {
  scheduled: true,
  timezone: "America/Managua"
});

  // Servir archivos estáticos del frontend (para Render y Local)
  const distPathCwd = path.join(process.cwd(), 'dist');
  const distPathDirname = path.join(__dirname, '..', 'dist');
  
  console.log('--- RUTAS DE BÚSQUEDA ---');
  console.log('Directorio actual (cwd):', process.cwd());
  console.log('Directorio del script (__dirname):', __dirname);
  console.log('Buscando en:', distPathCwd, '-> Existe?', fs.existsSync(distPathCwd));
  console.log('Buscando en:', distPathDirname, '-> Existe?', fs.existsSync(distPathDirname));

  const possiblePaths = [
    distPathCwd,
    distPathDirname,
    path.join(__dirname, 'www')
  ];

  let frontendPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
      frontendPath = p;
      break;
    }
  }

  if (frontendPath) {
    app.use(express.static(frontendPath));
    app.get('*', (req, res, next) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
      } else {
        next();
      }
    });
    console.log('✅ UI servida desde:', frontendPath);
  } else {
    console.error('❌ ERROR: No se encontró la carpeta "dist".');
    app.get('/', (req, res) => {
      res.send('Servidor activo. Error: No se encontró la carpeta "dist".');
    });
  }

// --- MIDDLEWARE DE ERROR GLOBAL (DEBE IR AL FINAL) ---
app.use((err, req, res, next) => {
  const errorLog = `[${new Date().toISOString()}] ERROR DETECTADO: ${err.stack}\n`;
  console.error(errorLog);
  try {
    const logPath = process.env.DB_PATH ? path.join(path.dirname(process.env.DB_PATH), 'server_error.log') : 'server_error.log';
    fs.appendFileSync(logPath, errorLog);
  } catch (e) {
    console.error('No se pudo escribir en el log de errores:', e.message);
  }

  // Enviar el detalle del error al cliente para depuración
  res.status(500).json({
    message: 'Error interno del servidor. Por favor, contacte al soporte técnico.',
    error: err.message,
    code: 'INTERNAL_SERVER_ERROR'
  });
});

  // Esperar a que la BD se inicialice antes de escuchar peticiones
  initPromise.then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor de ventas con Socket.io corriendo en http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error('Error al iniciar el servidor:', err);
  });
