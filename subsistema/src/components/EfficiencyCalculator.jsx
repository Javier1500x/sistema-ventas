import React, { useState, useEffect } from 'react';
import { Zap, Plus, Trash2, Save, Info, Calculator, DollarSign } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const EfficiencyCalculator = () => {
  const [appliances, setAppliances] = useState([]);
  const [newAppliance, setNewAppliance] = useState({ name: '', watts: '', hours_per_day: 24, kwh_cost: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppliances();
  }, []);

  const fetchAppliances = async () => {
    try {
      const response = await axios.get(`${API_URL}/appliances`);
      setAppliances(response.data);
      if (response.data.length > 0) {
        setNewAppliance(prev => ({ ...prev, kwh_cost: response.data[0].kwh_cost }));
      }
    } catch (error) {
      console.error('Error al cargar equipos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/appliances`, newAppliance);
      setNewAppliance({ ...newAppliance, name: '', watts: '' });
      fetchAppliances();
    } catch (error) {
      alert('Error al guardar equipo');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este equipo?')) {
      try {
        await axios.delete(`${API_URL}/appliances/${id}`);
        fetchAppliances();
      } catch (error) {
        alert('Error al eliminar');
      }
    }
  };

  const calculateMonthlyCost = (watts, hours, cost) => {
    return ((watts * hours * 30) / 1000) * cost;
  };

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
          EFICIENCIA ENERGÉTICA
        </h1>
        <p className="text-slate-400 mt-2">Controla el gasto de luz de tus refrigeradoras</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario de Registro */}
        <div className="lg:col-span-1 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Plus className="text-orange-400" size={20} />
            Registrar Equipo
          </h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Nombre del Equipo (ej. Refri Coca)</label>
              <input 
                type="text" required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={newAppliance.name}
                onChange={e => setNewAppliance({...newAppliance, name: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Watts (W)</label>
                <input 
                  type="number" required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={newAppliance.watts}
                  onChange={e => setNewAppliance({...newAppliance, watts: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Costo kWh (C$)</label>
                <input 
                  type="number" step="0.01" required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={newAppliance.kwh_cost}
                  onChange={e => setNewAppliance({...newAppliance, kwh_cost: e.target.value})}
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Save size={18} /> Guardar Equipo
            </button>
          </form>
          <div className="mt-6 p-4 bg-orange-500/10 rounded-xl border border-orange-500/20 text-sm text-orange-200">
            <p className="flex items-start gap-2">
              <Info size={24} className="shrink-0" />
              Tip: Los Watts suelen estar en una etiqueta plateada en la parte trasera de tu refrigeradora.
            </p>
          </div>
        </div>

        {/* Lista de Equipos y Costos */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Zap className="text-yellow-400" size={20} />
              Inventario de Equipos
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-sm border-b border-slate-800">
                    <th className="pb-3 px-2">Equipo</th>
                    <th className="pb-3 px-2 text-center">Consumo (W)</th>
                    <th className="pb-3 px-2 text-center">Gasto Mensual</th>
                    <th className="pb-3 px-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {appliances.map(app => {
                    const cost = calculateMonthlyCost(app.watts, app.hours_per_day, app.kwh_cost);
                    return (
                      <tr key={app.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-2 font-medium">{app.name}</td>
                        <td className="py-4 px-2 text-center text-slate-300">{app.watts} W</td>
                        <td className="py-4 px-2 text-center">
                          <span className="text-emerald-400 font-bold">C$ {cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <button 
                            onClick={() => handleDelete(app.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors p-2"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {appliances.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-slate-500">No hay equipos registrados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen de Impacto */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Calculator className="text-blue-400" />
              Impacto Total en el Negocio
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-700">
                <p className="text-sm text-slate-400">Gasto Mensual Total en Luz</p>
                <p className="text-3xl font-black text-white mt-1">
                  C$ {appliances.reduce((sum, app) => sum + calculateMonthlyCost(app.watts, app.hours_per_day, app.kwh_cost), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-700">
                <p className="text-sm text-slate-400">Venta mínima necesaria para pagar la luz</p>
                <p className="text-3xl font-black text-blue-400 mt-1">
                  C$ {(appliances.reduce((sum, app) => sum + calculateMonthlyCost(app.watts, app.hours_per_day, app.kwh_cost), 0) / 0.2).toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-500 mt-2">*Basado en un margen de ganancia del 20%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EfficiencyCalculator;