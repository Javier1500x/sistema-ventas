import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Receipt, Plus, Calendar, Camera, AlertCircle, 
  CheckCircle, Trash2, Eye, Download, Info, Clock,
  Filter, Zap, Droplets, Globe, X, RefreshCw, FlipHorizontal
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

const fmtC = (n) => `C$ ${Number(n || 0).toLocaleString('es-NI')}`;

// Componente de Cámara Interno
const CameraCapture = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        setError('No se pudo acceder a la cámara. Asegúrate de dar permisos.');
      }
    };
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const takePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // 0.7 quality to reduce size
      onCapture(dataUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-4">
      <div className="relative w-full max-w-lg aspect-[3/4] bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-800">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-10 text-center">
            <AlertCircle className="text-rose-500 mb-4" size={48} />
            <p className="text-white font-bold">{error}</p>
            <button onClick={onClose} className="mt-6 px-8 py-3 bg-slate-800 text-white rounded-2xl font-bold">Cerrar</button>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Control Bar */}
            <div className="absolute inset-0 flex flex-col justify-between p-8 pointer-events-none">
                <div className="flex justify-end pointer-events-auto">
                    <button onClick={onClose} className="p-4 bg-black/40 text-white rounded-full backdrop-blur-md border border-white/10 hover:bg-rose-500 transition-colors"><X /></button>
                </div>
                
                <div className="flex justify-center items-center gap-10 pointer-events-auto pb-4">
                  <div className="w-12 h-12" /> {/* Layout balancer */}
                  <button 
                    onClick={takePhoto} 
                    className="w-24 h-24 bg-white rounded-full border-8 border-white/20 flex items-center justify-center active:scale-90 transition-all hover:scale-105 shadow-2xl"
                  >
                    <div className="w-16 h-16 bg-white rounded-full border-4 border-slate-900" />
                  </button>
                  <div className="w-12 h-12" /> 
                </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const BillManager = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
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

  useEffect(() => {
    fetchBills();

    // Socket.io for Real-time Refresh
    const socket = io();
    socket.on('dashboardUpdate', (data) => {
      if (['bill_created', 'bill_status_updated', 'bill_deleted'].includes(data.type)) {
        fetchBills();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchBills]);

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
    if (!newBill.amount || !newBill.due_date) return alert('Monto y Fecha son obligatorios');
    
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
      console.error('Error al guardar factura:', err);
      alert('Error: ' + (err.response?.data?.error || 'No se pudo guardar la factura. Verifique el tamaño de la imagen.'));
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

  const deleteBillItem = async (id) => {
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

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-black">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-32 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header section */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pt-4">
        <div className="space-y-2">
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter">
            GESTIÓN DE <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">FACTURAS</span>
          </h1>
          <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] ml-1">Business Intelligence & Gastos</p>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div className="bg-[#0a0a0a] border border-emerald-500/20 px-8 py-5 rounded-[2rem] shadow-2xl backdrop-blur-md">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Pendiente</p>
            <p className="text-3xl font-black text-emerald-400">{fmtC(totalPending)}</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="group bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-6 rounded-[2rem] font-black flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20"
          >
            <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" /> 
            REGISTRAR PAGO
          </button>
        </div>
      </header>

      {/* Bills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {bills.map((bill) => {
            const nearing = bill.status === 'pending' && isNearingDue(bill.due_date);
            return (
              <motion.div
                key={bill.id}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                className={`group bg-[#0a0a0a] border-2 ${nearing ? 'border-rose-500/50 bg-rose-500/[0.03] shadow-rose-500/10' : 'border-slate-800 hover:border-emerald-500/30'} rounded-[3rem] p-10 relative overflow-hidden transition-all duration-500 shadow-2xl hover:-translate-y-2`}
              >
                {nearing && (
                  <div className="absolute top-0 left-0 w-full bg-rose-500 text-[10px] font-black text-center py-2 animate-pulse uppercase tracking-widest z-10">
                    ⚠️ Pago Próximo (3 días o menos) ⚠️
                  </div>
                )}
                
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl group-hover:scale-110 transition-transform duration-500">
                    {getIcon(bill.type)}
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black text-white group-hover:text-emerald-400 transition-colors">{fmtC(bill.amount)}</p>
                    <p className="text-slate-500 text-[10px] uppercase font-black mt-1 tracking-widest">{bill.billing_month} {bill.billing_year}</p>
                  </div>
                </div>

                <div className="space-y-6 relative z-10">
                  <div className="flex items-center justify-between text-xs py-3 border-y border-slate-800/50">
                    <span className="text-slate-500 font-black uppercase tracking-widest">Vence:</span>
                    <span className={`font-black ${nearing ? 'text-rose-400' : 'text-slate-300'}`}>
                      {new Date(bill.due_date).toLocaleDateString('es-NI', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => toggleStatus(bill.id, bill.status)}
                      className={`flex-1 py-4 rounded-2xl text-xs font-black transition-all ${
                        bill.status === 'paid' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:border-white/20'
                      }`}
                    >
                      {bill.status === 'paid' ? 'CONSOLIDADO ✓' : 'MARCAR COMO PAGADA'}
                    </button>
                    {bill.image && (
                      <button 
                        onClick={() => setViewImage(bill.image)}
                        className="p-4 bg-slate-900 text-slate-400 border border-slate-800 rounded-2xl hover:text-white hover:bg-slate-800 transition-all shadow-lg"
                      >
                        <Eye size={20} />
                      </button>
                    )}
                    <button 
                      onClick={() => deleteBillItem(bill.id)}
                      className="p-4 bg-slate-900 text-rose-500 border border-slate-800 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-lg"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                  {bill.notes && (
                    <div className="pt-2">
                        <p className="text-[10px] text-slate-600 italic font-medium leading-relaxed">
                            <Info size={10} className="inline mr-1" /> "{bill.notes}"
                        </p>
                    </div>
                  )}
                </div>
                
                {/* Background decorative element */}
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl" />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {bills.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 text-slate-700">
          <div className="bg-slate-900/50 p-10 rounded-full mb-6 border border-slate-800/50">
            <Receipt size={80} className="opacity-10" />
          </div>
          <p className="text-2xl font-black uppercase italic tracking-tighter">Historial de facturas vacío</p>
          <p className="text-xs font-bold uppercase mt-2 tracking-widest text-slate-600">Comienza registrando tus gastos operativos</p>
        </motion.div>
      )}

      {/* Modal: New Bill Form */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl" 
                onClick={() => setShowModal(false)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 50 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="relative bg-[#050505] border border-slate-800 rounded-[3.5rem] w-full max-w-xl p-12 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-emerald-800" />
              <button 
                onClick={() => setShowModal(false)} 
                className="absolute top-10 right-10 text-slate-500 hover:text-white bg-slate-900/50 p-3 rounded-full transition-colors"
               >
                 <X size={24} />
               </button>
               
              <h2 className="text-4xl font-black text-white mb-10 tracking-tighter">REGISTRAR <span className="text-emerald-500">PAGO</span></h2>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-[0.2em]">Tipo de Servicio</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 focus:ring-2 ring-emerald-500/50 outline-none transition-all font-bold"
                      value={newBill.type} onChange={e => setNewBill({ ...newBill, type: e.target.value })}
                    >
                      <option>Luz</option><option>Agua</option><option>Internet</option><option>Alquiler</option><option>Otros</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-[0.2em]">Importe (C$)</label>
                    <input
                      type="number" required placeholder="0.00"
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 focus:ring-2 ring-emerald-500/50 outline-none transition-all font-bold text-xl"
                      value={newBill.amount} onChange={e => setNewBill({ ...newBill, amount: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-[0.2em]">Periodo (Mes)</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 focus:ring-2 ring-emerald-500/50 outline-none transition-all font-bold"
                      value={newBill.billing_month} onChange={e => setNewBill({ ...newBill, billing_month: e.target.value })}
                    >
                      {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-[0.2em]">Fecha Vencimiento</label>
                    <input
                      type="date" required
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 focus:ring-2 ring-emerald-500/50 outline-none transition-all font-bold color-scheme-dark"
                      value={newBill.due_date} onChange={e => setNewBill({ ...newBill, due_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-4 tracking-[0.2em]">Evidencia (Recibo)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                      type="button"
                      onClick={() => setShowCamera(true)}
                      className="flex flex-col items-center justify-center gap-3 bg-emerald-500/5 border-2 border-dashed border-emerald-500/20 hover:border-emerald-500 hover:bg-emerald-500/10 rounded-3xl p-6 transition-all group"
                    >
                      <Camera className="text-emerald-500 group-hover:scale-125 transition-transform" size={32} />
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Tomar Foto</span>
                    </button>

                    <div className="relative group">
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="billPhoto" title="Upload bill photo" />
                      <label 
                        htmlFor="billPhoto"
                        className="w-full h-full bg-slate-900 border-2 border-dashed border-slate-800 hover:border-slate-500 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all p-6 group"
                      >
                        {newBill.image ? (
                          <div className="relative w-full h-full">
                             <img src={newBill.image} alt="Preview" className="w-full h-24 object-cover rounded-xl border border-white/10" />
                             <button 
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setNewBill({...newBill, image: ''}); }} 
                                className="absolute -top-3 -right-3 bg-rose-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                                title="Remove image"
                             >
                                <X size={14}/>
                             </button>
                             <div className="mt-2 text-[8px] font-black text-emerald-400 uppercase tracking-tighter text-center">Imagen Cargada</div>
                          </div>
                        ) : (
                          <>
                            <Download className="text-slate-600 group-hover:text-white transition-colors" size={32} />
                            <span className="text-[10px] font-black text-slate-500 uppercase mt-2 tracking-widest">Subir Archivo</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                <textarea
                  placeholder="Observaciones adicionales o detalles del pago..."
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-[2rem] p-6 h-24 focus:ring-2 ring-emerald-500/50 outline-none transition-all text-sm"
                  value={newBill.notes} onChange={e => setNewBill({ ...newBill, notes: e.target.value })}
                />

                <button 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-black py-6 rounded-3xl font-black text-xl hover:shadow-[0_20px_40px_rgba(16,185,129,0.3)] hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50"
                >
                  {loading ? 'MODAL GRABANDO...' : 'CONFIRMAR Y GUARDAR'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: View Image */}
      <AnimatePresence>
        {viewImage && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/98 backdrop-blur-2xl"
          >
            <button 
                onClick={() => setViewImage(null)} 
                className="absolute top-10 right-10 text-white bg-slate-800/80 p-5 rounded-full hover:bg-rose-500 transition-all hover:rotate-90 duration-300 z-[210] shadow-2xl"
            >
                <X size={32} />
            </button>
            <motion.img 
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                src={viewImage} alt="Evidencia de Factura" 
                className="max-w-full max-h-screen object-contain rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/5" 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Capture Modal Layer */}
      <AnimatePresence>
          {showCamera && (
            <CameraCapture 
              onCapture={(data) => setNewBill({...newBill, image: data})}
              onClose={() => setShowCamera(false)}
            />
          )}
      </AnimatePresence>
    </div>
  );
};

export default BillManager;
