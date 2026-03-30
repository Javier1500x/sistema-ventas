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
          value={`C$ ${stats?.salesByHour.reduce((a, b) => a + b, 0).toLocaleString()}`} 
          color="border-emerald-500/20"
        />
      </div>

      {/* Gráficas Principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Ventas por Hora */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="text-blue-400" size={20} />
              Ventas por Hora
            </h2>
            <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-full font-bold">En Vivo</span>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.salesByHour.map((v, i) => ({ hora: `${i}:00`, ventas: v }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="hora" stroke="#94a3b8" fontSize={10} interval={2} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <Bar dataKey="ventas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categorías más Vendidas */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <ShoppingBag className="text-emerald-400" size={20} />
            Ventas por Categoría
          </h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.salesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {stats?.salesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color, highlight }) => (
  <div className={`bg-slate-900 p-5 rounded-2xl border ${color} shadow-lg transition-all hover:translate-y-[-4px] cursor-default`}>
    <div className="flex items-center gap-4">
      <div className={`p-3 bg-slate-800 rounded-xl ${highlight ? 'animate-pulse' : ''}`}>{icon}</div>
      <div>
        <p className="text-slate-400 text-sm font-medium">{label}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
      </div>
    </div>
  </div>
);

export default Dashboard;