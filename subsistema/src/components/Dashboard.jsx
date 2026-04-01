import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
  TrendingUp, Package, AlertTriangle, Activity, Zap,
  DollarSign, ArrowUpRight, ArrowDownRight, RefreshCw,
  ShoppingBag, XCircle, Award, CreditCard, Clock
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

const fmt = (n) => Number(n || 0).toLocaleString('es-NI', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtC = (n) => `C$ ${fmt(n)}`;

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await axios.get('/api/dashboard/analytics');
      setData(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error cargando analytics:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Configurar Socket para tiempo real
    const socket = io();
    socket.on('dashboardUpdate', (data) => {
      console.log('Real-time update received:', data.type);
      fetchData(); // Recargar todo el set de analytics al haber cualquier cambio
    });

    const interval = setInterval(() => fetchData(), 60000 * 5); // Polling de seguridad cada 5 min
    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [fetchData]);

  if (loading) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin" />
      </div>
    </div>
  );

  const { dailySales = [], topProducts = [], categoryData = [], paymentMethods = [], overview = {}, criticalStock = [] } = data || {};

  // KPIs de la semana
  const weekRevenue = dailySales.reduce((s, d) => s + d.revenue, 0);
  const weekTxs = dailySales.reduce((s, d) => s + d.count, 0);
  const cancelRate = overview.totalSales > 0 ? ((overview.cancelledSales / (overview.totalSales + overview.cancelledSales)) * 100).toFixed(1) : 0;
  const avgTicket = weekTxs > 0 ? weekRevenue / weekTxs : 0;

  // Días de la semana formateados
  const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const chartData = dailySales.map(d => ({
    ...d,
    label: DAYS_ES[new Date(d.date + 'T12:00:00').getDay()]
  }));

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="text-5xl font-black text-white tracking-tighter"
          >
            ANALYTICS <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-400">360°</span>
          </motion.h1>
          <p className="text-slate-500 font-medium mt-1">
            Inteligencia de negocio · últimos 7 días
            {lastUpdated && <span className="ml-2 text-slate-600 text-xs">· Act. {lastUpdated.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white px-4 py-2.5 rounded-2xl text-sm font-bold transition-all hover:border-blue-500/50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <div className="flex items-center gap-2 bg-slate-900/50 p-2 px-4 rounded-2xl border border-slate-800/50">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
            <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">En Vivo</span>
          </div>
        </div>
      </header>

      {/* KPI Cards — métricas únicas no disponibles en el central */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard label="Ingresos Semana" value={fmtC(weekRevenue)} icon={<DollarSign size={20} className="text-blue-400" />} color="blue" sub="Últimos 7 días" up />
        <KpiCard label="Ticket Promedio" value={fmtC(avgTicket)} icon={<Award size={20} className="text-amber-400" />} color="amber" sub={`${weekTxs} transacciones`} up />
        <KpiCard label="Tasa Cancelación" value={`${cancelRate}%`} icon={<XCircle size={20} className="text-rose-400" />} color="rose" sub={`${overview.cancelledSales || 0} canceladas`} up={false} />
        <KpiCard label="Sin Stock" value={overview.outOfStock || 0} icon={<Package size={20} className="text-purple-400" />} color="purple" sub={`${overview.lowStockCount || 0} en alerta`} up={false} />
      </div>

      {/* Charts Section: Tendencia + Horas Pico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main Revenue Chart */}
        <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-400" />
                Tendencia de Ingresos
              </h2>
              <p className="text-slate-500 text-[10px] mt-1 uppercase tracking-widest font-black">Últimos 7 días</p>
            </div>
            <div className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-xl text-[10px] font-black border border-blue-500/20">
              TOTAL: {fmtC(weekRevenue)}
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} tickFormatter={v => `C$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '16px' }}
                  formatter={(v) => [fmtC(v), 'Ingreso']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#gradRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Hours Chart */}
        <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Clock size={20} className="text-amber-400" />
                Horas Pico
              </h2>
              <p className="text-slate-500 text-[10px] mt-1 uppercase tracking-widest font-black">Actividad Transaccional</p>
            </div>
            <div className="bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-xl text-[10px] font-black border border-amber-500/20 uppercase">
              GMT-6 Local
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hourlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="hour" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} interval={3} />
                <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '16px' }}
                  formatter={(v) => [v, 'Ventas/Atención']}
                />
                <Bar dataKey="count" name="Ventas" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Grid: Top Productos + Distribución por Categoría */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Top Productos (Ranking) — 3 columnas */}
        <div className="lg:col-span-3 bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-amber-500/10 p-3 rounded-2xl"><TrendingUp className="text-amber-400" size={20} /></div>
            <div>
              <h3 className="text-xl font-black text-white">Top 10 Productos</h3>
              <p className="text-slate-500 text-xs mt-0.5">Ranking por ingreso generado (histórico)</p>
            </div>
          </div>
          <div className="space-y-3">
            {topProducts.length === 0 && <p className="text-slate-500 text-center py-8 italic">Sin datos de ventas aún</p>}
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-4 group">
                <span className={`text-xs font-black w-6 text-center shrink-0 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-700' : 'text-slate-600'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-bold text-slate-200 truncate">{p.name}</span>
                    <span className="text-xs text-emerald-400 font-black shrink-0 ml-2">{fmtC(p.revenue)}</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(p.revenue / (topProducts[0]?.revenue || 1)) * 100}%`,
                        background: `hsl(${210 + i * 15}, 80%, 60%)`
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs text-slate-600 w-12 text-right shrink-0">{p.units} u.</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie Chart Categorías — 2 columnas */}
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-500/10 p-3 rounded-2xl"><Activity className="text-purple-400" size={20} /></div>
            <div>
              <h3 className="text-xl font-black text-white">Por Categoría</h3>
              <p className="text-slate-500 text-xs mt-0.5">Distribución de ventas</p>
            </div>
          </div>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-500 italic text-sm">Sin datos</div>
          ) : (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      formatter={(v) => [fmtC(v), 'Ingresos']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {categoryData.slice(0, 5).map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-slate-400 font-medium truncate max-w-[100px]">{c.name}</span>
                    </div>
                    <span className="text-xs font-black text-slate-300">{fmtC(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Métodos de Pago + Stock Alert Quick View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Métodos de pago */}
        <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-emerald-500/10 p-3 rounded-2xl"><CreditCard className="text-emerald-400" size={20} /></div>
            <div>
              <h3 className="text-xl font-black text-white">Métodos de Pago</h3>
              <p className="text-slate-500 text-xs mt-0.5">Distribución histórica por tipo</p>
            </div>
          </div>
          {paymentMethods.length === 0 ? (
            <p className="text-slate-500 text-center italic py-8">Sin datos</p>
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethods} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} tickFormatter={v => `C$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} width={70} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1e293b', borderRadius: '12px' }}
                    formatter={(v) => [fmtC(v), 'Total']}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28}>
                    {paymentMethods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Stock Crítico - Quick View */}
        <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-rose-500/10 p-3 rounded-2xl"><AlertTriangle className="text-rose-400" size={20} /></div>
            <div>
              <h3 className="text-xl font-black text-white">Alertas de Stock</h3>
              <p className="text-slate-500 text-xs mt-0.5">Productos con ≤10 unidades — ver Predictor para detalles</p>
            </div>
          </div>
          {criticalStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                <ShoppingBag className="text-emerald-400" size={24} />
              </div>
              <p className="text-emerald-400 font-black text-sm">¡Todo el inventario está saludable!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
              {criticalStock.slice(0, 8).map(p => (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-2xl border ${
                  p.urgency === 'critical' ? 'bg-rose-500/5 border-rose-500/20' :
                  p.urgency === 'warning' ? 'bg-amber-500/5 border-amber-500/20' :
                  'bg-slate-800/30 border-slate-700/30'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      p.urgency === 'critical' ? 'bg-rose-500 animate-pulse' :
                      p.urgency === 'warning' ? 'bg-amber-500' : 'bg-slate-500'
                    }`} />
                    <span className="text-sm font-bold text-slate-200 truncate max-w-[140px]">{p.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-black ${
                      p.urgency === 'critical' ? 'text-rose-400' :
                      p.urgency === 'warning' ? 'text-amber-400' : 'text-slate-400'
                    }`}>{p.stock} uds</p>
                    <p className="text-[10px] text-slate-600">
                      {p.daysLeft >= 999 ? 'Sin consumo' : `~${p.daysLeft}d`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const KpiCard = ({ label, value, icon, color, sub, up }) => {
  const colors = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', trend: 'bg-blue-500/10 text-blue-400' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', trend: 'bg-amber-500/10 text-amber-400' },
    rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', trend: 'bg-rose-500/10 text-rose-400' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', trend: 'bg-purple-500/10 text-purple-400' },
  };
  const c = colors[color] || colors.blue;
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`bg-[#0a0a0a] border ${c.border} rounded-[2rem] p-6 shadow-xl`}
    >
      <div className={`w-12 h-12 ${c.bg} rounded-2xl flex items-center justify-center mb-5`}>
        {icon}
      </div>
      <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-white tracking-tight">{value}</p>
      <div className={`inline-flex items-center gap-1 mt-3 text-[10px] font-black px-2 py-1 rounded-lg ${c.trend}`}>
        {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
        {sub}
      </div>
    </motion.div>
  );
};

export default Dashboard;