const { getAllSales, getAllProducts, getSetting } = require('./database');

// Función helper para obtener fecha ajustada (UTC+offset)
const getAdjustedDate = async () => {
  const offset = await getSetting('time_offset');
  const numericOffset = offset !== null ? parseFloat(offset) : -6;
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

    // Obtener offset
    const offsetStr = await getSetting('time_offset');
    const offset = offsetStr !== null ? parseFloat(offsetStr) : -6;

    // Filtrar ventas del día local que NO estén cerradas
    const dailySales = sales.filter(sale => {
      if (!sale.date || sale.is_closed === 1) return false;
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

    // Get offset for chart grouping
    const offsetStr = await getSetting('time_offset');
    const offset = offsetStr !== null ? parseFloat(offsetStr) : -6;

    sales.filter(s => s.is_closed === 0).forEach(sale => {
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

    sales.filter(s => s.is_closed === 0).forEach(sale => {
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

module.exports = {
  getDailySummary,
  getSalesChartData
};
