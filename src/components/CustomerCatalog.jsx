import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle, Clock, ArrowRight, Package, X, Star, ScanLine, ShieldCheck } from 'lucide-react';

export default function CustomerCatalog({ apiBaseUrl, formatCurrency }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orderId, setOrderId] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null); // 'pending', 'preparing', 'ready'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState('catalog'); // 'catalog', 'order-form', 'order-status'
  
  // New interaction states
  const [customerName, setCustomerName] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [payWith, setPayWith] = useState('');

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/public/products`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProducts(data);
        } else {
          console.error('Invalid products data:', data);
          setProducts([]);
        }
      })
      .catch(err => {
        console.error('Error fetching products:', err);
        setProducts([]);
      });

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
            if (data.status) setOrderStatus(data.status);
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
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/auto-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity })),
          total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
          customerName: customerName.trim() || 'Cliente QR',
          note: customerNote.trim(),
          payWith: payWith ? parseFloat(payWith) : null
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setOrderId(data.id);
        setOrderStatus('pending');
        setView('order-status');
      } else {
        alert(`Error: ${data.message || 'Error al enviar pedido'}${data.detail ? '\nDetalle: ' + data.detail : ''}`);
      }
    } catch (error) {
      alert('Error de conexión al servidor: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (view === 'order-status') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 font-sans">
        <div className="w-full max-w-sm">
          <div className="relative h-64 flex items-center justify-center mb-12">
            <div className="absolute inset-0 bg-indigo-50 rounded-full scale-90 opacity-50 blur-3xl animate-pulse"></div>
            {orderStatus === 'pending' && (
              <div className="relative text-center">
                <div className="bg-white p-8 rounded-full shadow-2xl border border-indigo-100 inline-flex">
                  <ScanLine size={80} className="text-indigo-600 animate-pulse" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mt-8 tracking-tight">Recibiendo...</h2>
                <p className="text-slate-400 font-medium text-sm mt-2">Estamos procesando tu orden</p>
              </div>
            )}
            {orderStatus === 'preparing' && (
              <div className="relative text-center">
                <div className="bg-white p-8 rounded-full shadow-2xl border border-amber-100 inline-flex">
                  <Package size={80} className="text-amber-500 animate-bounce" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mt-8 tracking-tight">Preparando...</h2>
                <p className="text-slate-400 font-medium text-sm mt-2">Tu pedido está en proceso 👨‍🍳</p>
              </div>
            )}
            {orderStatus === 'ready' && (
              <div className="relative text-center">
                <div className="bg-white p-8 rounded-full shadow-2xl border border-emerald-100 inline-flex">
                  <ShieldCheck size={80} className="text-emerald-500" />
                </div>
                <h2 className="text-2xl font-black text-emerald-600 mt-8 tracking-tight">¡LISTO!</h2>
                <p className="text-slate-500 font-medium text-sm mt-2">Pasa a retirar tu pedido ✨</p>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center px-12 mb-12 relative">
            <div className="absolute left-0 right-0 h-0.5 bg-slate-100 -z-10 mx-12"></div>
            {['pending', 'preparing', 'ready'].map((s, i) => {
              const active = (orderStatus === s) || (orderStatus === 'preparing' && i === 0) || (orderStatus === 'ready');
              return (
                <div key={s} className={`w-3 h-3 rounded-full border-2 border-white ring-2 ${active ? 'bg-indigo-600 ring-indigo-100' : 'bg-slate-200 ring-transparent'} transition-all duration-700`} />
              );
            })}
          </div>
          <div className="text-center border-t border-slate-50 pt-8">
             <span className="text-[10px] font-bold text-slate-300 block mb-4 tracking-widest uppercase">Orden #{orderId}</span>
             <button onClick={() => { setOrderId(null); setView('catalog'); setCart([]); }} className="text-slate-400 font-bold text-xs hover:text-slate-600 transition-colors">Nueva Orden</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'order-form') {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-100 px-6">
           <h2 className="text-2xl font-black text-slate-800 mb-6">Completa tu Pedido</h2>
           <div className="space-y-4 mb-8">
             <div>
               <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Tu Nombre</label>
               <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Ej. Juan Pérez" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all" />
             </div>
             <div>
               <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">¿Con cuánto pagas?</label>
               <input type="number" value={payWith} onChange={(e) => setPayWith(e.target.value)} placeholder={`Monto sugerido: ${formatCurrency(total)}`} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all" />
             </div>
             <div>
               <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block ml-1">Notas especiales</label>
               <textarea value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} placeholder="Ej. Sin cebolla, extra salsa..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl h-24 resize-none focus:ring-2 focus:ring-indigo-600 outline-none transition-all" />
             </div>
           </div>
           <div className="flex gap-4">
             <button onClick={() => setView('catalog')} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors">Atrás</button>
             <button 
               onClick={submitOrder} 
               disabled={isSubmitting} 
               className={`flex-1 py-4 rounded-2xl text-white font-bold transition-all shadow-md flex items-center justify-center gap-2 ${isSubmitting ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
             >
               {isSubmitting ? 'Enviando...' : 'Pedir Ahora'}
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-50 px-6 py-5 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Menú <span className="text-indigo-600">Digital</span></h1>
          <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Sabor que puedes ver</p>
        </div>
        <div className="relative">
          <div className="p-2 bg-slate-50 rounded-full hover:bg-indigo-50 transition-colors cursor-pointer" onClick={() => view === 'catalog' && cart.length > 0 && setView('order-form')}>
            <ShoppingCart className="text-slate-800" size={24} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black ring-2 ring-white">
                {cart.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Modern Hero */}
      <div className="p-6">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
           <div className="relative z-10">
             <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">Bienvenidos</span>
             <h2 className="text-4xl font-black mt-4 leading-none">Pide <br/>Fácil.</h2>
             <p className="text-indigo-100 mt-2 text-sm font-medium w-2/3">Explora nuestro menú y realiza tu orden al instante.</p>
           </div>
           <Star className="absolute -right-6 -bottom-6 text-white/10" size={160} />
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        </div>
      </div>

      {/* Grid de Productos */}
      <div className="px-6 grid grid-cols-2 gap-5 mb-8">
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-[2rem] p-4 flex flex-col h-full border border-slate-100 hover:shadow-xl hover:shadow-slate-100 transition-all group">
            <div className="aspect-square bg-slate-50 rounded-[1.5rem] mb-4 flex items-center justify-center overflow-hidden relative">
               {product.image ? (
                 <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
               ) : (
                 <Package className="text-slate-200" size={40} />
               )}
            </div>
            <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1">{product.name}</h3>
            <div className="mt-auto pt-2 flex items-center justify-between">
              <span className="text-indigo-600 font-black text-lg">{formatCurrency(product.price)}</span>
              <button 
                onClick={() => addToCart(product)}
                className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-600 transition-all active:scale-90"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Bar */}
      {cart.length > 0 && view === 'catalog' && (
        <div className="fixed bottom-8 left-6 right-6 z-50 animate-in slide-in-from-bottom-10">
           <div className="bg-slate-900/90 backdrop-blur-xl text-white p-5 rounded-[2.5rem] shadow-2xl flex items-center justify-between border border-white/10">
              <div className="pl-2">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Total</p>
                <p className="text-xl font-black text-white">{formatCurrency(cart.reduce((sum, i) => sum + i.price * i.quantity, 0))}</p>
              </div>
              <button 
                onClick={() => setView('order-form')}
                className="bg-indigo-600 px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-500 active:scale-95 transition-all text-sm shadow-lg shadow-indigo-600/30"
              >
                ORDENAR <ArrowRight size={18} />
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
