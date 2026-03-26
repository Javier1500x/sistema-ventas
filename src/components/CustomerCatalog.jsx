import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle, Clock, ArrowRight, Package, X, Star, ScanLine, ShieldCheck, QrCode, Search, SlidersHorizontal, ChevronDown, Minus, Plus, Trash2, History, Send, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import logoImage from '/Gemini_Generated_Image_tlsnlhtlsnlhtlsn.png?url';

const storeInfo = {
  name: "PULPERÍA FÉLIX FLORES",
  address: [
    "B° Camilo Ortega",
    "frente al costado oeste de la iglesia",
    "católica"
  ],
  city: "Managua, Nicaragua",
  phone: "Telf: 2222-5555",
  footer: "¡Gracias por su compra!"
};

export default function CustomerCatalog({ apiBaseUrl, formatCurrency }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orderId, setOrderId] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState('catalog');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [sortOption, setSortOption] = useState('name-asc');
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewQuantity, setQuickViewQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [payWith, setPayWith] = useState('');
  const [pastOrders, setPastOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching products:', err);
        setProducts([]);
        setIsLoading(false);
      });

    // Cargar historial local
    try {
      const saved = localStorage.getItem('customer_past_orders');
      if (saved) setPastOrders(JSON.parse(saved));
    } catch (e) {
      console.error('Error loading past orders:', e);
    }

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
    if (product.stock <= 0) return; // Validación estricta
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`¡Solo hay ${product.stock} unidades disponibles!`);
          return prev;
        }
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
        
        // Guardar en historial local
        const newPast = [{ id: data.id, date: new Date().toISOString(), total: orderTotal }, ...pastOrders].slice(0, 10);
        setPastOrders(newPast);
        localStorage.setItem('customer_past_orders', JSON.stringify(newPast));
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
  const handleShareWhatsApp = () => {
    const text = `🧾 *MI RECIBO - ${storeInfo.name}*\nVer mi ticket aquí: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  // =================== PUBLIC RECEIPT VIEW ===================
  if (view === 'receipt') {
    if (!receiptData) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-20">
           <div className="max-w-md mx-auto text-center"><p className="text-slate-500 animate-pulse">Cargando Factura Digital...</p></div>
        </div>
      );
    }
    
    const subtotal = receiptData.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const total = receiptData.total || subtotal; 
    const change = receiptData.changeAmount >= 0 ? receiptData.changeAmount : ((receiptData.receivedAmount || 0) - total);

    return (
      <div className="min-h-screen bg-slate-200 flex flex-col items-center justify-start pt-12 pb-8 font-mono">
        <div className="w-[300px] bg-white p-4 text-xs font-mono leading-tight text-black shadow-2xl" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
          
          <div className="text-center mb-2">
            <img src={logoImage} alt="Logo" className="w-20 h-20 mx-auto" />
            {storeInfo.address.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
            <p>{storeInfo.city}</p>
            <p>{storeInfo.phone}</p>
          </div>

          <div className="mb-2 border-b border-black pb-2 border-dashed">
            <div className="flex justify-between">
              <span>Fecha: {new Date(receiptData.date).toLocaleDateString('es-NI', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
              <span>Hora: {new Date(receiptData.date).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between">
              <span>Ticket #: {String(receiptData.id || receiptData.transactionId).padStart(6, '0')}</span>
              <span>Caja: {receiptData.seller || "Vendido Automáticamente"}</span>
            </div>
          </div>

          <div className="mb-2">
            <div className="flex font-bold border-b border-black border-dashed pb-1 mb-1">
              <span className="w-8">CANT</span>
              <span className="flex-1 px-1">DESCRIPCION</span>
              <span className="w-16 text-right">TOTAL</span>
            </div>

            {receiptData.items.map((item, index) => (
              <div key={item.id || index} className="flex mb-1">
                <span className="w-8 text-center align-top">{item.quantity}</span>
                <div className="flex-1 px-1 flex flex-col">
                  <span>{item.productName || item.name}</span>
                  <span className="text-[10px] text-gray-600">
                    {item.quantity} x {formatCurrency(item.price)}
                  </span>
                </div>
                <span className="w-16 text-right align-top">
                  {formatCurrency(item.quantity * item.price)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-black border-dashed pt-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>SUBTOTAL:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex justify-between text-base font-bold mt-1">
              <span>TOTAL:</span>
              <span>{formatCurrency(total)}</span>
            </div>

            {receiptData.paymentMethod === 'Efectivo' && (
              <>
                <div className="flex justify-between mt-2 pt-2 border-t border-dotted border-gray-400">
                  <span>Efectivo:</span>
                  <span>{formatCurrency(receiptData.receivedAmount || 0)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Cambio:</span>
                  <span>{formatCurrency(change > 0 ? change : 0)}</span>
                </div>
              </>
            )}
            {receiptData.paymentMethod === 'Crédito' && (
              <div className="flex justify-between mt-2 pt-2 border-t border-dotted border-gray-400 font-bold">
                <span>PAGO:</span>
                <span>AL CRÉDITO</span>
              </div>
            )}
          </div>

          <div className="text-center border-t border-black border-dashed pt-2">
            <p className="whitespace-pre-line mb-2">{storeInfo.footer}</p>
            <p className="text-[10px]">* NO SE ACEPTAN DEVOLUCIONES *</p>
          </div>

          <div className="flex flex-col items-center justify-center mt-4 pt-4 border-t border-black border-dashed">
             <p className="mb-2 font-bold text-[10px] uppercase">Ver recibo digital</p>
             <div className="p-2 border border-black rounded-lg bg-white">
               <QRCodeSVG 
                 value={window.location.href}
                 size={80}
                 level="H"
                 includeMargin={true}
                 fgColor="#000000"
                 bgColor="#ffffff"
               />
             </div>
             <p className="mt-2 text-[8px] italic">#{receiptData.id || receiptData.transactionId}</p>
          </div>
          
          {/* Actions */}
          <div className="mt-6 flex flex-col gap-2 print:hidden">
            <button 
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] text-white rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all"
            >
              <Send size={14} /> Compartir por WhatsApp
            </button>
            <button 
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs border border-slate-200 active:scale-95 transition-all"
            >
              <Printer size={14} /> Imprimir / Guardar PDF
            </button>
          </div>
        </div>

        <button 
           onClick={() => { setView('catalog'); setOrderId(null); setReceiptData(null); window.location.hash = ''; }} 
           className="mt-8 bg-slate-900 text-white px-8 py-3 rounded-full text-sm font-bold shadow-lg hover:bg-slate-800 transition-colors print:hidden"
        >
           Hacer otra compra
        </button>
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
                  value={`${window.location.origin}${window.location.pathname}#receipt?id=${orderData.transactionId || orderId}`} 
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
              <div key={idx} className="flex justify-between items-center text-sm py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="w-6 h-6 flex items-center justify-center rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                  <div className="flex flex-col">
                    <span className="text-slate-700 font-bold">{item.name}</span>
                    <span className="text-slate-400 text-[10px]">x{item.quantity} · {formatCurrency(item.price)}</span>
                  </div>
                </div>
                <span className="text-slate-800 font-black">{formatCurrency(item.price * item.quantity)}</span>
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
  // Obtener categorías únicas dinámicamente
  const categories = ['Todos', ...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    switch(sortOption) {
      case 'price-asc': return a.price - b.price;
      case 'price-desc': return b.price - a.price;
      case 'name-asc': default: return a.name.localeCompare(b.name);
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans selection:bg-indigo-300">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-indigo-50 px-6 py-5 flex justify-between items-center shadow-sm shadow-indigo-100/50">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <ShoppingCart size={16} />
            </div>
            Tienda <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Digital</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* My Orders Button */}
          {pastOrders.length > 0 && (
            <button 
              onClick={() => setView('my-orders')}
              className="p-3 bg-white rounded-full shadow-md shadow-indigo-100 border border-indigo-50 active:scale-95 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"
              title="Mis Pedidos"
            >
              <History size={20} />
            </button>
          )}

          <div 
            className="p-3 bg-white rounded-full shadow-md shadow-indigo-100 hover:shadow-lg transition-all cursor-pointer border border-indigo-50 active:scale-95 flex items-center justify-center group relative" 
            onClick={() => cart.length > 0 && setView('order-form')}
          >
            <ShoppingCart className="text-indigo-600 group-hover:scale-110 transition-transform" size={24} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black shadow-lg shadow-rose-300 animate-bounce">
                {cart.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner with Modern Gradient */}
      <div className="px-6 pt-6 pb-4">
        <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-700 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-300">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10 flex flex-col h-full justify-center">
            <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 w-max shadow-sm mb-4">
              Bienvenido 👋
            </span>
            <h2 className="text-3xl font-black leading-tight drop-shadow-md">
              Lo mejor, <br/> sin hacer fila.
            </h2>
            <p className="text-indigo-100 mt-2 text-sm font-medium opacity-90">Selecciona, ordena y recoge.</p>
          </div>
        </div>
      </div>

      {/* Search & Categories */}
      <div className="px-6 space-y-4">
        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="text-indigo-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
          </div>
          <input 
            type="text" 
            placeholder="¿Qué estás buscando hoy?" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl shadow-sm border border-slate-100 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all text-slate-700 font-medium"
          />
        </div>

        {/* Categories Carousel */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
          {categories.map((cat, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedCategory(cat)}
              className={`snap-center shrink-0 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                selectedCategory === cat 
                  ? 'bg-slate-800 text-white shadow-lg shadow-slate-300 scale-100' 
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 scale-95'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 mt-2 px-1">
          <SlidersHorizontal size={16} className="text-indigo-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Ordenar:</span>
          <select 
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="bg-transparent text-sm font-semibold text-indigo-600 outline-none cursor-pointer focus:ring-0"
          >
            <option value="name-asc">Alfabéticamente</option>
            <option value="price-asc">Precio: Menor a Mayor</option>
            <option value="price-desc">Precio: Mayor a Menor</option>
          </select>
        </div>
      </div>

      {/* Product Grid */}
      <div className="px-6 pt-2 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {isLoading ? (
          // Skeleton Loading
          [1,2,3,4].map(n => (
            <div key={n} className="bg-white rounded-[2rem] p-2 flex flex-col border border-slate-100 animate-pulse">
              <div className="aspect-[4/3] bg-slate-100 rounded-3xl mb-3"></div>
              <div className="px-3 pb-3 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                <div className="flex justify-between items-center pt-2">
                  <div className="h-6 bg-slate-100 rounded w-1/3"></div>
                  <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
                </div>
              </div>
            </div>
          ))
        ) : filteredProducts.map(product => {
          const isOutOfStock = product.stock <= 0;
          const isLowStock = product.stock > 0 && product.stock <= 5;
          return (
            <div 
              key={product.id} 
              className={`bg-white rounded-[2rem] p-2 flex flex-col border border-slate-100 transition-all duration-300 ${isOutOfStock ? 'opacity-75 grayscale-[0.2]' : 'hover:shadow-2xl hover:shadow-indigo-100 hover:-translate-y-1'}`}
            >
              <div 
                className="aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl mb-3 flex items-center justify-center overflow-hidden relative group cursor-pointer"
                onClick={() => { if(!isOutOfStock) { setQuickViewProduct(product); setQuickViewQuantity(1); } }}
              >
                {isOutOfStock && (
                  <div className="absolute inset-0 z-20 bg-black/20 backdrop-blur-[2px] flex items-center justify-center rounded-3xl">
                    <span className="bg-rose-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest shadow-xl shadow-rose-900/50 uppercase">
                      Agotado
                    </span>
                  </div>
                )}
                {isLowStock && !isOutOfStock && (
                  <div className="absolute top-3 left-3 z-20">
                    <span className="bg-amber-500 text-white px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter shadow-lg shadow-amber-900/20 flex items-center gap-1">
                      <Clock size={10} /> ¡Quedan {product.stock}!
                    </span>
                  </div>
                )}
                {product.image ? (
                  <img src={product.image} alt={product.name} className={`w-full h-full object-cover transition-transform duration-700 ${!isOutOfStock && 'group-hover:scale-110'}`} />
                ) : (
                  <Package className="text-slate-300" size={48} />
                )}
              </div>
              <div className="px-3 pb-3 flex flex-col flex-1">
                <h3 className="font-bold text-slate-800 text-sm leading-tight mb-2 line-clamp-2 min-h-[40px]">{product.name}</h3>
                <div className="mt-auto flex items-end justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{product.category || 'Varios'}</span>
                    <span className="text-indigo-600 font-black text-lg">{formatCurrency(product.price)}</span>
                  </div>
                  <button 
                    onClick={() => !isOutOfStock && addToCart(product)}
                    disabled={isOutOfStock}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-light transition-all ${
                      isOutOfStock 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-slate-900 text-white hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-300 active:scale-90 active:bg-indigo-700'
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filteredProducts.length === 0 && (
          <div className="col-span-2 py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Search size={24} />
            </div>
            <h3 className="text-slate-600 font-bold">No se encontraron productos</h3>
            <p className="text-slate-400 text-sm mt-1">Intenta con otra búsqueda o categoría</p>
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
            <div className="relative aspect-video bg-slate-100 flex items-center justify-center">
              <button 
                onClick={() => setQuickViewProduct(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-white/50 backdrop-blur rounded-full flex items-center justify-center text-slate-700 hover:bg-white transition-colors z-10"
              >
                <X size={18} />
              </button>
              {quickViewProduct.image ? (
                <img src={quickViewProduct.image} alt={quickViewProduct.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="text-slate-300" size={64} />
              )}
            </div>
            <div className="p-6">
              <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mb-1 block">
                {quickViewProduct.category || 'Varios'}
              </span>
              <h3 className="text-xl font-black text-slate-800 leading-tight mb-2">{quickViewProduct.name}</h3>
              <p className="text-2xl font-black text-indigo-600 mb-6">{formatCurrency(quickViewProduct.price)}</p>
              
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl mb-6 border border-slate-100">
                <button 
                  onClick={() => setQuickViewQuantity(Math.max(1, quickViewQuantity - 1))}
                  className="w-12 h-12 flex items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm hover:shadow active:scale-95 transition-all disabled:opacity-50"
                  disabled={quickViewQuantity <= 1}
                >
                  <Minus size={20} />
                </button>
                <span className="text-xl font-black w-12 text-center text-slate-800">{quickViewQuantity}</span>
                <button 
                  onClick={() => setQuickViewQuantity(Math.min(quickViewProduct.stock, quickViewQuantity + 1))}
                  className="w-12 h-12 flex items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm hover:shadow active:scale-95 transition-all disabled:opacity-50"
                  disabled={quickViewQuantity >= quickViewProduct.stock}
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setCart(prev => {
                      const existing = prev.find(item => item.id === quickViewProduct.id);
                      if (existing) {
                        const maxQty = Math.min(quickViewProduct.stock, existing.quantity + quickViewQuantity);
                        return prev.map(item => item.id === quickViewProduct.id ? { ...item, quantity: maxQty } : item);
                      }
                      return [...prev, { ...quickViewProduct, quantity: quickViewQuantity }];
                    });
                    setQuickViewProduct(null);
                  }}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black tracking-wide flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors shadow-lg active:scale-95"
                >
                  <Plus size={18} /> {cart.find(i => i.id === quickViewProduct.id) ? 'ACTUALIZAR' : 'AÑADIR'}
                </button>
                
                {cart.find(i => i.id === quickViewProduct.id) && (
                  <button 
                    onClick={() => {
                      removeFromCart(quickViewProduct.id);
                      setQuickViewProduct(null);
                    }}
                    className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-100 active:scale-95 transition-all"
                  >
                    <Trash2 size={24} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Bar (Glassmorphism) */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 z-50 px-6 animate-in slide-in-from-bottom-5 fade-in duration-500">
          <div className="bg-slate-900/80 backdrop-blur-2xl text-white p-3 rounded-[2rem] shadow-2xl shadow-indigo-900/20 flex items-center justify-between border border-white/10">
            <div className="pl-4 flex items-center gap-4">
              <div className="relative">
                <ShoppingCart size={24} className="text-indigo-300" />
                <span className="absolute -top-2 -right-2 bg-rose-500 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ring-2 ring-slate-900">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total</p>
                <p className="text-xl font-black tracking-tight">{formatCurrency(cart.reduce((sum, i) => sum + i.price * i.quantity, 0))}</p>
              </div>
            </div>
            <button 
              onClick={() => setView('order-form')}
              className="bg-indigo-600 px-8 py-4 rounded-3xl font-black tracking-wide flex items-center gap-2 hover:bg-indigo-500 active:scale-95 transition-all text-sm shadow-xl shadow-indigo-600/40"
            >
              COMPRAR <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
      {/* My Orders View */}
      {view === 'my-orders' && (
        <div className="fixed inset-0 z-[70] bg-slate-50 flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-800">Mis Pedidos</h2>
            <button 
              onClick={() => setView('catalog')}
              className="w-10 h-10 bg-white shadow-md rounded-full flex items-center justify-center text-slate-500"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            {pastOrders.map((order, idx) => (
              <div 
                key={idx} 
                onClick={() => { setOrderId(order.id); setView('receipt'); }}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <History size={24} />
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-sm">Pedido #{order.id}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(order.date).toLocaleDateString('es-NI')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-indigo-600">{formatCurrency(order.total)}</p>
                  <p className="text-[10px] text-slate-300 font-bold uppercase">Ver Ticket <ArrowRight size={8} className="inline ml-1" /></p>
                </div>
              </div>
            ))}
          </div>
          
          {pastOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <History size={48} className="text-slate-200 mb-4" />
              <p className="text-slate-400 font-bold">No tienes pedidos anteriores</p>
            </div>
          )}
          
          <button 
            onClick={() => setView('catalog')}
            className="mt-8 w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm"
          >
            Volver a la tienda
          </button>
        </div>
      )}
    </div>
  );
}
