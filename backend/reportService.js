const { getAllSales, getAllProducts } = require('./database');
const { getDailySummary } = require('./decisionEngine');
const PDFDocument = require('pdfkit');

const generateDailyReportText = async () => {
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

        let report = `REPORTE DE VENTAS - ${today}\n\n`;
        report += `Resumen Financiero:\n`;
        report += `- Total Ventas: C$ ${summary.totalSales.toLocaleString()}\n`;
        report += `- Ganancia Estimada: C$ ${totalProfit.toLocaleString()}\n`;
        report += `- Transacciones: ${summary.salesCount}\n\n`;

        if (lowStockProducts.length > 0) {
            report += `ALERTAS DE STOCK BAJO:\n`;
            lowStockProducts.slice(0, 5).forEach(p => {
                report += `- ${p.name}: ${p.stock} unids.\n`;
            });
            report += `\n`;
        } else {
            report += `Inventario Saludable\n\n`;
        }

        report += `Sistema de Ventas Profesional`;
        return report;
    } catch (error) {
        console.error('Error generating detailed report:', error);
        return 'Error al generar el reporte diario.';
    }
};

const path = require('path');

const generateDailyReportPDF = async (res) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
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

            const dailySales = sales.filter(s => {
                if (!s.date) return false;
                const saleDate = s.date.includes('T') ? new Date(s.date).toISOString().split('T')[0] : s.date.split(' ')[0];
                return saleDate === todayISO;
            });

            const paymentMethods = { 'Efectivo': 0, 'Tarjeta/Transferencia': 0 };
            const topProductsMap = new Map();
            const categoriesMap = new Map();

            dailySales.forEach(s => {
                const p = productMap.get(String(s.productId));
                const subtotal = parseFloat(s.price) * parseFloat(s.quantity);

                if (p) {
                    const cost = parseFloat(p.cost_price) || 0;
                    totalCost += cost * parseFloat(s.quantity);
                    totalProfit += (parseFloat(s.price) - cost) * parseFloat(s.quantity);
                    const cat = p.category || 'Sin Categoria';
                    categoriesMap.set(cat, (categoriesMap.get(cat) || 0) + subtotal);
                }

                const method = s.paymentMethod === 'tarjeta' ? 'Tarjeta/Transferencia' : 'Efectivo';
                paymentMethods[method] += subtotal;

                topProductsMap.set(s.productName, (topProductsMap.get(s.productName) || 0) + parseFloat(s.quantity));
            });

            const topProducts = Array.from(topProductsMap, ([name, qty]) => ({ name, qty }))
                .sort((a, b) => b.qty - a.qty)
                .slice(0, 5);

            const formatMoney = (val) => `C$ ${parseFloat(val).toLocaleString('es-NI', { minimumFractionDigits: 2 })}`;

            doc.pipe(res);

            const primaryColor = '#4B0082';
            const secondaryColor = '#6A5ACD';
            const accentColor = '#006400';
            const warningColor = '#D2691E';
            const lightBg = '#F8F9FA';

            const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
            const left = doc.page.margins.left;

            const emitDate = new Date(Date.now() + (numericOffset * 3600000));
            const day = String(emitDate.getUTCDate()).padStart(2, '0');
            const month = String(emitDate.getUTCMonth() + 1).padStart(2, '0');
            const year = emitDate.getUTCFullYear();
            let hours = emitDate.getUTCHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const minutes = String(emitDate.getUTCMinutes()).padStart(2, '0');
            const timeStr = `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;

            // === HEADER CORPORATIVO FULL WIDTH ===
            const headerY = 40;
            const logoPath = path.join(__dirname, '..', 'public', 'Gemini_Generated_Image_tlsnlhtlsnlhtlsn.png');
            try {
                doc.image(logoPath, left, headerY, { width: 50, height: 50 });
            } catch (e) {
                console.error("Logo not found at", logoPath);
            }

            doc.fillColor(primaryColor)
                .fontSize(20)
                .font('Helvetica-Bold')
                .text('INFORME DIARIO DE VENTAS', left + 60, headerY + 5, { width: pageW - 60, align: 'left' });

            doc.fontSize(9)
                .font('Helvetica')
                .fillColor('#666666')
                .text(`Fecha: ${timeStr}  |  Zona: UTC${numericOffset >= 0 ? '+' : ''}${numericOffset}`, left + 60, headerY + 30, { width: pageW - 60, align: 'left' });

            const lineY = headerY + 58;
            doc.strokeColor(primaryColor)
                .lineWidth(2)
                .moveTo(left, lineY)
                .lineTo(left + pageW, lineY)
                .stroke();

            doc.y = lineY + 15;

            // === RESUMEN FINANCIERO - TARJETAS HORIZONTALES ===
            doc.fillColor(primaryColor)
                .fontSize(12)
                .font('Helvetica-Bold')
                .text('RESUMEN FINANCIERO', left, doc.y, { width: pageW });

            doc.y += 5;

            const cardY = doc.y;
            const cardH = 55;
            const cardGap = 8;
            const cardW = (pageW - cardGap * 2) / 3;

            // Card 1: Ventas Brutas
            doc.roundedRect(left, cardY, cardW, cardH, 4).fill('#EDE7F6');
            doc.fillColor('#333333').fontSize(8).font('Helvetica').text('VENTAS BRUTAS', left + 10, cardY + 8, { width: cardW - 20 });
            doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text(formatMoney(summary.totalSales), left + 10, cardY + 22, { width: cardW - 20 });
            doc.fontSize(8).fillColor('#666666').font('Helvetica').text(`${summary.salesCount} transacciones`, left + 10, cardY + 40, { width: cardW - 20 });

            // Card 2: Costo
            const card2X = left + cardW + cardGap;
            doc.roundedRect(card2X, cardY, cardW, cardH, 4).fill('#FFF3E0');
            doc.fillColor('#333333').fontSize(8).font('Helvetica').text('COSTO MERCANCIA', card2X + 10, cardY + 8, { width: cardW - 20 });
            doc.fillColor(warningColor).fontSize(14).font('Helvetica-Bold').text(formatMoney(totalCost), card2X + 10, cardY + 22, { width: cardW - 20 });
            doc.fontSize(8).fillColor('#666666').font('Helvetica').text('Inversion del dia', card2X + 10, cardY + 40, { width: cardW - 20 });

            // Card 3: Ganancia
            const card3X = left + (cardW + cardGap) * 2;
            const profitColor = totalProfit >= 0 ? '#E8F5E9' : '#FFEBEE';
            const profitTextColor = totalProfit >= 0 ? accentColor : '#cc0000';
            doc.roundedRect(card3X, cardY, cardW, cardH, 4).fill(profitColor);
            doc.fillColor('#333333').fontSize(8).font('Helvetica').text('GANANCIA NETA', card3X + 10, cardY + 8, { width: cardW - 20 });
            doc.fillColor(profitTextColor).fontSize(14).font('Helvetica-Bold').text(formatMoney(totalProfit), card3X + 10, cardY + 22, { width: cardW - 20 });
            doc.fontSize(8).fillColor('#666666').font('Helvetica').text(totalProfit >= 0 ? 'Margen positivo' : 'Margen negativo', card3X + 10, cardY + 40, { width: cardW - 20 });

            doc.y = cardY + cardH + 15;

            // === METODOS DE PAGO ===
            doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold')
                .text('METODOS DE PAGO', left, doc.y, { width: pageW });

            doc.y += 5;
            const pmY = doc.y;
            const pmCardW = (pageW - cardGap) / 2;

            doc.roundedRect(left, pmY, pmCardW, 30, 3).fill('#E8F5E9');
            doc.fillColor('#333333').fontSize(9).font('Helvetica').text(`Efectivo: ${formatMoney(paymentMethods['Efectivo'])}`, left + 10, pmY + 9, { width: pmCardW - 20 });

            doc.roundedRect(left + pmCardW + cardGap, pmY, pmCardW, 30, 3).fill('#E3F2FD');
            doc.fillColor('#333333').fontSize(9).font('Helvetica').text(`Digital: ${formatMoney(paymentMethods['Tarjeta/Transferencia'])}`, left + pmCardW + cardGap + 10, pmY + 9, { width: pmCardW - 20 });

            doc.y = pmY + 45;

            // === SEPARADOR ===
            doc.strokeColor('#DDDDDD').lineWidth(0.5)
                .moveTo(left, doc.y)
                .lineTo(left + pageW, doc.y)
                .stroke();
            doc.y += 12;

            // === TOP 5 Y CATEGORIAS - DOS COLUMNAS LIMPIAS ===
            const colW = (pageW - 20) / 2;
            const sectionTopY = doc.y;

            // Columna izquierda: Top 5
            doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold')
                .text('TOP 5 PRODUCTOS VENDIDOS', left, sectionTopY, { width: colW });

            doc.y = sectionTopY + 18;
            doc.fontSize(9).font('Helvetica').fillColor('#333333');

            if (topProducts.length === 0) {
                doc.text('Sin ventas registradas hoy.', left, doc.y, { width: colW });
            } else {
                topProducts.forEach((tp, i) => {
                    const rowY = doc.y;
                    if (rowY > 700) {
                        doc.addPage();
                        doc.y = 50;
                    }
                    const medal = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#999999';
                    doc.circle(left + 6, doc.y + 5, 5).fill(medal);
                    doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold')
                        .text(String(i + 1), left + 3.5, doc.y + 2.5);
                    doc.fillColor('#333333').fontSize(9).font('Helvetica')
                        .text(`${tp.name}`, left + 16, doc.y - 7, { width: colW - 16 });
                    doc.fillColor(secondaryColor).fontSize(8).font('Helvetica-Bold')
                        .text(`${tp.qty} unidades`, left + 16, doc.y + 2, { width: colW - 16 });
                    doc.y += 20;
                });
            }

            const rightColX = left + colW + 20;

            // Columna derecha: Categorias
            doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold')
                .text('VENTAS POR CATEGORIA', rightColX, sectionTopY, { width: colW });

            doc.y = sectionTopY + 18;

            if (categoriesMap.size === 0) {
                doc.fontSize(9).font('Helvetica').fillColor('#333333')
                    .text('Sin datos de categorias.', rightColX, doc.y, { width: colW });
            } else {
                const sortedCats = Array.from(categoriesMap).sort((a, b) => b[1] - a[1]);
                const maxVal = sortedCats[0] ? sortedCats[0][1] : 1;

                sortedCats.slice(0, 6).forEach(([cat, val]) => {
                    const barY = doc.y;
                    const percent = summary.totalSales > 0 ? ((val / summary.totalSales) * 100).toFixed(1) : 0;
                    const barWidth = maxVal > 0 ? (val / maxVal) * (colW - 80) : 0;

                    doc.fontSize(9).font('Helvetica').fillColor('#333333')
                        .text(cat, rightColX, barY, { width: 70, continued: false });

                    doc.fillColor('#E0E0E0')
                        .roundedRect(rightColX + 75, barY + 1, colW - 80, 10, 2).fill();

                    doc.fillColor(secondaryColor)
                        .roundedRect(rightColX + 75, barY + 1, Math.max(barWidth, 2), 10, 2).fill();

                    doc.fillColor('#666666').fontSize(7).font('Helvetica')
                        .text(`${formatMoney(val)} (${percent}%)`, rightColX + 78 + barWidth, barY + 1);

                    doc.y = barY + 16;
                });
            }

            // Set Y to the max of both columns
            doc.y = Math.max(doc.y, sectionTopY + 200);

            // === SEPARADOR ===
            doc.y += 8;
            doc.strokeColor('#DDDDDD').lineWidth(0.5)
                .moveTo(left, doc.y)
                .lineTo(left + pageW, doc.y)
                .stroke();
            doc.y += 12;

            // === ALERTAS DE INVENTARIO ===
            const lowStock = products.filter(p => p.stock <= 5);
            if (lowStock.length > 0) {
                if (doc.y > 680) {
                    doc.addPage();
                    doc.y = 50;
                }

                const alertStartY = doc.y;
                const alertLineH = 14;
                const alertHeaderH = 22;
                const alertContentH = lowStock.length * alertLineH;
                const alertTotalH = alertHeaderH + alertContentH + 10;

                doc.roundedRect(left, alertStartY, pageW, alertTotalH, 4).fill('#FFF3E0');

                doc.fillColor(warningColor).fontSize(10).font('Helvetica-Bold')
                    .text('ALERTAS DE REABASTECIMIENTO', left + 10, alertStartY + 7, { width: pageW - 20 });

                doc.fontSize(8).font('Helvetica').fillColor('#856404');
                let alertY = alertStartY + alertHeaderH;
                lowStock.forEach(p => {
                    doc.text(`- ${p.name}: Quedan solo ${p.stock} unidades.`, left + 15, alertY, { width: pageW - 30 });
                    alertY += alertLineH;
                });

                doc.y = alertStartY + alertTotalH + 12;
            }

            // === TABLA DE TRANSACCIONES ===
            if (doc.y > 650) {
                doc.addPage();
                doc.y = 50;
            }

            doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold')
                .text('DETALLE DE TRANSACCIONES', left, doc.y, { width: pageW });

            doc.y += 8;

            // Table column definitions
            const cols = [
                { label: 'PRODUCTO', x: left + 5, w: 160 },
                { label: 'CATEG.', x: left + 170, w: 65 },
                { label: 'CANT.', x: left + 240, w: 40 },
                { label: 'PRECIO', x: left + 285, w: 60 },
                { label: 'SUBTOTAL', x: left + 350, w: 65 },
                { label: 'GANANCIA', x: left + 420, w: 65 }
            ];

            const drawTableHeader = (y) => {
                doc.fillColor(primaryColor).rect(left, y, pageW, 20).fill();
                doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold');
                cols.forEach(col => {
                    doc.text(col.label, col.x, y + 6, { width: col.w });
                });
                return y + 22;
            };

            let tableY = drawTableHeader(doc.y);
            doc.font('Helvetica').fontSize(8);

            dailySales.forEach((s, index) => {
                if (tableY > 740) {
                    doc.addPage();
                    tableY = 50;
                    tableY = drawTableHeader(tableY);
                }

                const p = productMap.get(String(s.productId));
                const cat = (p ? p.category : 'N/A').substring(0, 12);
                const profit = p ? (parseFloat(s.price) - parseFloat(p.cost_price || 0)) * parseFloat(s.quantity) : 0;

                // Alternating row background
                if (index % 2 === 0) {
                    doc.fillColor('#F9F9F9').rect(left, tableY - 2, pageW, 16).fill();
                }

                doc.fillColor('#333333').font('Helvetica').fontSize(8);
                doc.text(s.productName.substring(0, 28), cols[0].x, tableY, { width: cols[0].w });
                doc.text(cat, cols[1].x, tableY, { width: cols[1].w });
                doc.text(String(s.quantity), cols[2].x, tableY, { width: cols[2].w });
                doc.text(parseFloat(s.price).toFixed(2), cols[3].x, tableY, { width: cols[3].w });
                doc.text((parseFloat(s.price) * parseFloat(s.quantity)).toFixed(2), cols[4].x, tableY, { width: cols[4].w });

                doc.fillColor(profit >= 0 ? accentColor : '#cc0000').font('Helvetica-Bold');
                doc.text(profit.toFixed(2), cols[5].x, tableY, { width: cols[5].w });

                tableY += 16;
            });

            // Table border bottom
            doc.strokeColor(primaryColor).lineWidth(1)
                .moveTo(left, tableY)
                .lineTo(left + pageW, tableY)
                .stroke();

            // === TOTALES DE TABLA ===
            if (dailySales.length > 0) {
                doc.y = tableY + 8;
                doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(10);
                doc.text(`Total Transacciones: ${dailySales.length}`, left, doc.y, { width: pageW / 2 });
                doc.text(`Ganancia del Dia: ${formatMoney(totalProfit)}`, left + pageW / 2, doc.y, { width: pageW / 2, align: 'right' });
            }

            // === FOOTER EN TODAS LAS PAGINAS ===
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);
                const footerY = doc.page.height - 35;
                doc.strokeColor(primaryColor).lineWidth(0.5)
                    .moveTo(left, footerY)
                    .lineTo(left + pageW, footerY)
                    .stroke();
                doc.fontSize(7).fillColor('#AAAAAA').font('Helvetica')
                    .text(
                        `Pagina ${i + 1} de ${pages.count}  |  Sistema de Ventas Profesional`,
                        left, footerY + 5,
                        { width: pageW, align: 'center' }
                    );
            }

            doc.end();
            resolve();
        } catch (err) {
            console.error('Error generating PDF:', err);
            reject(err);
        }
    });
};

module.exports = { generateDailyReportText, generateDailyReportPDF };
