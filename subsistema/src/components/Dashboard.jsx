import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  TrendingUp, Package, AlertTriangle, 
  Activity, Zap, ShoppingBag 
} from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_URL}/dashboard/stats`);
        setStats(response.data);
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Recargar cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-950 text-white font-sans">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4 mx-auto"></div>
        <p className="text-xl font-bold animate-pulse">Sincronizando con la Pulpería...</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          PANEL DE CONTROL - PULPERÍA INTELIGENTE
        </h1>
        <p className="text-slate-400 mt-2">Visión estratégica en tiempo real</p>
      </header>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          icon={<Package className="text-blue-400" />} 
          label="Total Productos" 
          value={stats?.totalProducts || 0} 
          color="border-blue-500/20"
        />
        <StatCard 
          icon={<AlertTriangle className="text-orange-400" />} 
          label="Stock Bajo" 
          value={stats?.lowStock || 0} 
          color="border-orange-500/20"
          highlight={stats?.lowStock > 0}
        />
        <StatCard 
          icon={<Zap className="text-yellow-400" />} 
          label="Equipos de Frío" 
          value={stats?.appliancesCount || 0} 
          color="border-yellow-500/20"
        />
        <StatCard 
          icon={<Activity className="text-emerald-400" />} 
          label="Ventas del Día" 
          value={`C$ ${(stats?.salesByHour || []).reduce((a, b) => a + (b || 0), 0).toLocaleString()}`} 
          color="border-emerald-500/20"
        />
      </div>

      {/* Gráficas Principales con estilo Glassmorphism */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Ventas por Hora */}
        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all duration-700"></div>
          <div className="flex justify-between items-center mb-6 relative">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="text-blue-400" size={20} />
              Ventas por Hora
            </h2>
            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] uppercase tracking-widest rounded-full font-black animate-pulse">En Vivo</span>
          </div>
          <div className="h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(stats?.salesByHour || []).map((v, i) => ({ hora: `${i}:00`, ventas: v || 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="hora" stroke="#475569" fontSize={10} interval={2} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(59, 130, 246, 0.1)'}}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
                />
                <Bar dataKey="ventas" fill="url(#colorVentas)" radius={[6, 6, 0, 0]} barSize={24}>
                   <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categorías con diseño radial */}
        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition-all duration-700"></div>
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 relative">
            <ShoppingBag className="text-emerald-400" size={20} />
            Movimiento por Categoría
          </h2>
          <div className="h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.salesByCategory || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={105}
                  paddingAngle={10}
                  dataKey="value"
                  stroke="none"
                >
                  {(stats?.salesByCategory || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px' }}
                />
                <Legend 
                  layout="vertical" align="right" verticalAlign="middle" 
                  iconType="circle"
                  formatter={(value) => <span className="text-slate-400 text-xs font-medium">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
               <p className="text-[10px] text-slate-500 uppercase font-black">Top</p>
               <p className="text-xl font-black text-white leading-none">Ventas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color, highlight }) => (
  <div className={`bg-slate-900/80 backdrop-blur-md p-6 rounded-[1.5rem] border ${color} shadow-lg transition-all hover:scale-[1.03] hover:shadow-emerald-500/5 group cursor-default`}>
    <div className="flex items-center gap-5">
      <div className={`p-4 bg-slate-800 rounded-2xl group-hover:bg-slate-700 transition-colors ${highlight ? 'animate-pulse-slow shadow-lg shadow-orange-500/10' : ''}`}>{icon}</div>
      <div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-white mt-1 tracking-tight">{value}</p>
      </div>
    </div>
  </div>
);

export default Dashboard;