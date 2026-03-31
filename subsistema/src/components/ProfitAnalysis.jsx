import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, RefreshCw,
  Award, Target, PieChartIcon, ArrowUpRight, ArrowDownRight, Info
} from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ScatterChart, Scatter, ZAxis
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#a3e635', '#fb7185'];
const fmt = (n) => Number(n || 0).toLocaleString('es-NI', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtC = (n) => `C$ ${fmt(n)}`;
const fmtPct = (n) => `${Number(n || 0).toFixed(1)}%`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0a0a] border border-slate-700 rounded-2xl p-3 shadow-2xl">
      {label && <p className="text-slate-400 text-xs font-bold mb-2">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-black" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.name.includes('C$') ? fmtC(p.value) : typeof p.value === 'number' && p.name.includes('%') ? fmtPct(p.value) : fmtC(p.value)}
        </p>
      ))}
    </div>
  );
};

const ProfitAnalysis = () => {
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState('category'); // category | products | trends
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [analyticsRes, prodsRes] = await Promise.all([
        axios.get('/api/dashboard/analytics'),
        axios.get('/api/dashboard/products'),
      ]);
      setData(analyticsRes.data);
      setProducts(prodsRes.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error cargando profitability:', err);
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(() => fetchData(), 120000);
    return () => clearInterval(iv);
  }, [fetchData]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    </div>
  );

  const { categoryData = [], topProducts = [], dailySales = [], overview = {} } = data || {};
  const weekRevenue = dailySales.reduce((s, d) => s + d.revenue, 0);

  // Calcular margen estimado por producto (precio - costo) / precio * 100
  const productMargins = products
    .filter(p => p.cost_price && p.price)
    .map(p => ({
      name: p.name,
      category: p.category || 'Sin cat.',
      price: p.price,
      cost: p.cost_price,
      margin: ((p.price - p.cost_price) / p.price) * 100,
      profit: p.price - p.cost_price,
      stock: p.stock,
      potential: (p.price - p.cost_price) * p.stock // ganancia potencial si se vende todo
    }))
    .sort((a, b) => b.margin - a.margin);

  const avgMargin = productMargins.length > 0
    ? productMargins.reduce((s, p) => s + p.margin, 0) / productMargins.length
    : 0;

  const totalPotential = productMargins.reduce((s, p) => s + p.potential, 0);

  // Margen por categoría
  const catMargins = {};
  productMargins.forEach(p => {
    if (!catMargins[p.category]) catMargins[p.category] = { name: p.category, totalMargin: 0, count: 0, bestProduct: p.name };
    catMargins[p.category].totalMargin += p.margin;
    catMargins[p.category].count += 1;
  });
  const catMarginData = Object.values(catMargins)
    .map(c => ({ ...c, avgMargin: c.totalMargin / c.count }))
    .sort((a, b) => b.avgMargin - a.avgMargin);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-5xl font-black text-white tracking-tighter">
            RENTABILIDAD <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">PRO</span>
          </motion.h1>
          <p className="text-slate-500 font-medium mt-1">
            Análisis de márgenes y ganancias por producto y categoría
            {lastUpdated && <span className="ml-2 text-slate-600 text-xs">· Act. {lastUpdated.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)} disabled={refreshing}
          className="flex items-center gap-2 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white px-4 py-2.5 rounded-2xl text-sm font-bold transition-all hover:border-emerald-500/50 disabled:opacity-50 self-start md:self-auto"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: 'Margen Promedio', value: fmtPct(avgMargin),
            icon: <Target size={20} className="text-emerald-400" />, color: 'emerald',
            sub: 'De todos los productos con costo', up: avgMargin >= 20
          },
          {
            label: 'Ingreso Semanal', value: fmtC(weekRevenue),
            icon: <DollarSign size={20} className="text-blue-400" />, color: 'blue',
            sub: 'Últimos 7 días', up: true
          },
          {
            label: 'Potencial en Stock', value: fmtC(totalPotential),
            icon: <Award size={20} className="text-amber-400" />, color: 'amber',
            sub: 'Ganancia si se vende todo', up: true
          },
          {
            label: 'Productos Analizados', value: productMargins.length,
            icon: <BarChart3 size={20} className="text-purple-400" />, color: 'purple',
            sub: `de ${products.length} total con precio de costo`, up: true
          },
        ].map(card => (
          <motion.div key={card.label} whileHover={{ y: -4 }}
            className={`bg-[#0a0a0a] border border-${card.color}-500/20 rounded-[2rem] p-6 shadow-xl`}
          >
            <div className={`w-11 h-11 bg-${card.color}-500/10 rounded-2xl flex items-center justify-center mb-4`}>{card.icon}</div>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">{card.label}</p>
            <p className="text-3xl font-black text-white tracking-tight">{card.value}</p>
            <div className={`inline-flex items-center gap-1 mt-2 text-[10px] font-black px-2 py-1 rounded-lg bg-${card.color}-500/10 text-${card.color}-400`}>
              {card.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
              {card.sub}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Vista Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'category', label: '📊 Por Categoría' },
          { id: 'products', label: '📦 Por Producto' },
          { id: 'trends', label: '📈 Tendencia Semanal' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
              view === tab.id ? 'bg-white text-black' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Vista: Por Categoría */}
      {view === 'category' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pie Chart de Ingresos por Categoría */}
          <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-8 shadow-xl">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
              <PieChartIcon size={18} className="text-blue-400" />
              Distribución de Ingresos
            </h3>
            {categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-500 text-sm italic">Sin datos de ventas aún</div>
            ) : (
              <>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" outerRadius={95} innerRadius={50} dataKey="value" paddingAngle={3}>
                        {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '12px' }} formatter={(v) => [fmtC(v), 'Ingresos']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {categoryData.map((c, i) => {
                    const pct = categoryData.reduce((s, d) => s + d.value, 0);
                    return (
                      <div key={c.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-xs text-slate-400 font-medium">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">{fmtPct((c.value / pct) * 100)}</span>
                          <span className="text-xs font-black text-slate-300">{fmtC(c.value)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Margen por Categoría */}
          <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-8 shadow-xl">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" />
              Margen Promedio por Categoría
            </h3>
            {catMarginData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
                <Info size={32} className="text-slate-600" />
                <p className="text-slate-500 text-sm">No hay productos con precio de costo registrado.</p>
                <p className="text-slate-600 text-xs">Agrega el "Precio de Costo" en cada producto desde el sistema central para ver los márgenes.</p>
              </div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catMarginData} layout="vertical" margin={{ right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(0)}%`} domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      formatter={(v) => [`${v.toFixed(1)}%`, 'Margen promedio']}
                    />
                    <Bar dataKey="avgMargin" radius={[0, 8, 8, 0]} barSize={24}>
                      {catMarginData.map((entry, i) => (
                        <Cell key={i} fill={entry.avgMargin >= 30 ? '#10b981' : entry.avgMargin >= 15 ? '#f59e0b' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vista: Por Producto */}
      {view === 'products' && (
        <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-xl font-black text-white">Tabla de Márgenes por Producto</h3>
            <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black px-2.5 py-1 rounded-lg">
              <Info size={11} />
              Solo productos con precio de costo registrado
            </div>
          </div>
          {productMargins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Info size={40} className="text-slate-600" />
              <p className="text-slate-400 font-black">Sin precios de costo registrados</p>
              <p className="text-slate-600 text-sm max-w-sm">Ve al sistema central → Productos → Editar, y agrega el "Precio de Costo" para ver los márgenes aquí.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-500 text-xs font-black uppercase tracking-widest border-b border-slate-800">
                    <th className="pb-4 pr-4">#</th>
                    <th className="pb-4 pr-6">Producto</th>
                    <th className="pb-4 pr-6 text-center">Costo</th>
                    <th className="pb-4 pr-6 text-center">Precio</th>
                    <th className="pb-4 pr-6 text-center">Ganancia/ud</th>
                    <th className="pb-4 pr-6 text-center">Margen</th>
                    <th className="pb-4 text-right">Potencial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {productMargins.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 pr-4 text-slate-600 font-black text-sm">{i + 1}</td>
                      <td className="py-4 pr-6">
                        <p className="font-bold text-slate-200 text-sm">{p.name}</p>
                        <p className="text-xs text-slate-600">{p.category}</p>
                      </td>
                      <td className="py-4 pr-6 text-center text-slate-400 text-sm">{fmtC(p.cost)}</td>
                      <td className="py-4 pr-6 text-center text-white font-bold text-sm">{fmtC(p.price)}</td>
                      <td className="py-4 pr-6 text-center">
                        <span className={`font-black text-sm ${p.profit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {fmtC(p.profit)}
                        </span>
                      </td>
                      <td className="py-4 pr-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-900 rounded-full h-1.5">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(p.margin, 100)}%`,
                                backgroundColor: p.margin >= 30 ? '#10b981' : p.margin >= 15 ? '#f59e0b' : '#ef4444'
                              }}
                            />
                          </div>
                          <span className={`font-black text-sm ${p.margin >= 30 ? 'text-emerald-400' : p.margin >= 15 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {fmtPct(p.margin)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <p className="text-blue-400 font-black text-sm">{fmtC(p.potential)}</p>
                        <p className="text-xs text-slate-600">{p.stock} uds</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Vista: Tendencia Semanal */}
      {view === 'trends' && (
        <div className="space-y-8">
          <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-8 shadow-xl">
            <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-400" />
              Ingresos Diarios — Últimos 7 Días
            </h3>
            <p className="text-slate-500 text-xs mb-8">Comparativa día a día de la semana actual</p>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySales.map(d => ({
                  ...d,
                  label: new Date(d.date + 'T12:00:00').toLocaleDateString('es-NI', { weekday: 'short', day: 'numeric' })
                }))}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="label" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} tickFormatter={v => `C$${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '16px' }}
                    formatter={(v, n) => n === 'count' ? [v, 'Transacciones'] : [fmtC(v), 'Ingresos']}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="revenue" name="Ingresos C$" fill="url(#barGrad)" radius={[10, 10, 0, 0]} barSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tickets vs Ingresos */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {dailySales.map((d, i) => {
              const maxRev = Math.max(...dailySales.map(x => x.revenue), 1);
              const pct = (d.revenue / maxRev) * 100;
              const dayLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('es-NI', { weekday: 'short' });
              const isToday = d.date === new Date().toISOString().split('T')[0];
              return (
                <div
                  key={d.date}
                  className={`bg-[#0a0a0a] border rounded-[2rem] p-4 text-center ${isToday ? 'border-blue-500/40 bg-blue-500/5' : 'border-slate-800/50'}`}
                >
                  <p className={`text-xs font-black uppercase tracking-widest mb-3 ${isToday ? 'text-blue-400' : 'text-slate-500'}`}>{dayLabel}</p>
                  <div className="flex flex-col items-center gap-1 mb-3">
                    <div className="w-2 bg-slate-800 rounded-full overflow-hidden" style={{ height: '60px' }}>
                      <div className="w-full rounded-full bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-1000"
                        style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
                    </div>
                  </div>
                  <p className="text-white font-black text-sm">{fmtC(d.revenue)}</p>
                  <p className="text-slate-600 text-xs mt-0.5">{d.count} tx</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfitAnalysis;
