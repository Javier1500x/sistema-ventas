import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Award, TrendingUp, Calendar, ShoppingBag,
  Star, Crown, Heart, RefreshCw, Search, ChevronRight, User
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const fmtC = (n) => `C$ ${Number(n || 0).toLocaleString('es-NI', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const CustomerInsights = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await axios.get('/api/dashboard/analytics');
      setData(res.data.topCustomers || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error cargando insights de clientes:', err);
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = data.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSpentAll = data.reduce((s, c) => s + c.total, 0);
  const avgSpent = data.length > 0 ? totalSpentAll / data.length : 0;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-rose-500/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-t-rose-500 rounded-full animate-spin" />
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
            Fidelidad <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-500">CLIENTES</span>
          </motion.h1>
          <p className="text-slate-500 font-medium mt-1">
            Análisis de compradores recurrentes y lealtad
            {lastUpdated && <span className="ml-2 text-slate-600 text-xs">· Act. {lastUpdated.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)} disabled={refreshing}
          className="flex items-center gap-2 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white px-4 py-2.5 rounded-2xl text-sm font-bold transition-all hover:border-rose-500/50"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-[#0a0a0a] border border-rose-500/20 rounded-[2.5rem] p-7 shadow-xl">
          <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-4">
            <Users className="text-rose-400" size={24} />
          </div>
          <p className="text-4xl font-black text-white">{data.length}</p>
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-1">Clientes Identificados</p>
        </div>
        <div className="bg-[#0a0a0a] border border-orange-500/20 rounded-[2.5rem] p-7 shadow-xl">
          <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-4">
            <TrendingUp className="text-orange-400" size={24} />
          </div>
          <p className="text-4xl font-black text-white">{fmtC(avgSpent)}</p>
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-1">Valor Promedio/Cliente</p>
        </div>
        <div className="bg-[#0a0a0a] border border-emerald-500/20 rounded-[2.5rem] p-7 shadow-xl">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
            <Crown className="text-emerald-400" size={24} />
          </div>
          <p className="text-4xl font-black text-white">{data[0]?.name.split(' ')[0] || '—'}</p>
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-1">Cliente N° 1 (Top)</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input
          type="text"
          placeholder="Buscar cliente por nombre..."
          className="w-full bg-[#0a0a0a] border border-slate-800 rounded-[2rem] py-5 px-14 text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-lg font-medium transition-all"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Customers List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((c, i) => {
          const isTop = i < 3;
          const percentage = ((c.total / data[0].total) * 100).toFixed(0);
          
          return (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`group bg-[#0a0a0a] border ${isTop ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-800/50'} rounded-[2.5rem] overflow-hidden hover:border-rose-500/50 transition-all shadow-xl`}
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black ${isTop ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'}`}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    {isTop && (
                      <div className="absolute -top-3 -right-3 bg-[#050505] p-1.5 rounded-full border border-amber-500">
                        <Award size={16} className="text-amber-500" />
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-white">{fmtC(c.total)}</p>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Total Comprado</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-black text-white group-hover:text-rose-400 transition-colors uppercase tracking-tight truncate">{c.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
                        <ShoppingBag size={12} />
                        {c.orders} pedidos realizados
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/50">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Puntaje de Lealtad</span>
                      <span className="text-xs font-black text-rose-400">{percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className={`h-full rounded-full ${isTop ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-rose-500 to-rose-400'}`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-2">
                    <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                      <Calendar size={12} />
                      Última visita: {new Date(c.lastVisit).toLocaleDateString()}
                    </div>
                    {c.total > avgSpent * 1.5 && (
                      <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md font-black uppercase tracking-tighter">VIP POTENCIAL</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <User size={48} className="text-slate-700" />
          <p className="text-slate-500 font-black text-xl italic uppercase">Sin clientes encontrados</p>
        </div>
      )}
    </div>
  );
};

export default CustomerInsights;
