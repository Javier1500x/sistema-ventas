import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ComboCreator from './components/ComboCreator';
import EfficiencyCalculator from './components/EfficiencyCalculator';
import Fraccionamiento from './components/Fraccionamiento';
import StockPredictor from './components/StockPredictor';
import LiveOrders from './components/LiveOrders';
import ProfitAnalysis from './components/ProfitAnalysis';
import CustomerInsights from './components/CustomerInsights';
import BillManager from './components/BillManager';
import {
  LayoutDashboard, Scissors, Zap, Menu, X, ShoppingBag,
  TrendingUp, ShoppingCart, BarChart3, Package, Users, Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [upcomingBillsCount, setUpcomingBillsCount] = useState(0);

  // Poll pending orders count for badge
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [resOrders, resBills] = await Promise.all([
          axios.get('/api/dashboard/orders'),
          axios.get('/api/dashboard/bills')
        ]);
        
        // Orders
        const pending = (resOrders.data || []).filter(o => o.status === 'pending').length;
        setPendingOrdersCount(pending);

        // Bills (Due within 3 days)
        const today = new Date();
        const upcoming = (resBills.data || []).filter(b => {
          if (b.status === 'paid') return false;
          const due = new Date(b.due_date);
          const diff = (due - today) / (1000 * 60 * 60 * 24);
          return diff >= -0.5 && diff <= 3;
        }).length;
        setUpcomingBillsCount(upcoming);
      } catch (_) {}
    };
    fetchStats();
    const iv = setInterval(fetchStats, 20000);
    return () => clearInterval(iv);
  }, []);

  const tabs = [
    {
      id: 'dashboard',
      label: 'Analytics 360°',
      icon: <LayoutDashboard size={18} />,
      color: 'blue',
      desc: 'Métricas avanzadas'
    },
    {
      id: 'orders',
      label: 'Pedidos en Vivo',
      icon: <ShoppingCart size={18} />,
      color: 'emerald',
      desc: 'Catálogo digital',
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : null
    },
    {
      id: 'stock',
      label: 'Predictor Stock',
      icon: <Package size={18} />,
      color: 'amber',
      desc: 'Días restantes'
    },
    {
      id: 'profit',
      label: 'Rentabilidad',
      icon: <TrendingUp size={18} />,
      color: 'teal',
      desc: 'Márgenes y ganancias'
    },
    {
      id: 'loyalty',
      label: 'Fidelidad',
      icon: <Users size={18} />,
      color: 'rose',
      desc: 'Análisis de clientes'
    },
    {
      id: 'combos',
      label: 'Combos',
      icon: <ShoppingBag size={18} />,
      color: 'purple',
      desc: 'Creador de paquetes'
    },
    {
      id: 'fraccionamiento',
      label: 'Fraccionar',
      icon: <Scissors size={18} />,
      color: 'pink',
      desc: 'Saco → unidades'
    },
    {
      id: 'bills',
      label: 'Facturas',
      icon: <Receipt size={18} />,
      color: 'emerald-dark',
      desc: 'Servicios básicos',
      badge: upcomingBillsCount > 0 ? upcomingBillsCount : null
    },
    {
      id: 'efficiency',
      label: 'Energía',
      icon: <Zap size={18} />,
      color: 'orange',
      desc: 'Gasto eléctrico'
    },
  ];

  const COLOR_MAP = {
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    teal: 'text-teal-400',
    purple: 'text-purple-400',
    pink: 'text-pink-400',
    orange: 'text-orange-400',
    rose: 'text-rose-400',
    'emerald-dark': 'text-emerald-500',
  };

  const BADGE_MAP = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    teal: 'bg-teal-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    orange: 'bg-orange-500',
    rose: 'bg-rose-500',
    'emerald-dark': 'bg-rose-600 animate-pulse',
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-blue-500/30">

      {/* Sidebar — Desktop */}
      <nav className="hidden md:flex flex-col bg-[#080808] border-r border-slate-800/40 w-64 p-5 sticky top-0 h-screen overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-emerald-500 p-2.5 rounded-2xl shadow-lg shadow-blue-500/20 shrink-0">
            <BarChart3 className="text-white" size={20} />
          </div>
          <div>
            <span className="text-lg font-black tracking-tighter text-white block leading-none">PULPE-X</span>
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Panel Estratégico</span>
          </div>
        </div>

        {/* Nav Items */}
        <div className="space-y-1 flex-1">
          <p className="text-[9px] uppercase tracking-[0.2em] text-slate-600 font-black mb-3 px-3">Módulos</p>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-slate-800/80 text-white shadow-lg'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                }`}
              >
                <span className={`transition-all duration-200 ${isActive ? COLOR_MAP[tab.color] : 'group-hover:scale-110'}`}>
                  {tab.icon}
                </span>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-bold leading-none truncate">{tab.label}</p>
                  <p className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-slate-400' : 'text-slate-600'}`}>{tab.desc}</p>
                </div>
                {tab.badge && (
                  <span className={`${BADGE_MAP[tab.color]} text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shrink-0 animate-pulse`}>
                    {tab.badge}
                  </span>
                )}
                {isActive && (
                  <motion.div layoutId="activeSidebarTab" className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 ${BADGE_MAP[tab.color]} rounded-r-full`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Status Footer */}
        <div className="mt-6 pt-5 border-t border-slate-800/50">
          <div className="bg-slate-900/50 p-4 rounded-[1.5rem] border border-slate-800/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">Conectado</span>
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Sincronizado con la base de datos central en tiempo real.
            </p>
          </div>
        </div>
      </nav>

      {/* Header Mobile */}
      <div className="md:hidden flex justify-between items-center p-4 bg-[#080808] border-b border-slate-800/40 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-xl">
            <BarChart3 className="text-white" size={18} />
          </div>
          <div>
            <span className="text-base font-black tracking-tighter text-white">PULPE-X</span>
            <span className="text-[9px] text-slate-500 font-bold ml-2">{tabs.find(t => t.id === activeTab)?.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingOrdersCount > 0 && (
            <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
              {pendingOrdersCount} pedido{pendingOrdersCount !== 1 ? 's' : ''}
            </span>
          )}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-400 hover:text-white">
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden fixed inset-x-0 top-[57px] bg-[#080808] border-b border-slate-800/40 p-4 z-40 shadow-2xl max-h-[80vh] overflow-y-auto"
          >
            <div className="grid grid-cols-2 gap-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setIsMenuOpen(false); }}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl font-bold text-sm transition-all relative ${
                    activeTab === tab.id
                      ? `bg-slate-800 text-white border border-slate-700`
                      : 'text-slate-500 bg-slate-900/50 border border-slate-800/50'
                  }`}
                >
                  <span className={activeTab === tab.id ? COLOR_MAP[tab.color] : ''}>{tab.icon}</span>
                  <div className="text-left">
                    <p className="text-xs font-black leading-none">{tab.label}</p>
                    <p className="text-[9px] text-slate-600 mt-0.5">{tab.desc}</p>
                  </div>
                  {tab.badge && (
                    <span className={`absolute top-2 right-2 ${BADGE_MAP[tab.color]} text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden p-4 md:p-8 lg:p-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="max-w-7xl mx-auto"
          >
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'orders' && <LiveOrders />}
            {activeTab === 'stock' && <StockPredictor />}
            {activeTab === 'profit' && <ProfitAnalysis />}
            {activeTab === 'loyalty' && <CustomerInsights />}
            {activeTab === 'bills' && <BillManager />}
            {activeTab === 'combos' && <ComboCreator />}
            {activeTab === 'fraccionamiento' && <Fraccionamiento />}
            {activeTab === 'efficiency' && <EfficiencyCalculator />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;