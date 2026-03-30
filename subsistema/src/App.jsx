import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import ComboCreator from './components/ComboCreator';
import EfficiencyCalculator from './components/EfficiencyCalculator';
import Fraccionamiento from './components/Fraccionamiento';
import { LayoutDashboard, Package, Zap, Menu, X, Scissors, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, color: 'blue' },
    { id: 'combos', label: 'Combos', icon: <ShoppingBag size={20} />, color: 'purple' },
    { id: 'fraccionamiento', label: 'Fraccionar', icon: <Scissors size={20} />, color: 'pink' },
    { id: 'efficiency', label: 'Energía', icon: <Zap size={20} />, color: 'orange' },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Sidebar - Desktop */}
      <nav className="hidden md:flex flex-col bg-[#0a0a0a] border-r border-slate-800/50 w-72 p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-12 px-2">
           <div className="bg-gradient-to-br from-blue-600 to-emerald-500 p-2.5 rounded-2xl shadow-lg shadow-blue-500/20">
              <LayoutDashboard className="text-white" size={24} />
           </div>
           <span className="text-2xl font-black tracking-tighter text-white">PULPE-X</span>
        </div>

        <div className="space-y-2 flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-black mb-4 px-4">Gestión Inteligente</p>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
                activeTab === tab.id 
                ? 'bg-slate-800/50 text-white border border-slate-700/50 shadow-xl' 
                : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              <span className={`transition-transform duration-300 group-hover:scale-110 ${activeTab === tab.id ? 'text-blue-400' : ''}`}>
                {tab.icon}
              </span>
              <span className="font-bold text-sm tracking-tight">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div layoutId="activeTab" className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
              )}
            </button>
          ))}
        </div>
        
        <div className="mt-auto pt-6 border-t border-slate-800/50">
           <div className="bg-gradient-to-br from-slate-900 to-slate-800/50 p-5 rounded-[2rem] border border-slate-700/30">
              <div className="flex items-center gap-3 mb-3">
                 <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
                 <span className="text-xs font-black text-slate-300 tracking-wide uppercase">Sincronizado</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Conectado a la base de datos central en tiempo real.</p>
           </div>
        </div>
      </nav>

      {/* Header - Mobile */}
      <div className="md:hidden flex justify-between items-center p-5 bg-[#0a0a0a] border-b border-slate-800/50 sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
        <div className="flex items-center gap-3">
           <div className="bg-blue-600 p-2 rounded-xl">
              <LayoutDashboard className="text-white" size={20} />
           </div>
           <span className="text-xl font-black tracking-tighter text-white">PULPE-X</span>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-400 hover:text-white">
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Menu - Mobile */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-x-0 top-[73px] bg-[#0a0a0a] border-b border-slate-800/50 p-6 z-40 space-y-4 shadow-2xl"
          >
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setIsMenuOpen(false); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-colors ${
                  activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-400 bg-slate-900/50'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden p-4 md:p-10 lg:p-14">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="max-w-7xl mx-auto"
        >
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'combos' && <ComboCreator />}
          {activeTab === 'efficiency' && <EfficiencyCalculator />}
          {activeTab === 'fraccionamiento' && <Fraccionamiento />}
        </motion.div>
      </main>
    </div>
  );
}

export default App;