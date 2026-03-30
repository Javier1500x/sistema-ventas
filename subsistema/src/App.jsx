import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import ComboCreator from './components/ComboCreator';
import EfficiencyCalculator from './components/EfficiencyCalculator';
import { LayoutDashboard, Package, Zap, Menu, X } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'combos', label: 'Combos', icon: <Package size={20} /> },
    { id: 'efficiency', label: 'Energía', icon: <Zap size={20} /> },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-white font-sans">
      {/* Sidebar / Mobile Header */}
      <nav className="bg-slate-900 border-r border-slate-800 w-full md:w-64 flex-shrink-0">
        <div className="p-6 flex justify-between items-center md:block">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-2 rounded-lg">
                <LayoutDashboard className="text-white" size={24} />
             </div>
             <span className="text-xl font-black tracking-tighter">PULPE-X</span>
          </div>
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        <div className={`${isMenuOpen ? 'block' : 'hidden'} md:block px-4 pb-6`}>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4 px-2">Menú Principal</p>
          <div className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setIsMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                  activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="mt-12 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
             <p className="text-xs text-slate-400">Estado del Sistema</p>
             <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-emerald-500">Conectado a Central</span>
             </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'combos' && <ComboCreator />}
        {activeTab === 'efficiency' && <EfficiencyCalculator />}
      </main>
    </div>
  );
}

export default App;