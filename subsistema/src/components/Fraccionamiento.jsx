import React, { useState, useEffect } from 'react';
import { Scissors, ArrowRight, Package, Save, Info, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

const API_URL = '/api';

const Fraccionamiento = () => {
  const [products, setProducts] = useState([]);
  const [parentProduct, setParentProduct] = useState('');
  const [childProduct, setChildProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`${API_URL}/dashboard/products`);
        setProducts(res.data);
      } catch (err) {
        console.error('Error fetching products');
      }
    };
    fetchProducts();
  }, []);

  const handleConvert = async (e) => {
    e.preventDefault();
    if (!parentProduct || !childProduct || !quantity) return alert('Completa todos los campos');
    
    setLoading(true);
    try {
      await axios.post(`${API_URL}/products/convert`, {
        parentId: parentProduct,
        childId: childProduct,
        quantityToConvert: parseFloat(quantity)
      });
      alert('Conversión exitosa');
      setQuantity('');
    } catch (err) {
      alert(err.response?.data?.message || 'Error en la conversión');
    } finally {
      setLoading(false);
    }
  };

  const selectedParent = products.find(p => p.id == parentProduct);
  const selectedChild = products.find(p => p.id == childProduct);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-black text-white tracking-tight mb-2">FRACCIONAMIENTO</h1>
        <p className="text-slate-500 font-medium">Convierte sacos o cajas en unidades de venta (Libras/Onzas)</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#0a0a0a] border border-slate-800/50 rounded-[2.5rem] p-8 md:p-12">
          <form onSubmit={handleConvert} className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative">
              {/* Producto Original */}
              <div className="space-y-4">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">De este producto (Saco/Caja)</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white focus:ring-2 focus:ring-pink-500 outline-none transition-all appearance-none cursor-pointer"
                  value={parentProduct}
                  onChange={e => setParentProduct(e.target.value)}
                >
                  <option value="">Selecciona el producto grande...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                  ))}
                </select>
                {selectedParent && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-pink-400 text-sm font-bold px-1">
                    Disponible: {selectedParent.stock} unidades
                  </motion.p>
                )}
              </div>

              <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-pink-500/10 p-3 rounded-full border border-pink-500/20 text-pink-500">
                <ArrowRight size={24} />
              </div>

              {/* Producto Destino */}
              <div className="space-y-4">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">A este producto (Libra/Unidad)</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white focus:ring-2 focus:ring-pink-500 outline-none transition-all appearance-none cursor-pointer"
                  value={childProduct}
                  onChange={e => setChildProduct(e.target.value)}
                >
                  <option value="">Selecciona el producto pequeño...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {selectedChild && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-400 text-sm font-bold px-1">
                    Factor: 1 grande = {selectedChild.conversion_factor || 1} pequeñas
                  </motion.p>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-end border-t border-slate-800/50 pt-12">
               <div className="flex-1 space-y-4 w-full">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Cantidad a fraccionar</label>
                  <input 
                    type="number" step="0.01" placeholder="Ej. 1 saco"
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white focus:ring-2 focus:ring-pink-500 outline-none text-2xl font-bold"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                  />
               </div>
               <button 
                type="submit"
                disabled={loading}
                className="w-full md:w-auto bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black px-12 py-5 rounded-2xl hover:shadow-2xl hover:shadow-pink-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
               >
                 <Scissors size={20} /> {loading ? 'PROCESANDO...' : 'FRACCIONAR AHORA'}
               </button>
            </div>
          </form>
        </div>

        <div className="space-y-8">
           <div className="bg-gradient-to-br from-slate-900 to-black p-8 rounded-[2rem] border border-slate-800/50 shadow-xl">
              <div className="flex items-center gap-4 mb-6">
                 <div className="bg-pink-500/10 p-3 rounded-xl text-pink-500">
                    <Info size={24} />
                 </div>
                 <h3 className="font-black text-white">¿Cómo funciona?</h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-4 font-medium">
                Al fraccionar, el sistema descuenta la cantidad del producto "Saco/Caja" y aumenta automáticamente el stock del producto "Libra/Unidad".
              </p>
              <div className="p-4 bg-yellow-500/5 rounded-2xl border border-yellow-500/10 flex gap-3">
                 <AlertCircle className="text-yellow-500 shrink-0" size={18} />
                 <p className="text-[11px] text-yellow-500/80 font-bold leading-tight uppercase">
                    Asegúrate de haber configurado el "Factor de conversión" en la edición del producto.
                 </p>
              </div>
           </div>

           <div className="bg-pink-500/5 p-8 rounded-[2rem] border border-pink-500/10 relative overflow-hidden group">
              <div className="absolute -right-8 -bottom-8 text-pink-500/5 transform -rotate-12 transition-transform group-hover:rotate-0 duration-700">
                 <Package size={160} />
              </div>
              <h3 className="font-black text-pink-500 mb-2 uppercase tracking-widest text-xs">Ejemplo Real</h3>
              <p className="text-slate-300 font-bold italic text-lg leading-snug relative z-10">
                "Sacar 1 saco de arroz (100 lbs) para venderlo al detalle."
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Fraccionamiento;