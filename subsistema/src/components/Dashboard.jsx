import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, Legend, PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, Package, AlertTriangle, 
  Activity, Zap, DollarSign, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

const API_URL = '/api/dashboard'; // Ruta pública corregida

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_URL}/stats`);
        setStats(response.data);
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    </div>
  );

  const totalSales = (stats?.salesByHour || []).reduce((a, b) => a + (b || 0), 0);

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-5xl font-black text-white tracking-tighter"
          >
            PANEL <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-400">ESTRATÉGICO</span>
          </motion.h1>
          <p className="text-slate-500 font-medium mt-2">Monitoreo de rendimiento en tiempo real para tu pulpería</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-2xl border border-slate-800/50">
           <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
           <span className="text-xs font-black text-emerald-500 uppercase tracking-widest px-2">Transmisión Activa</span>
        </div>
      </header>

      {/* Tarjetas de Impacto */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ImpactCard 
          label="Ingresos Hoy" 
          value={`C$ ${totalSales.toLocaleString()}`}
          icon={<DollarSign className="text-blue-400" />}
          trend="+12.5%"
          color="blue"
        />
        <ImpactCard 
          label="Stock Crítico" 
          value={stats?.lowStock || 0}
          icon={<AlertTriangle className="text-rose-400" />}
          trend="Atención"
          color="rose"
          isAlert={stats?.lowStock > 0}
        />
        <ImpactCard 
          label="Productos" 
          value={stats?.totalProducts || 0}
          icon={<Package className="text-emerald-400" />}
          trend="Total Base"
          color="emerald"
        />
        <ImpactCard 
          label="Gasto Eléctrico" 
          value={stats?.appliancesCount || 0}
          icon={<Zap className="text-amber-400" />}
          trend="Equipos"
          color="amber"
        />
      </div>

      {/* Gráfica de Ventas - Estilo Crypto */}
      <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-8 md:p-10 shadow-2xl">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-2xl font-black text-white">Flujo de Ventas</h2>
            <p className="text-slate-500 text-sm">Actividad transaccional de las últimas 24 horas</p>
          </div>
          <div className="flex gap-2">
             <div className="bg-blue-500/10 text-blue-400 px-4 py-2 rounded-xl text-xs font-black border border-blue-500/20">HORA A HORA</div>
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={(stats?.salesByHour || []).map((v, i) => ({ hora: `${i}:00`, ventas: v || 0 }))}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="hora" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `C$${v}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', border: '1px solid #1e293b', borderRadius: '16px' }}
                itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="ventas" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid de Gráficas Secundarias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Rentabilidad */}
        <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-8 shadow-xl">
          <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
            <TrendingUp className="text-emerald-400" />
            Rentabilidad por Categoría
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.profitability || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #1e293b', borderRadius: '12px' }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[10, 10, 0, 0]} barSize={40}>
                  {(stats?.profitability || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerta de Stock Visual */}
        <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
           <div className="relative z-10">
              <h3 className="text-xl font-black text-white mb-6">Estado de Inventario</h3>
              <div className="space-y-6">
                 <div className="flex justify-between items-end">
                    <div>
                       <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Salud de Stock</p>
                       <p className="text-3xl font-black text-white mt-1">
                          {Math.round(((stats?.totalProducts - stats?.lowStock) / stats?.totalProducts) * 100) || 0}%
                       </p>
                    </div>
                    <div className="text-right">
                       <p className="text-rose-500 text-xs font-bold uppercase tracking-widest">En Riesgo</p>
                       <p className="text-xl font-black text-white">{stats?.lowStock || 0}</p>
                    </div>
                 </div>
                 <div className="w-full bg-slate-900 rounded-full h-4 overflow-hidden border border-slate-800">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(((stats?.totalProducts - stats?.lowStock) / stats?.totalProducts) * 100) || 0}%` }}
                      className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full"
                    />
                 </div>
                 <p className="text-slate-500 text-xs leading-relaxed italic">
                    *El porcentaje representa productos con más de 5 unidades disponibles.
                 </p>
              </div>
           </div>
           <div className="absolute -right-10 -bottom-10 opacity-5">
              <Package size={200} />
           </div>
        </div>
      </div>
    </div>
  );
};

const ImpactCard = ({ label, value, icon, trend, color, isAlert }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className={`bg-[#0a0a0a] border ${isAlert ? 'border-rose-500/50 animate-pulse' : 'border-slate-800/50'} rounded-[2rem] p-7 shadow-xl group transition-all`}
  >
    <div className="flex justify-between items-start mb-6">
      <div className={`p-4 bg-slate-900 rounded-2xl group-hover:scale-110 transition-transform duration-500`}>
        {icon}
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${color === 'rose' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
        {trend.includes('+') ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {trend}
      </div>
    </div>
    <p className="text-slate-500 text-xs font-black uppercase tracking-[0.15em] mb-1">{label}</p>
    <p className="text-3xl font-black text-white tracking-tighter">{value}</p>
  </motion.div>
);

export default Dashboard;