import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Save, Search, ShoppingCart } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const ComboCreator = () => {
  const [products, setProducts] = useState([]);
  const [combos, setCombos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [comboName, setComboName] = useState('');
  const [comboPrice, setComboPrice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prodRes, comboRes] = await Promise.all([
        axios.get(`${API_URL}/products`),
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

  const removeItem = (id) => {
    setSelectedItems(selectedItems.filter(item => item.product_id !== id));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (selectedItems.length === 0) return alert('Selecciona al menos un producto');
    
    try {
      await axios.post(`${API_URL}/combos`, {
        name: comboName,
        price: parseFloat(comboPrice),
        description: 'Combo creado desde subsistema',
        items: selectedItems
      });
      setComboName('');
      setComboPrice('');
      setSelectedItems([]);
      fetchData();
      alert('Combo creado con éxito');
    } catch (error) {
      alert('Error al guardar combo');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOriginal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          CREADOR DE COMBOS
        </h1>
        <p className="text-slate-400 mt-2">Arma paquetes rápidos para tus clientes</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Selección de Productos */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text"
              placeholder="Buscar productos por nombre..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredProducts.map(p => (
              <div 
                key={p.id}
                onClick={() => addItem(p)}
                className="flex justify-between items-center p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 cursor-pointer transition-colors"
              >
                <div>
                  <p className="font-bold">{p.name}</p>
                  <p className="text-xs text-slate-500">Stock: {p.stock}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-emerald-400 font-medium">C$ {p.price}</span>
                  <Plus size={18} className="text-purple-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuración del Combo */}
        <div className="space-y-6">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <ShoppingCart className="text-pink-500" size={20} />
              Detalle del Combo
            </h2>
            <div className="space-y-4 mb-6">
              {selectedItems.map(item => (
                <div key={item.product_id} className="flex justify-between items-center bg-slate-800 p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="bg-purple-500/20 text-purple-400 w-6 h-6 flex items-center justify-center rounded text-xs font-bold">
                      {item.quantity}
                    </span>
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <button onClick={() => removeItem(item.product_id)} className="text-slate-500 hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {selectedItems.length === 0 && (
                <p className="text-center py-8 text-slate-500 italic">Selecciona productos de la izquierda</p>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4 border-t border-slate-800">
              <input 
                type="text" placeholder="Nombre del Combo (ej. Desayuno Express)" required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={comboName}
                onChange={e => setComboName(e.target.value)}
              />
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] text-slate-500 mb-1">Precio Original: C$ {totalOriginal}</label>
                  <input 
                    type="number" placeholder="Precio Combo (C$)" required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={comboPrice}
                    onChange={e => setComboPrice(e.target.value)}
                  />
                </div>
                <div className="flex-1 flex flex-col justify-end">
                   <p className="text-xs text-emerald-400 font-bold mb-2">
                     Ahorro: C$ {totalOriginal - (parseFloat(comboPrice) || 0)}
                   </p>
                   <button 
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <Save size={18} /> Crear Combo
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Lista de Combos Creados */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
             <h2 className="text-lg font-bold mb-4">Combos Activos</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {combos.map(c => (
                  <div key={c.id} className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm">{c.name}</p>
                      <p className="text-emerald-400 text-xs font-bold">C$ {c.price}</p>
                    </div>
                    <Package size={16} className="text-slate-600" />
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComboCreator;