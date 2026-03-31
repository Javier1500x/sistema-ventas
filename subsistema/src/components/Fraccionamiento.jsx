import React, { useState, useEffect } from 'react';
import { Scissors, ArrowRight, Package, Info, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const Fraccionamiento = () => {
  const [products, setProducts] = useState([]);
  const [parentProduct, setParentProduct] = useState('');
  const [childProduct, setChildProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [toast, setToast] = useState(null);
  const [history, setHistory] = useState([]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get('/api/dashboard/products');
        setProducts(res.data);
      } catch (err) {
        console.error('Error fetching products');
      } finally {
        setFetching(false);
      }
    };
    fetchProducts();
  }, []);

  const handleConvert = async (e) => {
    e.preventDefault();
    if (!parentProduct || !childProduct || !quantity) return showToast('Completa todos los campos', 'error');
    if (parentProduct === childProduct) return showToast('El producto origen y destino deben ser distintos', 'error');

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return showToast('Ingresa una cantidad válida mayor a 0', 'error');

    setLoading(true);
    try {
      const res = await axios.post('/api/dashboard/convert', {
        parentId: parentProduct,
        childId: childProduct,
        quantityToConvert: qty
      });

      // Guardar en historial local
      const parent = products.find(p => p.id == parentProduct);
      const child = products.find(p => p.id == childProduct);
      setHistory(prev => [{
        id: Date.now(),
        parentName: parent?.name,
        childName: child?.name,
        qty,
        factor: child?.conversion_factor,
        result: qty * (child?.conversion_factor || 1),
        time: new Date().toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })
      }, ...prev.slice(0, 9)]);

      showToast(res.data.message || 'Conversión exitosa', 'success');
      setQuantity('');

      // Refrescar productos para ver stocks actualizados
      const updated = await axios.get('/api/dashboard/products');
      setProducts(updated.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Error en la conversión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedParent = products.find(p => p.id == parentProduct);
  const selectedChild = products.find(p => p.id == childProduct);
  const preview = quantity && selectedChild?.conversion_factor
    ? parseFloat(quantity) * selectedChild.conversion_factor
    : null;

  return (
    <div className="space-y-8 pb-16 relative">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-6 left-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-sm shadow-2xl border max-w-sm text-center ${
              toast.type === 'error'
                ? 'bg-rose-950 border-rose-500/50 text-rose-300'
                : 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle size={16} className="shrink-0" /> : <CheckCircle size={16} className="shrink-0" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header>
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-5xl font-black text-white tracking-tighter">
          FRACCION<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-500">AMIENTO</span>
        </motion.h1>
        <p className="text-slate-500 font-medium mt-1">Convierte sacos o cajas en unidades de venta individual</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario */}
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-8 md:p-10 shadow-xl">
          {fetching ? (
            <div className="flex items-center justify-center h-40">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-3 border-pink-500/20 rounded-full" />
                <div className="absolute inset-0 border-3 border-t-pink-500 rounded-full animate-spin" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleConvert} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start relative">
                {/* Producto Original */}
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    Producto Origen (Saco / Caja)
                  </label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white focus:ring-2 focus:ring-pink-500/50 outline-none transition-all appearance-none cursor-pointer text-sm"
                    value={parentProduct}
                    onChange={e => setParentProduct(e.target.value)}
                  >
                    <option value="">Selecciona el producto grande...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} disabled={p.id == childProduct}>
                        {p.name} — Stock: {p.stock}
                      </option>
                    ))}
                  </select>
                  <AnimatePresence>
                    {selectedParent && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`p-3 rounded-xl border text-sm ${
                          selectedParent.stock <= 0
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            : selectedParent.stock <= 2
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {selectedParent.stock <= 0
                          ? '⛔ Sin stock disponible'
                          : `✓ Disponible: ${selectedParent.stock} unidad${selectedParent.stock !== 1 ? 'es' : ''}`}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Flecha central */}
                <div className="hidden md:flex absolute left-1/2 top-12 -translate-x-1/2 bg-pink-500/10 p-3 rounded-full border border-pink-500/20 text-pink-500 z-10">
                  <ArrowRight size={22} />
                </div>

                {/* Producto Destino */}
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    Producto Destino (Libra / Unidad)
                  </label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white focus:ring-2 focus:ring-pink-500/50 outline-none transition-all appearance-none cursor-pointer text-sm"
                    value={childProduct}
                    onChange={e => setChildProduct(e.target.value)}
                  >
                    <option value="">Selecciona el producto pequeño...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} disabled={p.id == parentProduct}>
                        {p.name} (Factor: {p.conversion_factor || '⚠ Sin configurar'})
                      </option>
                    ))}
                  </select>
                  <AnimatePresence>
                    {selectedChild && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`p-3 rounded-xl border text-sm ${
                          !selectedChild.conversion_factor
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                        }`}
                      >
                        {!selectedChild.conversion_factor
                          ? '⚠ Sin factor de conversión — configúralo en el sistema central'
                          : `Factor: 1 grande = ${selectedChild.conversion_factor} ${selectedChild.name}`}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Cantidad y preview */}
              <div className="border-t border-slate-800/50 pt-8 space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    Cantidad a fraccionar
                  </label>
                  <input
                    type="number" step="0.01" min="0.01" placeholder="Ej. 1 saco, 0.5 sacos..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white focus:ring-2 focus:ring-pink-500/50 outline-none text-2xl font-bold"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                  />
                </div>

                {/* Preview de conversión */}
                <AnimatePresence>
                  {preview !== null && selectedParent && selectedChild && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20 rounded-2xl p-5"
                    >
                      <p className="text-xs text-pink-400 font-black uppercase tracking-widest mb-3">Vista Previa</p>
                      <div className="flex items-center gap-4 text-white">
                        <div className="text-center">
                          <p className="text-3xl font-black text-white">{quantity}</p>
                          <p className="text-xs text-slate-500 mt-1 truncate max-w-[100px]">{selectedParent.name}</p>
                        </div>
                        <ArrowRight size={20} className="text-pink-400 shrink-0" />
                        <div className="text-center">
                          <p className="text-3xl font-black text-emerald-400">{preview}</p>
                          <p className="text-xs text-slate-500 mt-1 truncate max-w-[100px]">{selectedChild.name}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading || !selectedParent || !selectedChild || !quantity}
                  className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black py-5 rounded-2xl hover:shadow-2xl hover:shadow-pink-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed text-lg"
                >
                  <Scissors size={22} />
                  {loading ? 'PROCESANDO...' : 'FRACCIONAR AHORA'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Panel derecho */}
        <div className="space-y-6">
          {/* Info */}
          <div className="bg-gradient-to-br from-slate-900 to-black p-7 rounded-[2rem] border border-slate-800/50 shadow-xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-pink-500/10 p-3 rounded-xl text-pink-500"><Info size={20} /></div>
              <h3 className="font-black text-white">¿Cómo funciona?</h3>
            </div>
            <div className="space-y-3 text-sm text-slate-400 leading-relaxed">
              <p>① Selecciona el <strong className="text-slate-200">producto grande</strong> (saco, caja, bolsa)</p>
              <p>② Selecciona el <strong className="text-slate-200">producto fraccionado</strong> (libra, unidad)</p>
              <p>③ El sistema <strong className="text-pink-400">descuenta del saco</strong> y <strong className="text-emerald-400">suma al stock de libras</strong> automáticamente</p>
            </div>
            <div className="mt-5 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 flex gap-2">
              <AlertCircle className="text-amber-500 shrink-0" size={16} />
              <p className="text-xs text-amber-500/80 font-bold leading-tight">
                Configura el "Factor de conversión" en el producto destino desde el sistema central antes de usar esta función.
              </p>
            </div>
          </div>

          {/* Ejemplo */}
          <div className="bg-pink-500/5 p-7 rounded-[2rem] border border-pink-500/10 relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 text-pink-500/5 transform -rotate-12 transition-transform group-hover:rotate-0 duration-700">
              <Package size={120} />
            </div>
            <h3 className="font-black text-pink-500 mb-2 uppercase tracking-widest text-xs">Ejemplo Real</h3>
            <p className="text-slate-300 font-bold italic text-lg leading-snug relative z-10">
              "1 saco de arroz (100 lbs) → 100 libras de arroz al detalle"
            </p>
            <p className="text-slate-600 text-xs mt-3 relative z-10">Factor de conversión del producto "Arroz/Libra": 100</p>
          </div>

          {/* Historial de sesión */}
          {history.length > 0 && (
            <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-[2rem] p-6 shadow-xl">
              <h3 className="font-black text-white mb-4 flex items-center gap-2 text-sm">
                <RefreshCw size={14} className="text-slate-500" />
                Historial de esta sesión
              </h3>
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="flex justify-between items-start bg-slate-900/50 rounded-xl p-3 border border-slate-800/30">
                    <div className="text-xs">
                      <p className="text-slate-300 font-bold">{h.qty} {h.parentName}</p>
                      <p className="text-emerald-400 font-black">→ {h.result} {h.childName}</p>
                    </div>
                    <span className="text-slate-600 text-[10px]">{h.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Fraccionamiento;