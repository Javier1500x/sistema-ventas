import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle, Clock, ArrowRight, Package, X, Star, ScanLine, ShieldCheck, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function CustomerCatalog({ apiBaseUrl, formatCurrency }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orderId, setOrderId] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState('catalog');
  
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

    // Parse statusId from URL if present
    const checkHashForStatus = () => {
      const hash = window.location.hash;
      if (hash.includes('?')) {
        const queryString = hash.split('?')[1];
        const params = new URLSearchParams(queryString);
        
        if (hash.includes('#receipt')) {
          const id = params.get('id');
          if (id) {
            setOrderId(id);
            setView('receipt');
            return;
          }
        }

        const statusId = params.get('statusId');
        if (statusId) {
          setOrderId(statusId);
          setView('order-status');
          // Start as preparing if we don't know yet, polling will fix it
          setOrderStatus(prev => prev || 'preparing'); 
        }
      }
    };

    checkHashForStatus();
    // Also listen for manual changes if they happen
    window.addEventListener('hashchange', checkHashForStatus);
    return () => window.removeEventListener('hashchange', checkHashForStatus);
  }, [apiBaseUrl]);

  // Fetch Public Receipt if in receipt view
  useEffect(() => {
    if (view === 'receipt' && orderId) {
      fetch(`${apiBaseUrl}/api/public/receipts/${orderId}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) setReceiptData(data);
        })
        .catch(err => console.error('Error fetching receipt:', err));
    }
  }, [view, orderId, apiBaseUrl]);

  // Polling for order status
  useEffect(() => {
    if (orderId && view === 'order-status') {
      const interval = setInterval(() => {
        fetch(`${apiBaseUrl}/api/auto-orders/${orderId}`)
          .then(res => res.json())
          .then(data => {
            if (data.status) {
              setOrderStatus(data.status);
              setOrderData(data);
            }
          })
          .catch(err => console.error('Error polling status:', err));
      }, 4000);
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
      const orderItems = cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity }));
      const orderTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      
      const response = await fetch(`${apiBaseUrl}/api/auto-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: orderItems,
          total: orderTotal,
          customerName: customerName.trim() || 'Cliente',
          note: customerNote.trim(),
          payWith: payWith ? parseFloat(payWith) : null
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setOrderId(data.id);
        setOrderStatus('pending');
        setOrderData({ items: orderItems, total: orderTotal, customerName: customerName.trim() || 'Cliente' });
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

  // --- RECEIPT QR DATA ---
  const buildReceiptText = () => {
    if (!orderData) return '';
    const items = Array.isArray(orderData.items) ? orderData.items : [];
    let text = `RECIBO #${orderId}\n`;
    text += `Cliente: ${orderData.customerName || 'Cliente'}\n`;
    text += `---\n`;
    items.forEach(item => {
      text += `${item.name} x${item.quantity} = ${formatCurrency(item.price * item.quantity)}\n`;
    });
    text += `---\n`;
    text += `TOTAL: ${formatCurrency(orderData.total)}\n`;
    text += `Gracias por su compra!`;
    return text;
  };

  // =================== PUBLIC RECEIPT VIEW ===================
  if (view === 'receipt') {
    if (!receiptData) {
      return (
        <div className="min-h-screen bg-slate-50 flexflex-col items-center justify-center py-20">
           <div className="max-w-md mx-auto text-center"><p className="text-slate-500 animate-pulse">Cargando Factura Digital...</p></div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-slate-100 flex flex-col items-center justify-center px-4 py-8 font-mono">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 p-6 relative">
          {/* Ticket Header */}
          <div className="text-center mb-6 border-b border-dashed border-slate-300 pb-6">
            <h1 className="text-2xl font-black text-slate-800 tracking-wider">COMPROBANTE</h1>
            <p className="text-xs text-slate-500 mt-2">Factura #{String(receiptData.id).padStart(5, '0')}</p>
            <p className="text-xs text-slate-400">{new Date(receiptData.date).toLocaleString('es-NI')}</p>
          </div>

          {/* Ticket Items */}
          <div className="mb-6 border-b border-dashed border-slate-300 pb-6 min-h-[150px]">
            {receiptData.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start mb-3 text-sm">
                <div className="flex-1 pr-4">
                  <p className="font-semibold text-slate-700">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.quantity}x {formatCurrency(item.price)}</p>
                </div>
                <div className="text-right font-semibold text-slate-800">
                  {formatCurrency(item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          {/* Ticket Totals */}
          <div className="mb-6">
            <div className="flex justify-between items-center text-lg font-black text-indigo-700 bg-indigo-50 p-3 rounded-lg">
              <span>TOTAL</span>
              <span>{formatCurrency(receiptData.total)}</span>
            </div>
            {receiptData.paymentMethod && (
              <div className="flex justify-between items-center mt-3 text-xs text-slate-500 font-bold uppercase tracking-wider px-2">
                <span>MÉTODO DE PAGO</span>
                <span className="text-slate-700 bg-slate-100 px-2 py-1 rounded">{receiptData.paymentMethod}</span>
              </div>
            )}
          </div>

          {/* Ticket Footer */}
          <div className="text-center mt-8">
            <div className="inline-block bg-white p-3 rounded-xl border border-slate-200">
              <QRCodeSVG 
                value={window.location.href}
                size={120}
                level="M"
                includeMargin={true}
                fgColor="#000000"
                bgColor="#ffffff"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">Guarda este código QR para futuras referencias.<br/>¡Gracias por tu compra!</p>
          </div>
          
          {/* Edge cutouts */}
          <div className="absolute left-[-10px] top-[40%] w-5 h-5 bg-indigo-50 rounded-full border-r border-slate-200"></div>
          <div className="absolute right-[-10px] top-[40%] w-5 h-5 bg-indigo-50 rounded-full border-l border-slate-200"></div>
        </div>
      </div>
    );
  }

  // =================== ORDER STATUS VIEW ===================
  if (view === 'order-status') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-50 relative overflow-hidden flex flex-col items-center justify-center px-6 py-10 font-sans">
        {/* Background Decorative Elements - Soft and slow animations */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-indigo-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-violet-300/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

        <div className="w-full max-w-sm mx-auto text-center relative z-10 bg-white/80 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-200/50 border border-white">
          
          {/* Animated Icon */}
          <div className="relative h-52 flex items-center justify-center mb-8">
            <div className="absolute inset-0 bg-indigo-50 rounded-full scale-75 opacity-40 blur-3xl animate-pulse"></div>
            
            {orderStatus === 'pending' && (
              <div className="relative">
                <div className="bg-white p-6 rounded-full shadow-2xl border border-indigo-100 inline-flex mx-auto">
                  <ScanLine size={64} className="text-indigo-600 animate-pulse" />
                </div>
              </div>
            )}
            {orderStatus === 'preparing' && (
              <div className="relative">
                <div className="bg-white p-6 rounded-full shadow-2xl border border-amber-100 inline-flex mx-auto">
                  <Package size={64} className="text-amber-500 animate-bounce" />
                </div>
              </div>
            )}
            {orderStatus === 'ready' && (
              <div className="relative">
                <div className="bg-white p-6 rounded-full shadow-2xl border border-emerald-100 inline-flex mx-auto">
                  <ShieldCheck size={64} className="text-emerald-500" />
                </div>
              </div>
            )}
          </div>

          {/* Status Text */}
          <div className="mb-6">
            {orderStatus === 'pending' && (
              <>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Recibido</h2>
                <p className="text-slate-400 font-medium text-sm mt-2">Tu pedido fue registrado correctamente</p>
              </>
            )}
            {orderStatus === 'preparing' && (
              <>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">En Proceso</h2>
                <p className="text-slate-400 font-medium text-sm mt-2">El vendedor está atendiendo tu pedido 📦</p>
              </>
            )}
            {orderStatus === 'ready' && (
              <>
                <h2 className="text-2xl font-black text-emerald-600 tracking-tight">¡Listo para Retirar!</h2>
                <p className="text-slate-500 font-medium text-sm mt-2">Pasa al mostrador a recoger tus productos ✨</p>
              </>
            )}
          </div>

          {/* Stepper Dots */}
          <div className="flex justify-center items-center gap-6 mb-8">
            {['pending', 'preparing', 'ready'].map((s, i) => {
              const active = (orderStatus === s) || (orderStatus === 'preparing' && i === 0) || (orderStatus === 'ready');
              return (
                <div key={s} className="flex flex-col items-center gap-2">
                  <div className={`w-4 h-4 rounded-full transition-all duration-700 ${active ? (s === 'ready' ? 'bg-emerald-500 scale-125' : 'bg-indigo-600 scale-125') : 'bg-slate-200'}`} />
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${active ? 'text-slate-700' : 'text-slate-300'}`}>
                    {s === 'pending' ? 'Recibido' : s === 'preparing' ? 'Proceso' : 'Listo'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* QR Receipt (only when ready) */}
          {orderStatus === 'ready' && orderData && (
            <div className="bg-slate-100/50 rounded-3xl p-6 mb-6 border border-slate-200/50">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Comprobante Digital</p>
              <div className="bg-white p-2 rounded-2xl inline-block shadow-md border border-slate-200 mx-auto">
                <QRCodeSVG 
                  value={`${window.location.origin}${window.location.pathname}#catalog?statusId=${orderId}`} 
                  size={180} 
                  level="H" 
                  includeMargin={true}
                  fgColor="#000000"
                  bgColor="#ffffff"
                />
              </div>
              <div className="mt-4 text-left bg-white rounded-2xl p-4 border border-slate-50">
                <p className="text-[10px] font-bold text-slate-300 uppercase mb-2">Detalle</p>
                {Array.isArray(orderData.items) && orderData.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-1 border-b border-slate-50 last:border-0">
                    <span className="text-slate-600 font-medium">{item.name} <span className="text-slate-400">x{item.quantity}</span></span>
                    <span className="text-slate-800 font-bold">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-3 mt-2 border-t border-slate-200">
                  <span className="font-black text-slate-800">TOTAL</span>
                  <span className="font-black text-indigo-600">{formatCurrency(orderData.total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-slate-50 pt-6">
            <span className="text-[10px] font-bold text-slate-300 block mb-3 tracking-widest uppercase">Orden #{orderId}</span>
            <button 
              onClick={() => { setOrderId(null); setOrderData(null); setView('catalog'); setCart([]); setCustomerName(''); setCustomerNote(''); setPayWith(''); }} 
              className="text-slate-400 font-bold text-xs hover:text-slate-600 transition-colors"
            >
              Hacer otra compra
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =================== ORDER FORM VIEW ===================
  if (view === 'order-form') {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-10 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
          <h2 className="text-xl font-black text-slate-800 mb-5 text-center">Confirma tu Pedido</h2>
          
          {/* Cart Summary */}
          <div className="bg-slate-50 rounded-2xl p-4 mb-5 border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Resumen</p>
            {cart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm py-1.5 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-slate-700 font-medium">{item.name}</span>
                  <span className="text-slate-400 text-xs">x{item.quantity}</span>
                </div>
                <span className="text-slate-800 font-bold">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center text-base pt-3 mt-2 border-t border-slate-200">
              <span className="font-black text-slate-800">Total</span>
              <span className="font-black text-indigo-600 text-lg">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block ml-1">Tu Nombre</label>
              <input 
                type="text" 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
                placeholder="Ej. Juan Pérez" 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all text-sm" 
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block ml-1">¿Con cuánto pagas? (Opcional)</label>
              <input 
                type="number" 
                value={payWith} 
                onChange={(e) => setPayWith(e.target.value)} 
                placeholder={`Total: ${formatCurrency(total)}`} 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all text-sm" 
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block ml-1">Notas (Opcional)</label>
              <textarea 
                value={customerNote} 
                onChange={(e) => setCustomerNote(e.target.value)} 
                placeholder="Ej. Me lo empaquetan por separado, necesito bolsa..." 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl h-20 resize-none focus:ring-2 focus:ring-indigo-600 outline-none transition-all text-sm" 
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button 
              onClick={() => setView('catalog')} 
              className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors text-sm"
            >
              Atrás
            </button>
            <button 
              onClick={submitOrder} 
              disabled={isSubmitting} 
              className={`flex-1 py-4 rounded-2xl text-white font-bold transition-all shadow-md flex items-center justify-center gap-2 text-sm ${isSubmitting ? 'bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
            >
              {isSubmitting ? 'Enviando...' : 'Confirmar Pedido'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =================== CATALOG VIEW ===================
  return (
    <div className="min-h-screen bg-white pb-28">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-50 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">Tienda <span className="text-indigo-600">Digital</span></h1>
          <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Compra fácil y rápido</p>
        </div>
        <div className="relative">
          <div 
            className="p-2.5 bg-slate-50 rounded-2xl hover:bg-indigo-50 transition-colors cursor-pointer" 
            onClick={() => cart.length > 0 && setView('order-form')}
          >
            <ShoppingCart className="text-slate-700" size={22} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-black ring-2 ring-white">
                {cart.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="px-6 pt-4 pb-2">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-indigo-200/50">
          <div className="relative z-10">
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">Bienvenido</span>
            <h2 className="text-2xl font-black mt-3 leading-tight">Haz tu pedido<br/>sin hacer fila</h2>
            <p className="text-indigo-100 mt-1 text-xs font-medium">Escoge, ordena y recoge. Así de fácil.</p>
          </div>
          <Star className="absolute -right-4 -bottom-4 text-white/10" size={120} />
        </div>
      </div>

      {/* Product Grid */}
      <div className="px-6 pt-4 grid grid-cols-2 gap-4">
        {products.map(product => (
          <div key={product.id} className="bg-white rounded-3xl p-3.5 flex flex-col border border-slate-100 hover:shadow-lg transition-all group">
            <div className="aspect-square bg-slate-50 rounded-2xl mb-3 flex items-center justify-center overflow-hidden">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <Package className="text-slate-200" size={36} />
              )}
            </div>
            <h3 className="font-bold text-slate-800 text-sm leading-tight mb-1 line-clamp-2">{product.name}</h3>
            <div className="mt-auto pt-2 flex items-center justify-between">
              <span className="text-indigo-600 font-black">{formatCurrency(product.price)}</span>
              <button 
                onClick={() => addToCart(product)}
                className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center text-lg hover:bg-indigo-600 transition-all active:scale-90"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between border border-white/10">
            <div className="pl-2">
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Total</p>
              <p className="text-lg font-black">{formatCurrency(cart.reduce((sum, i) => sum + i.price * i.quantity, 0))}</p>
            </div>
            <button 
              onClick={() => setView('order-form')}
              className="bg-indigo-600 px-6 py-3.5 rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-500 active:scale-95 transition-all text-sm shadow-lg shadow-indigo-600/30"
            >
              PEDIR <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
