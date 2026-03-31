import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Package, TrendingDown, Clock, RefreshCw,
  ChevronRight, Zap, ShieldAlert, CheckCircle2, BarChart3
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadialBarChart, RadialBar
} from 'recharts';

const URGENCY_CONFIG = {
  critical: {
    label: 'CRÍTICO',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    dot: 'bg-rose-500',
    bar: '#ef4444',
    pulse: true
  },
  warning: {
    label: 'ALERTA',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
    bar: '#f59e0b',
    pulse: false
  },
  low: {
    label: 'BAJO',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
    bar: '#3b82f6',
    pulse: false
  }
};

const StockPredictor = () => {
  const [stocks, setStocks] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | critical | warning | low
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [analyticsRes, productsRes] = await Promise.all([
        axios.get('/api/dashboard/analytics'),
        axios.get('/api/dashboard/products')
      ]);
      setStocks(analyticsRes.data.criticalStock || []);
      setAllProducts(productsRes.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error cargando stock predictor:', err);
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 90000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = filter === 'all' ? stocks : stocks.filter(p => p.urgency === filter);
  const critical = stocks.filter(p => p.urgency === 'critical').length;
  const warning = stocks.filter(p => p.urgency === 'warning').length;
  const healthy = allProducts.length - stocks.length;

  // Datos para el RadialBar
  const healthData = [
    { name: 'Saludable', value: healthy, fill: '#10b981' },
    { name: 'Alerta', value: warning, fill: '#f59e0b' },
    { name: 'Crítico', value: critical, fill: '#ef4444' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-t-amber-500 rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="text-5xl font-black text-white tracking-tighter"
          >
            PREDICTOR <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-500">DE STOCK</span>
          </motion.h1>
          <p className="text-slate-500 font-medium mt-1">
            Proyección inteligente · qué tan pronto te vas a quedar sin producto
            {lastUpdated && <span className="ml-2 text-slate-600 text-xs">· Act. {lastUpdated.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)} disabled={refreshing}
          className="flex items-center gap-2 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white px-4 py-2.5 rounded-2xl text-sm font-bold transition-all hover:border-amber-500/50 disabled:opacity-50 self-start md:self-auto"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </header>

      {/* Resumen general */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="md:col-span-1 bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-6 flex flex-col items-center justify-center">
          <div className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="80%" data={healthData} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="value" cornerRadius={6} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '12px' }}
                  formatter={(v, n) => [v, n]}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest text-center">Salud del Inventario</p>
          <p className="text-2xl font-black text-white mt-1">{allProducts.length} productos</p>
        </div>

        <div className="md:col-span-3 grid grid-cols-3 gap-5">
          {[
            { label: 'Críticos', count: critical, sub: 'Quedan ≤2 días', color: 'rose', icon: <ShieldAlert size={22} className="text-rose-400" />, filter: 'critical' },
            { label: 'En Alerta', count: warning, sub: 'Quedan 3–5 días', color: 'amber', icon: <AlertTriangle size={22} className="text-amber-400" />, filter: 'warning' },
            { label: 'Saludables', count: healthy, sub: 'Inventario OK', color: 'emerald', icon: <CheckCircle2 size={22} className="text-emerald-400" />, filter: 'all' },
          ].map(card => (
            <motion.button
              key={card.label}
              whileHover={{ y: -4 }}
              onClick={() => setFilter(prev => prev === card.filter && card.filter !== 'all' ? 'all' : card.filter)}
              className={`bg-[#0a0a0a] border rounded-[2.5rem] p-6 text-left transition-all ${
                filter === card.filter && card.filter !== 'all'
                  ? `border-${card.color}-500/50 shadow-lg shadow-${card.color}-500/10`
                  : 'border-slate-800/50'
              }`}
            >
              <div className={`w-12 h-12 bg-${card.color}-500/10 rounded-2xl flex items-center justify-center mb-4`}>
                {card.icon}
              </div>
              <p className="text-4xl font-black text-white">{card.count}</p>
              <p className="text-slate-400 font-black text-xs uppercase tracking-widest mt-1">{card.label}</p>
              <p className="text-slate-600 text-xs mt-0.5">{card.sub}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'Todos en riesgo', count: stocks.length },
          { id: 'critical', label: '🔴 Críticos', count: critical },
          { id: 'warning', label: '🟡 En Alerta', count: warning },
          { id: 'low', label: '🔵 Stock Bajo', count: stocks.filter(p => p.urgency === 'low').length },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              filter === f.id
                ? 'bg-white text-black'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Lista de productos */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <CheckCircle2 size={48} className="text-emerald-500" />
          <p className="text-emerald-400 font-black text-xl">¡Sin alertas en esta categoría!</p>
          <p className="text-slate-500 text-sm">Todos los productos tienen stock suficiente.</p>
        </div>
      ) : (
        <>
          {/* Gráfica de días restantes (top 10) */}
          <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="text-amber-400" size={20} />
              <h3 className="text-xl font-black text-white">Días de Stock Restante</h3>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filtered.slice(0, 10)} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#475569" fontSize={9} axisLine={false} tickLine={false}
                    angle={-35} textAnchor="end" interval={0}
                    tick={{ fill: '#64748b', fontSize: 9 }}
                  />
                  <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} unit=" d" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '12px' }}
                    formatter={(v) => [v >= 999 ? 'Sin consumo' : `${v} días`, 'Días restantes']}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="daysLeft" radius={[8, 8, 0, 0]} barSize={36} maxBarSize={48}>
                    {filtered.slice(0, 10).map((entry, i) => (
                      <Cell key={i} fill={URGENCY_CONFIG[entry.urgency]?.bar || '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cards de productos */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <AnimatePresence>
              {filtered.map((p, i) => {
                const cfg = URGENCY_CONFIG[p.urgency] || URGENCY_CONFIG.low;
                const daysDisplay = p.daysLeft >= 999 ? '∞' : p.daysLeft;
                const daysLabel = p.daysLeft >= 999 ? 'Sin historial de ventas' : p.daysLeft === 0 ? '¡SE AGOTARÁ HOY!' : `~${p.daysLeft} día${p.daysLeft !== 1 ? 's' : ''} restante${p.daysLeft !== 1 ? 's' : ''}`;
                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: i * 0.04 }}
                    className={`${cfg.bg} border ${cfg.border} rounded-[2rem] p-6 relative overflow-hidden`}
                  >
                    {/* Urgency Badge */}
                    <div className={`absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/30`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
                    </div>

                    <div className="flex items-start gap-3 mb-5 pr-16">
                      <div className={`${cfg.bg} border ${cfg.border} p-2.5 rounded-xl`}>
                        <Package size={18} className={cfg.color} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-white truncate">{p.name}</h4>
                        {p.category && <p className="text-xs text-slate-500 mt-0.5">{p.category}</p>}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      <div className="bg-black/20 rounded-xl p-3 text-center">
                        <p className={`text-2xl font-black ${cfg.color}`}>{p.stock}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">Stock</p>
                      </div>
                      <div className="bg-black/20 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-white">{p.avgDailySales}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">Vta/Día</p>
                      </div>
                      <div className="bg-black/20 rounded-xl p-3 text-center">
                        <p className={`text-2xl font-black ${p.daysLeft <= 2 ? 'text-rose-400' : 'text-white'}`}>
                          {daysDisplay}
                          {p.daysLeft < 999 && <span className="text-sm ml-0.5">d</span>}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">Proyección</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {p.daysLeft < 999 && (
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs text-slate-500 font-medium">{daysLabel}</span>
                        </div>
                        <div className="w-full bg-black/30 rounded-full h-2">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              width: `${Math.min((p.daysLeft / 30) * 100, 100)}%`,
                              backgroundColor: URGENCY_CONFIG[p.urgency]?.bar
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                          <span>Hoy</span>
                          <span>30 días</span>
                        </div>
                      </div>
                    )}
                    {p.daysLeft >= 999 && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 italic">
                        <Clock size={12} />
                        Sin datos de consumo reciente — verifica manualmente
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
};

export default StockPredictor;
