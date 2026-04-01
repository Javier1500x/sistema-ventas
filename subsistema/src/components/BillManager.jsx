import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt, Plus, Calendar, Camera, AlertCircle, 
  CheckCircle, Trash2, Eye, Download, Info, Clock,
  Filter, Zap, Droplets, Globe, X
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const fmtC = (n) => `C$ ${Number(n || 0).toLocaleString('es-NI')}`;

const BillManager = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewImage, setViewImage] = useState(null);
  const [newBill, setNewBill] = useState({
    type: 'Luz',
    amount: '',
    billing_month: new Date().toLocaleString('es-ES', { month: 'long' }),
    billing_year: new Date().getFullYear(),
    due_date: '',
    status: 'pending',
    image: '',
    notes: ''
  });

  const fetchBills = useCallback(async () => {
    try {
      const res = await axios.get('/api/dashboard/bills');
      setBills(res.data);
    } catch (err) {
      console.error('Error cargando facturas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewBill({ ...newBill, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/dashboard/bills', newBill);
      setShowModal(false);
      setNewBill({
        type: 'Luz', amount: '', 
        billing_month: new Date().toLocaleString('es-ES', { month: 'long' }),
        billing_year: new Date().getFullYear(),
        due_date: '', status: 'pending', image: '', notes: ''
      });
      fetchBills();
    } catch (err) {
      alert('Error al guardar la factura');
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'pending' ? 'paid' : 'pending';
      await axios.put(`/api/dashboard/bills/${id}/status`, { status: newStatus });
      fetchBills();
    } catch (err) {
      alert('Error al actualizar estado');
    }
  };

  const deleteBill = async (id) => {
    if (!window.confirm('¿Eliminar esta factura?')) return;
    try {
      await axios.delete(`/api/dashboard/bills/${id}`);
      fetchBills();
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  const isNearingDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = (due - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 3;
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Luz': return <Zap className="text-amber-400" size={20} />;
      case 'Agua': return <Droplets className="text-blue-400" size={20} />;
      case 'Internet': return <Globe className="text-purple-400" size={20} />;
      default: return <Receipt className="text-slate-400" size={20} />;
    }
  };

  const totalPending = bills.filter(b => b.status === 'pending').reduce((s, b) => s + b.amount, 0);

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-8 pb-20">
      {/* Header section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter">
            Control de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">FACTURAS</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-[10px] font-black">Gastos Operativos & Vencimientos</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-[#0a0a0a] border border-emerald-500/20 px-6 py-3 rounded-2xl">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">Total Pendiente</p>
            <p className="text-2xl font-black text-emerald-400">{fmtC(totalPending)}</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-black px-6 py-4 rounded-2xl font-black flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus size={20} /> NUEVA FACTURA
          </button>
        </div>
      </header>

      {/* Bills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {bills.map((bill) => {
            const nearing = bill.status === 'pending' && isNearingDue(bill.due_date);
            return (
              <motion.div
                key={bill.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`bg-[#0a0a0a] border ${nearing ? 'border-rose-500/50 bg-rose-500/5 shadow-rose-500/10' : 'border-slate-800/50'} rounded-[2.5rem] p-8 relative overflow-hidden transition-all hover:border-emerald-500/30 shadow-xl`}
              >
                {nearing && (
                  <div className="absolute top-0 left-0 w-full bg-rose-500 text-[10px] font-black text-center py-1 animate-pulse uppercase">
                    ¡Vence Pronto!
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                    {getIcon(bill.type)}
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-white">{fmtC(bill.amount)}</p>
                    <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest">{bill.billing_month} {bill.billing_year}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-bold">Vencimiento:</span>
                    <span className={`font-black ${nearing ? 'text-rose-400' : 'text-slate-300'}`}>
                      {new Date(bill.due_date).toLocaleDateString('es-NI', { day: 'numeric', month: 'long' })}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleStatus(bill.id, bill.status)}
                      className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${
                        bill.status === 'paid' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 underline' 
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {bill.status === 'paid' ? 'PAGADA' : 'MARCAR PAGO'}
                    </button>
                    {bill.image && (
                      <button 
                        onClick={() => setViewImage(bill.image)}
                        className="p-3 bg-slate-900 text-slate-400 border border-slate-800 rounded-xl hover:text-white"
                      >
                        <Eye size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => deleteBill(bill.id)}
                      className="p-3 bg-slate-900 text-rose-500 border border-slate-800 rounded-xl hover:bg-rose-500/10"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  {bill.notes && <p className="text-[10px] text-slate-600 line-clamp-1 italic">"{bill.notes}"</p>}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {bills.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-600">
          <Receipt size={64} className="opacity-20 mb-4" />
          <p className="text-xl font-black uppercase italic">Sin facturas registradas</p>
        </div>
      )}

      {/* Modal: New Bill Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="relative bg-[#050505] border border-slate-800 rounded-[3rem] w-full max-w-lg p-10 shadow-2xl"
          >
            <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white"><X /></button>
            <h2 className="text-3xl font-black text-white mb-8">Registrar Factura</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Tipo</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 focus:ring-2 ring-emerald-500/50"
                    value={newBill.type} onChange={e => setNewBill({ ...newBill, type: e.target.value })}
                  >
                    <option>Luz</option><option>Agua</option><option>Internet</option><option>Otros</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Monto (C$)</label>
                  <input
                    type="number" required
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl p-4"
                    value={newBill.amount} onChange={e => setNewBill({ ...newBill, amount: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Mes</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl p-4"
                    value={newBill.billing_month} onChange={e => setNewBill({ ...newBill, billing_month: e.target.value })}
                  >
                    {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Vencimiento</label>
                  <input
                    type="date" required
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 color-scheme-dark"
                    value={newBill.due_date} onChange={e => setNewBill({ ...newBill, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Foto del Recibo (Optional)</label>
                <div className="relative group">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="billPhoto" />
                  <label 
                    htmlFor="billPhoto"
                    className="w-full bg-slate-900 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all"
                  >
                    {newBill.image ? (
                      <img src={newBill.image} alt="Preview" className="h-20 rounded-lg" />
                    ) : (
                      <>
                        <Camera className="text-slate-600 mb-2" size={32} />
                        <span className="text-xs text-slate-500 font-bold">Click para capturar o subir</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <textarea
                placeholder="Notas adicionales..."
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 h-24"
                value={newBill.notes} onChange={e => setNewBill({ ...newBill, notes: e.target.value })}
              />

              <button className="w-full bg-emerald-500 text-black py-5 rounded-2xl font-black text-lg hover:bg-emerald-600 transition-all">
                GUARDAR FACTURA
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal: View Image */}
      {viewImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95">
          <button onClick={() => setViewImage(null)} className="absolute top-10 right-10 text-white"><X size={32} /></button>
          <img src={viewImage} alt="Factura Full" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
};

export default BillManager;
