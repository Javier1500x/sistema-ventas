const { getAllSales, getAllProducts, getSetting } = require('./database');

// Función helper para obtener fecha ajustada (UTC+offset)
const getAdjustedDate = async () => {
  const offset = await getSetting('time_offset');
  // Siempre usar -6 como default para Nicaragua. Nunca usar un valor positivo o 0.
  let numericOffset = offset !== null ? parseFloat(offset) : -6;
  if (numericOffset >= 0 || isNaN(numericOffset)) numericOffset = -6;
  // Date.now() es UTC. Sumamos el offset para obtener un objeto Date cuyos dígitos UTC sean la hora local.
  return new Date(Date.now() + (numericOffset * 3600000));
};

// Función helper para obtener fecha ajustada sin hora (solo YYYY-MM-DD)
const getAdjustedDateString = async () => {
  const adjustedTime = await getAdjustedDate();
  return adjustedTime.toISOString().split('T')[0];
};

const getDailySummary = async () => {
  try {
    const sales = await getAllSales();
    const today = await getAdjustedDateString();

    // Placeholder for actual sales processing logic
    // The original code had a `db.get` call and `salesRow`, `cashRow` which were not defined.
    // This section needs to be re-implemented based on the actual data structure of `sales`
    // and how daily summary is calculated.
    // For now, returning a dummy value or throwing an error to indicate incomplete logic.

    // Obtener offset - siempre -6 para Nicaragua
    const offsetStr = await getSetting('time_offset');
    let offset = offsetStr !== null ? parseFloat(offsetStr) : -6;
    if (offset >= 0 || isNaN(offset)) offset = -6;

    // Incluir TODAS las ventas del día (abiertas y cerradas) para el resumen
    const dailySales = sales.filter(sale => {
      if (!sale.date) return false;
      const isExplicitUTC = sale.date.includes('Z') || sale.date.includes('T');
      if (isExplicitUTC) {
        const d = new Date(sale.date);
        const adjusted = new Date(d.getTime() + (offset * 3600000));
        return adjusted.toISOString().startsWith(today);
      } else {
        return sale.date.startsWith(today);
      }
    });

    const totalSales = dailySales.reduce((sum, sale) => {
      const price = parseFloat(sale.price) || 0;
      const quantity = parseFloat(sale.quantity) || 0;
      return sum + (price * quantity);
    }, 0);
    const salesCount = dailySales.length;

    return { totalSales, salesCount };
  } catch (error) {
    console.error('Error calculating daily summary:', error);
    return { totalSales: 0, salesCount: 0 };
  }
};

const getSalesChartData = async () => {
  try {
    const sales = await getAllSales();
    const products = await getAllProducts();

    // 1. Sales Trend (Last 7 Days)
    const sevenDaysAgo = await getAdjustedDate();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const salesTrendMap = new Map();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      salesTrendMap.set(dateStr, 0);
    }

    // Get offset for chart grouping - siempre -6 para Nicaragua
    const offsetStr = await getSetting('time_offset');
    let offset = offsetStr !== null ? parseFloat(offsetStr) : -6;
    if (offset >= 0 || isNaN(offset)) offset = -6;

    // Incluir TODAS las ventas (abiertas y cerradas) para que el gráfico muestre datos reales
    sales.forEach(sale => {
      if (!sale.date) return;
      const isExplicitUTC = sale.date.includes('Z') || sale.date.includes('T');
      let saleDateStr;

      if (isExplicitUTC) {
        const d = new Date(sale.date);
        const adjusted = new Date(d.getTime() + (offset * 3600000));
        saleDateStr = adjusted.toISOString().split('T')[0];
      } else {
        saleDateStr = sale.date.split(' ')[0];
      }

      if (salesTrendMap.has(saleDateStr)) {
        salesTrendMap.set(saleDateStr, salesTrendMap.get(saleDateStr) + (sale.price * sale.quantity));
      }
    });

    const salesTrend = Array.from(salesTrendMap, ([date, total]) => ({ date, total }));

    // 2. Sales by Category
    const categoryMap = new Map();
    const productCategoryMap = new Map();
    products.forEach(p => productCategoryMap.set(String(p.id), p.category));

    // Incluir TODAS las ventas para categorías
    sales.forEach(sale => {
      const cat = productCategoryMap.get(String(sale.productId)) || 'Otros';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + (sale.price * sale.quantity));
    });

    const salesByCategory = Array.from(categoryMap, ([name, value]) => ({ name, value }));

    return { salesTrend, salesByCategory };

  } catch (error) {
    console.error('Error calculating chart data:', error);
    return { salesTrend: [], salesByCategory: [] };
  }
};

const getComboSuggestions = async (productId) => {
  try {
    const sales = await getAllSales();
    
    // Agrupar ventas por transactionId para encontrar productos comprados juntos
    const bundles = new Map();
    sales.forEach(s => {
      if (!s.transactionId) return;
      if (!bundles.has(s.transactionId)) bundles.set(s.transactionId, []);
      bundles.get(s.transactionId).push(String(s.productId));
    });

    const companionCounts = new Map();
    bundles.forEach(items => {
      if (items.includes(String(productId))) {
        items.forEach(item => {
          if (item !== String(productId)) {
            companionCounts.set(item, (companionCounts.get(item) || 0) + 1);
          }
        });
      }
    });

    // Ordenar por frecuencia
    const sorted = Array.from(companionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3); // Top 3 sugerencias

    const products = await getAllProducts();
    return sorted.map(([id]) => products.find(p => String(p.id) === id)).filter(Boolean);
  } catch (error) {
    console.error('Error in getComboSuggestions:', error);
    return [];
  }
};

const getStockPredictor = async () => {
  try {
    const sales = await getAllSales();
    const products = await getAllProducts();
    const today = await getAdjustedDateString();

    // Obtener offset para ajuste de fechas
    const offsetStr = await getSetting('time_offset');
    let offset = offsetStr !== null ? parseFloat(offsetStr) : -6;
    if (offset >= 0 || isNaN(offset)) offset = -6;

    const alerts = [];
    products.forEach(product => {
      // Ventas de este producto hoy - ajustar por offset
      const todaySales = sales.filter(s => {
        if (!s.date || String(s.productId) !== String(product.id)) return false;
        const isExplicitUTC = s.date.includes('Z') || s.date.includes('T');
        if (isExplicitUTC) {
          const d = new Date(s.date);
          const adjusted = new Date(d.getTime() + (offset * 3600000));
          return adjusted.toISOString().startsWith(today);
        }
        return s.date.startsWith(today);
      }).reduce((sum, s) => sum + (parseFloat(s.quantity) || 0), 0);

      const stock = product.stock;
      if (stock > 0 && todaySales > stock * 0.5) {
        alerts.push({
          productId: product.id,
          name: product.name,
          currentStock: stock,
          todaySales,
          probability: 'ALTA',
          message: `Riesgo de agotamiento: Se ha vendido el ${Math.round((todaySales/(todaySales+stock))*100)}% del stock disponible hoy.`
        });
      }
    });

    return alerts;
  } catch (error) {
    console.error('Error in getStockPredictor:', error);
    return [];
  }
};

module.exports = {
  getDailySummary,
  getSalesChartData,
  getComboSuggestions,
  getStockPredictor
};
