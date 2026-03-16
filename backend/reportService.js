const { getAllSales, getAllProducts } = require('./database');
const { getDailySummary } = require('./decisionEngine');
const PDFDocument = require('pdfkit');

/**
 * Genera un reporte detallado en formato texto para enviar por WhatsApp/Telegram
 */
const generateDailyReportText = async () => {
    // ... (existed logic preserved) ...
    try {
        const summary = await getDailySummary();
        const products = await getAllProducts();
        const sales = await getAllSales();

        const offset = await (require('./database').getSetting('time_offset'));
        const numericOffset = offset !== null ? parseFloat(offset) : -6;
        const today = new Date(Date.now() + (numericOffset * 3600000)).toISOString().split('T')[0];

        const lowStockProducts = products.filter(p => p.stock <= 5);

        let totalProfit = 0;
        const productMap = new Map();
        products.forEach(p => productMap.set(String(p.id), p));

        const dailySales = sales.filter(s => {
            if (!s.date) return false;
            const saleDate = s.date.includes('T') ? new Date(s.date).toISOString().split('T')[0] : s.date.split(' ')[0];
            return saleDate === today;
        });

        dailySales.forEach(s => {
            const p = productMap.get(String(s.productId));
            if (p) {
                const cost = parseFloat(p.cost_price) || 0;
                totalProfit += (parseFloat(s.price) - cost) * parseFloat(s.quantity);
            }
        });

        let report = `📊 *REPORTE DE VENTAS - ${today}* 📊\n\n`;
        report += `💰 *Resumen Financiero:*\n`;
        report += `• Total Ventas: *C$ ${summary.totalSales.toLocaleString()}*\n`;
        report += `• Ganancia Estimada: *C$ ${totalProfit.toLocaleString()}*\n`;
        report += `• Transacciones: *${summary.salesCount}*\n\n`;

        if (lowStockProducts.length > 0) {
            report += `⚠️ *ALERTAS DE STOCK BAJO:*\n`;
            lowStockProducts.slice(0, 5).forEach(p => {
                report += `• ${p.name}: *${p.stock}* unids.\n`;
            });
            report += `\n`;
        } else {
            report += `✅ *Inventario Saludable:*\n\n`;
        }

        report += `🚀 *Sistema de Ventas Profesional*`;
        return report;
    } catch (error) {
        console.error('Error generating detailed report:', error);
        return '❌ Error al generar el reporte diario.';
    }
};

const path = require('path');

/**
 * Genera un reporte PDF ultra detallado con diseño profesional
 * @param {Response} res Stream de respuesta de Express
 */
const generateDailyReportPDF = async (res) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const summary = await getDailySummary();
            const products = await getAllProducts();
            const sales = await getAllSales();

            const offset = await (require('./database').getSetting('time_offset'));
            const numericOffset = offset !== null ? parseFloat(offset) : -6;
            const todayDate = new Date(Date.now() + (numericOffset * 3600000));
            const todayISO = todayDate.toISOString().split('T')[0];

            let totalProfit = 0;
            let totalCost = 0;
            const productMap = new Map();
            products.forEach(p => productMap.set(String(p.id), p));

            // --- Filtros de Ventas del Día ---
            const dailySales = sales.filter(s => {
                if (!s.date) return false;
                const saleDate = s.date.includes('T') ? new Date(s.date).toISOString().split('T')[0] : s.date.split(' ')[0];
                return saleDate === todayISO;
            });

            // --- Métodos de Pago Summary ---
            const paymentMethods = { 'Efectivo': 0, 'Tarjeta/Transferencia': 0 };

            // --- Top Products Map ---
            const topProductsMap = new Map();

            // --- Categories Summary ---
            const categoriesMap = new Map();

            dailySales.forEach(s => {
                const p = productMap.get(String(s.productId));
                const subtotal = parseFloat(s.price) * parseFloat(s.quantity);

                // Ganancia
                if (p) {
                    const cost = parseFloat(p.cost_price) || 0;
                    totalCost += cost * parseFloat(s.quantity);
                    totalProfit += (parseFloat(s.price) - cost) * parseFloat(s.quantity);

                    // Categorías
                    const cat = p.category || 'Sin Categoría';
                    categoriesMap.set(cat, (categoriesMap.get(cat) || 0) + subtotal);
                }

                // Métodos de Pago
                const method = s.paymentMethod === 'tarjeta' ? 'Tarjeta/Transferencia' : 'Efectivo';
                paymentMethods[method] += subtotal;

                // Top Products
                topProductsMap.set(s.productName, (topProductsMap.get(s.productName) || 0) + parseFloat(s.quantity));
            });

            const topProducts = Array.from(topProductsMap, ([name, qty]) => ({ name, qty }))
                .sort((a, b) => b.qty - a.qty)
                .slice(0, 5);

            const formatMoney = (val) => `C$ ${parseFloat(val).toLocaleString('es-NI', { minimumFractionDigits: 2 })}`;

            doc.pipe(res);

            // --- Colores ---
            const primaryColor = '#4B0082'; // Indigo
            const secondaryColor = '#6A5ACD'; // SlateBlue
            const accentColor = '#006400'; // DarkGreen
            const warningColor = '#D2691E'; // Chocolate

            // --- Logo & Header ---
            const logoPath = path.join(__dirname, '..', 'public', 'Gemini_Generated_Image_tlsnlhtlsnlhtlsn.png');
            try {
                doc.image(logoPath, 50, 45, { width: 60 });
            } catch (e) {
                console.error("Logo not found at", logoPath);
            }

            doc.fillColor(primaryColor)
                .fontSize(22)
                .text('INFORME DIARIO DE VENTAS', 120, 50, { align: 'right' });

            // Formatear la hora de emisión correctamente usando el offset
            const emitDate = new Date(Date.now() + (numericOffset * 3600000));
            const day = String(emitDate.getUTCDate()).padStart(2, '0');
            const month = String(emitDate.getUTCMonth() + 1).padStart(2, '0');
            const year = emitDate.getUTCFullYear();
            let hours = emitDate.getUTCHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // la hora 0 es 12
            const minutes = String(emitDate.getUTCMinutes()).padStart(2, '0');
            const timeStr = `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;

            doc.fontSize(10)
                .fillColor('#666666')
                .text(`Fecha de Emisión: ${timeStr} (Zona horaria: ${numericOffset})`, { align: 'right' });

            doc.moveDown(2);
            doc.strokeColor('#EEEEEE').lineWidth(1).moveTo(50, 110).lineTo(550, 110).stroke();
            doc.moveDown(1.5);

            // --- Bloque 1: Resumen Financiero (Cuadrícula) ---
            const startY = doc.y;
            doc.rect(50, startY, 500, 100).fill('#F8F9FA');

            doc.fillColor(primaryColor).fontSize(14).text('RESUMEN FINANCIERO', 65, startY + 10, { bold: true });

            doc.fontSize(11).fillColor('#333333');
            doc.text('Ventas Brutas:', 65, startY + 35);
            doc.text(formatMoney(summary.totalSales), 200, startY + 35, { bold: true });

            doc.text('Costo de Mercancía:', 65, startY + 55);
            doc.text(formatMoney(totalCost), 200, startY + 55);

            doc.fillColor(accentColor).fontSize(13);
            doc.text('GANANCIA NETA:', 65, startY + 75, { bold: true });
            doc.text(formatMoney(totalProfit), 200, startY + 75, { bold: true });

            // Métodos de Pago a la derecha
            doc.fillColor('#333333').fontSize(10);
            doc.text('MÉTODOS DE PAGO', 350, startY + 35, { bold: true });
            doc.text(`Efectivo: ${formatMoney(paymentMethods['Efectivo'])}`, 350, startY + 50);
            doc.text(`Digital: ${formatMoney(paymentMethods['Tarjeta/Transferencia'])}`, 350, startY + 65);

            doc.moveDown(4);

            // --- Bloque 2: Análisis Rápido (Top 5 y Categorías) ---
            let currentY = doc.y;

            // Top 5
            doc.fillColor(secondaryColor).fontSize(14).text('TOP 5 PRODUCTOS MÁS VENDIDOS', 50, currentY, { bold: true });
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor('#000000');
            topProducts.forEach((tp, i) => {
                doc.text(`${i + 1}. ${tp.name}: ${tp.qty} unidades`);
            });

            // Gráfico de Categorías (Placeholder visual)
            doc.fillColor(secondaryColor).fontSize(14).text('VENTAS POR CATEGORÍA', 320, currentY, { bold: true });
            doc.moveDown(0.5);
            doc.fontSize(9).fillColor('#333333');
            Array.from(categoriesMap).slice(0, 6).forEach(([cat, val], i) => {
                const percent = ((val / summary.totalSales) * 100).toFixed(1);
                doc.text(`${cat}: ${formatMoney(val)} (${percent}%)`, 320, doc.y);
            });

            doc.moveDown(2);

            // --- Alertas de Inventario ---
            const lowStock = products.filter(p => p.stock <= 5);
            if (lowStock.length > 0) {
                doc.rect(50, doc.y, 500, 20 + (lowStock.length * 12)).fill('#FFF3E0');
                doc.fillColor(warningColor).fontSize(12).text('⚠️ ALERTAS DE REABASTECIMIENTO', 60, doc.y - (lowStock.length * 12) - 15, { bold: true });
                doc.fontSize(9).fillColor('#856404');
                lowStock.forEach(p => {
                    doc.text(`• ${p.name}: Quedan solamente ${p.stock} unidades.`, 60);
                });
                doc.moveDown(1.5);
            }

            // --- Tabla de Ventas Detalladas ---
            doc.fillColor(primaryColor).fontSize(14).text('DETALLE COMPLETO DE TRANSACCIONES', 50, doc.y, { bold: true });
            doc.moveDown(0.5);

            let tableTop = doc.y;
            doc.fillColor('#FFFFFF').rect(50, tableTop, 500, 18).fill(primaryColor);
            doc.fontSize(9).fillColor('#FFFFFF');
            doc.text('PRODUCTO', 55, tableTop + 5);
            doc.text('CATE.', 230, tableTop + 5);
            doc.text('CANT.', 300, tableTop + 5);
            doc.text('PRECIO', 350, tableTop + 5);
            doc.text('SUBTOTAL', 410, tableTop + 5);
            doc.text('GANANCIA', 485, tableTop + 5);

            let y = tableTop + 22;
            doc.fillColor('#000000');

            dailySales.forEach((s, index) => {
                if (y > 720) {
                    doc.addPage();
                    y = 50;
                    // Header de tabla en nueva página
                    doc.fillColor(primaryColor).rect(50, y, 500, 18).fill();
                    doc.fontSize(9).fillColor('#FFFFFF');
                    doc.text('PRODUCTO', 55, y + 5);
                    doc.text('CATE.', 230, y + 5);
                    doc.text('CANT.', 300, y + 5);
                    doc.text('PRECIO', 350, y + 5);
                    doc.text('SUBTOTAL', 410, y + 5);
                    doc.text('GANANCIA', 485, y + 5);
                    y += 22;
                }

                const p = productMap.get(String(s.productId));
                const cat = (p ? p.category : 'N/A').substring(0, 10);
                const profit = p ? (parseFloat(s.price) - parseFloat(p.cost_price)) * parseFloat(s.quantity) : 0;

                // Color alterno para filas
                if (index % 2 === 0) doc.rect(50, y - 2, 500, 14).fill('#F9F9F9');

                doc.fillColor('#333333');
                doc.text(s.productName.substring(0, 32), 55, y);
                doc.text(cat, 230, y);
                doc.text(s.quantity.toString(), 300, y);
                doc.text(parseFloat(s.price).toFixed(2), 350, y);
                doc.text((s.price * s.quantity).toFixed(2), 410, y);
                doc.fillColor(profit >= 0 ? accentColor : '#cc0000').text(profit.toFixed(2), 485, y);
                y += 14;
            });

            // --- Footer ---
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);
                doc.fontSize(8).fillColor('#AAAAAA').text(
                    `Página ${i + 1} de ${pages.count} | Sistema de Gestión de Ventas v2.0`,
                    50, 800, { align: 'center' }
                );
            }

            doc.end();
            resolve();
        } catch (err) {
            reject(err);
        }
    });
};

module.exports = { generateDailyReportText, generateDailyReportPDF };
