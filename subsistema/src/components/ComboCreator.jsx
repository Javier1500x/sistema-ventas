import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Save, Search, ShoppingCart, Tag, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = '/api';
const fmtC = (n) => `C$ ${Number(n || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ComboCreator = () => {
  const [products, setProducts] = useState([]);
  const [combos, setCombos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [comboName, setComboName] = useState('');
  const [comboPrice, setComboPrice] = useState('');
  const [comboDesc, setComboDesc] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [prodRes, comboRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/products`),
        axios.get(`${API_URL}/combos`)
      ]);
      setProducts(prodRes.data);
      setCombos(comboRes.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const addItem = (product) => {
    const existing = selectedItems.find(item => item.product_id === product.id);
    if (existing) {
      setSelectedItems(selectedItems.map(item =>
        item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setSelectedItems([...selectedItems, { product_id: product.id, name: product.name, price: product.price, quantity: 1 }]);
    }
  };

  const removeItem = (id) => setSelectedItems(selectedItems.filter(item => item.product_id !== id));

  const adjustQty = (id, delta) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.product_id !== id) return item;
      const newQty = item.quantity + delta;
      return newQty <= 0 ? null : { ...item, quantity: newQty };
    }).filter(Boolean));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) return showToast('Selecciona al menos un producto', 'error');
    setSaving(true);
    try {
      await axios.post(`${API_URL}/combos`, {
        name: comboName,
        price: parseFloat(comboPrice),
        description: comboDesc || `Combo creado desde el panel estratégico`,
        items: selectedItems
      });
      setComboName(''); setComboPrice(''); setComboDesc(''); setSelectedItems([]);
      fetchData();
      showToast('¡Combo creado con éxito! Ya está disponible en el catálogo.');
    } catch (error) {
      showToast('Error al guardar el combo', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Eliminar el combo "${name}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(id);
    try {
      await axios.delete(`${API_URL}/combos/${id}`);
      fetchData();
      showToast(`Combo "${name}" eliminado.`, 'success');
    } catch (err) {
      showToast('Error al eliminar el combo', 'error');
    } finally { setDeletingId(null); }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOriginal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const comboR = parseFloat(comboPrice) || 0;
  const saving_amount = totalOriginal - comboR;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-16 relative">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-6 left-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-sm shadow-2xl border ${
              toast.type === 'error'
                ? 'bg-rose-950 border-rose-500/50 text-rose-300'
                : 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header>
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-5xl font-black text-white tracking-tighter">
          CREADOR DE <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">COMBOS</span>
        </motion.h1>
        <p className="text-slate-500 font-medium mt-1">Crea paquetes atractivos que aumentan el ticket promedio</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Selector de Productos */}
        <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-7 shadow-xl">
          <h2 className="text-lg font-black text-white mb-5 flex items-center gap-2">
            <Search size={18} className="text-purple-400" /> Buscar Productos
          </h2>
          <div className="relative mb-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Nombre del producto..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredProducts.length === 0 && (
              <p className="text-slate-500 text-center py-8 italic text-sm">Sin resultados</p>
            )}
            {filteredProducts.map(p => {
              const inCart = selectedItems.find(i => i.product_id === p.id);
              return (
                <motion.div
                  key={p.id}
                  onClick={() => addItem(p)}
                  whileHover={{ x: 4 }}
                  className={`flex justify-between items-center p-4 rounded-2xl border cursor-pointer transition-all ${
                    inCart
                      ? 'bg-purple-500/10 border-purple-500/30'
                      : 'bg-slate-900/50 hover:bg-slate-800/80 border-slate-800/50'
                  }`}
                >
                  <div>
                    <p className={`font-bold text-sm ${inCart ? 'text-purple-300' : 'text-slate-200'}`}>{p.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Stock: {p.stock} · {p.category || 'Sin cat.'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-black text-sm">{fmtC(p.price)}</span>
                    {inCart ? (
                      <span className="bg-purple-500 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-lg">{inCart.quantity}</span>
                    ) : (
                      <div className="w-6 h-6 rounded-lg border border-slate-700 flex items-center justify-center">
                        <Plus size={12} className="text-slate-500" />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Configuración del Combo */}
        <div className="space-y-6">
          {/* Items seleccionados */}
          <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-7 shadow-xl">
            <h2 className="text-lg font-black text-white mb-5 flex items-center gap-2">
              <ShoppingCart size={18} className="text-pink-400" />
              Contenido del Combo
              {selectedItems.length > 0 && (
                <span className="ml-auto bg-purple-500/20 text-purple-400 text-xs font-black px-2.5 py-1 rounded-lg border border-purple-500/30">
                  {selectedItems.length} producto{selectedItems.length !== 1 ? 's' : ''}
                </span>
              )}
            </h2>

            <div className="space-y-2 min-h-[80px] mb-5">
              <AnimatePresence>
                {selectedItems.map(item => (
                  <motion.div
                    key={item.product_id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex justify-between items-center bg-slate-900/70 p-3 rounded-2xl border border-slate-800/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <button onClick={() => adjustQty(item.product_id, -1)} className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-black transition-colors">−</button>
                        <span className="bg-purple-500/20 text-purple-400 w-7 h-7 flex items-center justify-center rounded-lg text-xs font-black">{item.quantity}</span>
                        <button onClick={() => adjustQty(item.product_id, 1)} className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-black transition-colors">+</button>
                      </div>
                      <span className="text-slate-200 text-sm font-medium truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-emerald-400 text-xs font-black">{fmtC(item.price * item.quantity)}</span>
                      <button onClick={() => removeItem(item.product_id)} className="text-slate-600 hover:text-rose-400 transition-colors p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {selectedItems.length === 0 && (
                <p className="text-slate-600 text-center py-6 italic text-sm">Haz clic en un producto para agregarlo →</p>
              )}
            </div>

            {/* Savings indicator */}
            {totalOriginal > 0 && (
              <div className={`p-4 rounded-2xl border mb-5 ${saving_amount > 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Precio original separado:</span>
                  <span className="text-slate-300 font-black">{fmtC(totalOriginal)}</span>
                </div>
                {comboR > 0 && (
                  <div className="flex justify-between text-sm mt-1.5">
                    <span className="text-slate-400">Ahorro del cliente:</span>
                    <span className={`font-black ${saving_amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {saving_amount > 0 ? '+' : ''}{fmtC(saving_amount)} ({saving_amount > 0 ? ((saving_amount / totalOriginal) * 100).toFixed(0) : 0}%)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSave} className="space-y-3 pt-4 border-t border-slate-800/50">
              <input
                type="text" placeholder="Nombre del combo (ej. Desayuno Express)" required
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm placeholder-slate-600"
                value={comboName}
                onChange={e => setComboName(e.target.value)}
              />
              <input
                type="text" placeholder="Descripción breve (opcional)"
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm placeholder-slate-600"
                value={comboDesc}
                onChange={e => setComboDesc(e.target.value)}
              />
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">C$</span>
                  <input
                    type="number" step="0.01" min="0" placeholder="Precio del combo" required
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                    value={comboPrice}
                    onChange={e => setComboPrice(e.target.value)}
                  />
                </div>
                <button
                  type="submit" disabled={saving}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black px-6 py-3 rounded-2xl hover:shadow-xl hover:shadow-purple-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={16} />
                  {saving ? 'Guardando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>

          {/* Combos activos */}
          <div className="bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-7 shadow-xl">
            <h2 className="text-lg font-black text-white mb-5 flex items-center gap-2">
              <Tag size={18} className="text-emerald-400" />
              Combos Activos
              <span className="ml-auto text-slate-600 text-xs font-medium">{combos.length} combo{combos.length !== 1 ? 's' : ''}</span>
            </h2>
            {combos.length === 0 ? (
              <p className="text-slate-600 text-center py-8 italic text-sm">Aún no has creado combos</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {combos.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-slate-900/50 border border-slate-800/50 p-4 rounded-2xl group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center">
                        <ShoppingCart size={16} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-200 text-sm">{c.name}</p>
                        <p className="text-emerald-400 text-xs font-black mt-0.5">{fmtC(c.price)}</p>
                        {c.description && <p className="text-slate-600 text-xs truncate max-w-[180px]">{c.description}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      disabled={deletingId === c.id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-rose-400 p-2 rounded-xl hover:bg-rose-500/10 disabled:opacity-50"
                      title="Eliminar combo"
                    >
                      {deletingId === c.id ? (
                        <div className="w-4 h-4 border-2 border-t-rose-400 border-slate-700 rounded-full animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComboCreator;