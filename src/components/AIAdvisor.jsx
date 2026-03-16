import React, { useState, useEffect } from 'react';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  BrainCircuit, 
  ShoppingCart, 
  Server, 
  RefreshCw,
  ArrowRight,
  Settings,
  X,
  CheckCircle2,
  DollarSign,
  BarChart3
} from 'lucide-react';

export default function AIAdvisor({products}) {
  // Estados de la aplicación
  const [inventory, setInventory] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  
    useEffect(() => {
        if (products) {
            setInventory(products);
        }
    }, [products]);

  // Función principal para llamar a Gemini
  const analyzeInventoryWithGemini = async () => {
    if (inventory.length === 0) return;
    
    setAnalyzing(true);
    setAiAnalysis(null);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/gemini-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory: inventory }),
      });

      if (!response.ok) {
        throw new Error('Error al obtener el análisis de la IA');
      }

      const result = await response.json();
      setAiAnalysis(result);

    } catch (err) {
      console.error("Error AI:", err);
      alert("Hubo un error al consultar con Gemini. Intenta de nuevo.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100">
      
      {/* --- HEADER --- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Package size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Inventory<span className="text-indigo-600">Mind</span> AI</h1>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ACTION BAR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Vista General</h2>
            <p className="text-slate-500 text-sm">Gestiona tus productos y recibe consejos estratégicos.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={analyzeInventoryWithGemini}
              disabled={analyzing}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium shadow-lg shadow-indigo-200 transition-all text-sm
                ${analyzing ? 'bg-indigo-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 hover:scale-[1.02]'}
              `}
            >
              {analyzing ? (
                <>
                  <Server size={18} className="animate-pulse" />
                  Analizando con Gemini...
                </>
              ) : (
                <>
                  <BrainCircuit size={18} />
                  Consultar IA
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- LEFT COLUMN: INVENTORY TABLE --- */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-semibold text-slate-800">Inventario Actual</h3>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{inventory.length} productos</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3 font-medium">Producto</th>
                      <th className="px-6 py-3 font-medium">Categoría</th>
                      <th className="px-6 py-3 font-medium text-right">Stock</th>
                      <th className="px-6 py-3 font-medium text-right">Precio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                        <td className="px-6 py-4 text-slate-500">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs border border-slate-200">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`${item.stock < 5 ? 'text-red-600 font-bold' : item.stock > 100 ? 'text-amber-600' : 'text-slate-700'}`}>
                            {item.stock}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-600">${item.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {inventory.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                  <Package size={48} className="mx-auto mb-3 opacity-20" />
                  <p>No hay datos de inventario.</p>
                </div>
              )}
            </div>
          </div>

          {/* --- RIGHT COLUMN: AI ANALYSIS --- */}
          <div className="lg:col-span-1">
            {!aiAnalysis ? (
              <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border-2 border-dashed border-indigo-100 p-8 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-indigo-50 flex items-center justify-center mb-4">
                  <BrainCircuit className="text-indigo-500" size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">IA en Espera</h3>
                <p className="text-slate-500 text-sm max-w-[240px]">
                  Presiona "Consultar IA" para que Gemini analice tus datos y encuentre oportunidades de negocio ocultas.
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* 1. Resumen */}
                <div className="bg-indigo-900 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3 text-indigo-200">
                      <BrainCircuit size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Análisis General</span>
                    </div>
                    <p className="text-sm font-light leading-relaxed opacity-90">
                      "{aiAnalysis.resumen_general}"
                    </p>
                  </div>
                </div>

                {/* 2. Acciones Críticas */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" /> Acciones Sugeridas
                  </h4>
                  <div className="space-y-3">
                    {aiAnalysis.acciones_criticas.map((accion, idx) => (
                      <div key={idx} className={`flex gap-3 p-3 rounded-lg text-sm border-l-4 ${accion.tipo === 'comprar' ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
                        <div className={`mt-0.5 ${accion.tipo === 'comprar' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {accion.tipo === 'comprar' ? <ShoppingCart size={16} /> : <X size={16} />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            {accion.tipo === 'comprar' ? 'Reponer: ' : 'Detener Compra: '} 
                            {accion.producto}
                          </p>
                          <p className="text-slate-500 text-xs mt-1">{accion.razon}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Nuevas Oportunidades (Cosas que nunca se han comprado) */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-indigo-500" /> Nuevas Oportunidades
                  </h4>
                  <ul className="space-y-4">
                    {aiAnalysis.nuevas_oportunidades.map((op, idx) => (
                      <li key={idx} className="group cursor-default">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-indigo-700 group-hover:text-indigo-600 transition-colors">
                            {op.producto}
                          </span>
                          <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-all group-hover:translate-x-1" />
                        </div>
                        <p className="text-xs text-slate-500 leading-snug bg-slate-50 p-2 rounded border border-slate-100">
                          {op.razon}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 4. Estrategia Loca */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={16} className="text-orange-500" />
                    <h4 className="text-sm font-bold text-orange-800">Idea de Marketing</h4>
                  </div>
                  <p className="text-xs text-orange-800/80 italic">
                    {aiAnalysis.estrategia_marketing}
                  </p>
                </div>

              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}