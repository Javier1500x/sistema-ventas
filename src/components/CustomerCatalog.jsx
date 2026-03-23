import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle, Clock, ArrowRight, Package, X, Star } from 'lucide-react';

export default function CustomerCatalog({ apiBaseUrl, formatCurrency }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orderId, setOrderId] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null); // 'pending', 'preparing', 'ready'
  const [view, setView] = useState('catalog'); // 'catalog', 'order-status'

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/products`)
      .then(res => res.json())
      .then(data => setProducts(data.filter(p => p.stock > 0)))
      .catch(err => console.error('Error fetching products:', err));

    // Revisar si venimos de un QR de estado
    const hash = window.location.hash;
    if (hash.includes('?')) {
      const queryString = hash.split('?')[1];
      const params = new URLSearchParams(queryString);
      const statusId = params.get('statusId');
      if (statusId) {
        setOrderId(statusId);
        setView('order-status');
        setOrderStatus('pending');
      }
    }
  }, [apiBaseUrl]);

  // Polling for order status
  useEffect(() => {
    if (orderId && view === 'order-status') {
      const interval = setInterval(() => {
        fetch(`${apiBaseUrl}/api/auto-orders/${orderId}`)
          .then(res => res.json())
          .then(data => {
            setOrderStatus(data.status);
          })
          .catch(err => console.error('Error polling status:', err));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [orderId, view, apiBaseUrl]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const submitOrder = async () => {
    if (cart.length === 0) return;
    try {
      const response = await fetch(`${apiBaseUrl}/api/auto-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
          customerName: 'Cliente QR'
        })
      });
      if (response.ok) {
        const data = await response.json();
        setOrderId(data.id);
        setOrderStatus('pending');
        setView('order-status');
        setCart([]);
      }
    } catch (error) {
      alert('Error al enviar pedido');
    }
  };

  if (view === 'order-status') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-100">
          <div className="mb-6 flex justify-center">
            <div className={`p-4 rounded-full ${orderStatus === 'ready' ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600 animate-pulse'}`}>
              {orderStatus === 'ready' ? <CheckCircle size={48} /> : <Clock size={48} />}
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {orderStatus === 'ready' ? '¡Tu pedido está listo!' : 
             orderStatus === 'preparing' ? 'Estamos preparando tu pedido' : 
             'Pedido Pendiente'}
          </h2>
          <p className="text-slate-500 mb-8">
            Orden #{orderId?.toString().slice(-4)}
          </p>

          <div className="flex justify-between mb-8 relative">
             <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -z-10"></div>
             {['pending', 'preparing', 'ready'].map((s, i) => (
               <div key={s} className="flex flex-col items-center">
                 <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white ${
                   (i === 0 || (i === 1 && (orderStatus === 'preparing' || orderStatus === 'ready')) || (i === 2 && orderStatus === 'ready')) 
                   ? 'border-indigo-600 text-indigo-600' : 'border-slate-200 text-slate-300'
                 }`}>
                   {i + 1}
                 </div>
                 <span className="text-[10px] mt-2 font-medium uppercase tracking-wider text-slate-400">
                   {s === 'pending' ? 'Recibido' : s === 'preparing' ? 'En Cocina' : 'Listo'}
                 </span>
               </div>
             ))}
          </div>

          <button 
            onClick={() => setView('catalog')}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            Volver al Menú <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">MOSTRADOR <span className="text-indigo-600">DIGITAL</span></h1>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Nuestra selección para ti</p>
        </div>
        <div className="relative">
          <ShoppingCart className="text-slate-900" onClick={() => submitOrder()} />
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {cart.reduce((sum, i) => sum + i.quantity, 0)}
            </span>
          )}
        </div>
      </header>

      {/* Hero */}
      <div className="p-6">
        <div className="bg-indigo-600 rounded-3xl p-6 text-white overflow-hidden relative">
          <div className="relative z-10">
            <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Oferta Hoy</span>
            <h2 className="text-3xl font-bold mt-2">Bienvenido</h2>
            <p className="text-indigo-100 mt-1 text-sm">Escoge tus productos y pide sin hacer filas.</p>
          </div>
          <Star className="absolute -right-4 -bottom-4 text-white/10" size={120} />
        </div>
      </div>

      {/* Grid */}
      <div className="px-6 grid grid-cols-2 gap-4">
        {products.map(product => (
          <div key={product.id} className="bg-slate-50 rounded-3xl p-4 flex flex-col h-full border border-slate-100 hover:border-indigo-200 transition-all">
            <div className="aspect-square bg-slate-200 rounded-2xl mb-3 flex items-center justify-center overflow-hidden">
               {product.image ? (
                 <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
               ) : (
                 <Package className="text-slate-400" size={32} />
               )}
            </div>
            <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{product.name}</h3>
            <p className="text-indigo-600 font-black mt-1">{formatCurrency(product.price)}</p>
            <button 
              onClick={() => addToCart(product)}
              className="mt-3 w-full py-2 bg-white text-slate-900 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-900 hover:text-white transition-all"
            >
              Agregar +
            </button>
          </div>
        ))}
      </div>

      {/* Cart Summary (Floating) */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-6 right-6 bg-slate-900 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-4">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Total Estimado</p>
            <p className="text-lg font-black">{formatCurrency(cart.reduce((sum, i) => sum + i.price * i.quantity, 0))}</p>
          </div>
          <button 
            onClick={submitOrder}
            className="bg-indigo-600 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-500 active:scale-95 transition-all text-sm"
          >
            Enviar Pedido <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
