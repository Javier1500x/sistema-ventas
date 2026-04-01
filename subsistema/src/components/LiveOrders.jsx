import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShoppingBag, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw,
  User, FileText, ChevronDown, ChevronUp, Bell, BellOff, Package,
  CreditCard, MessageSquare, Timer, Filter, Inbox
} from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-500 animate-pulse' },
  preparing: { label: 'Preparando', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-500 animate-pulse' },
  ready: { label: 'Listo', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
  delivered: { label: 'Entregado', color: 'text-slate-400', bg: 'bg-slate-800/50', border: 'border-slate-700/30', dot: 'bg-slate-500' },
  cancelled: { label: 'Cancelado', color: 'text-rose-400', bg: 'bg-rose-500/5', border: 'border-rose-500/20', dot: 'bg-rose-500' },
};

const fmtC = (n) => `C$ ${Number(n || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const LiveOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending | all
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [notification, setNotification] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const prevCountRef = useRef(0);

  const showNotif = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get('/api/dashboard/orders');
      const newOrders = Array.isArray(res.data) ? res.data : [];
      const newPendingCount = newOrders.filter(o => o.status === 'pending').length;

      // Detect new orders
      if (prevCountRef.current > 0 && newPendingCount > prevCountRef.current) {
        showNotif(`🔔 Nuevo pedido recibido (${newPendingCount} pendientes)`, 'info');
      }
      prevCountRef.current = newPendingCount;
      setOrders(newOrders);
      setLastOrderCount(newPendingCount);
    } catch (err) {
      console.error('Error cargando pedidos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    
    // Configurar Socket para tiempo real
    const socket = io();
    socket.on('dashboardUpdate', (data) => {
      // Recargar si el cambio afecta a los pedidos
      if (['order_status_updated', 'sale', 'new_order'].includes(data.type)) {
        fetchOrders();
      }
    });

    const interval = setInterval(fetchOrders, 60000); // Polling de seguridad fallback cada 60s
    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [fetchOrders]);

  const updateStatus = async (orderId, newStatus) => {
    setActionLoading(orderId + newStatus);
    try {
      await axios.put(`/api/dashboard/orders/${orderId}/status`, { status: newStatus });
      showNotif(`Pedido marcado como "${STATUS_CONFIG[newStatus]?.label}"`, 'success');
      await fetchOrders();
    } catch (err) {
      showNotif('Error al actualizar el estado', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredOrders = filter === 'all'
    ? orders
    : filter === 'active'
    ? orders.filter(o => ['pending', 'preparing'].includes(o.status))
    : orders.filter(o => o.status === filter);

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    return `Hace ${hrs}h ${mins % 60}m`;
  };

  const parseItems = (order) => {
    try {
      if (Array.isArray(order.items)) return order.items;
      if (typeof order.items === 'string') return JSON.parse(order.items);
      return [];
    } catch { return []; }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Notification toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className={`fixed top-6 left-1/2 z-50 px-6 py-3 rounded-2xl font-bold text-sm shadow-2xl border ${
              notification.type === 'error' ? 'bg-rose-950 border-rose-500/50 text-rose-300' :
              notification.type === 'info' ? 'bg-blue-950 border-blue-500/50 text-blue-300' :
              'bg-emerald-950 border-emerald-500/50 text-emerald-300'
            }`}
          >
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-5xl font-black text-white tracking-tighter">
            PEDIDOS <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">EN VIVO</span>
          </motion.h1>
          <p className="text-slate-500 font-medium mt-1">Auto-pedidos del catálogo · actualización cada 15 seg.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(s => !s)}
            className={`p-2.5 rounded-xl border transition-all ${soundEnabled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
            title={soundEnabled ? 'Silenciar alertas' : 'Activar alertas'}
          >
            {soundEnabled ? <Bell size={16} /> : <BellOff size={16} />}
          </button>
          <button onClick={fetchOrders} className="flex items-center gap-2 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white px-4 py-2.5 rounded-2xl text-sm font-bold transition-all hover:border-emerald-500/50">
            <RefreshCw size={15} />
            Actualizar
          </button>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 rounded-2xl">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-amber-400 font-black text-sm">{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pendientes', count: pendingCount, color: 'amber', icon: <Clock size={18} className="text-amber-400" /> },
          { label: 'Preparando', count: preparingCount, color: 'blue', icon: <Timer size={18} className="text-blue-400" /> },
          { label: 'Listos', count: orders.filter(o => o.status === 'ready').length, color: 'emerald', icon: <CheckCircle2 size={18} className="text-emerald-400" /> },
          { label: 'Total Hoy', count: orders.length, color: 'purple', icon: <ShoppingBag size={18} className="text-purple-400" /> },
        ].map(s => (
          <div key={s.label} className={`bg-[#0a0a0a] border border-slate-800/50 rounded-[2rem] p-5`}>
            <div className={`w-10 h-10 bg-${s.color}-500/10 rounded-xl flex items-center justify-center mb-3`}>{s.icon}</div>
            <p className="text-3xl font-black text-white">{s.count}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-black mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'active', label: '⚡ Activos', count: orders.filter(o => ['pending','preparing'].includes(o.status)).length },
          { id: 'pending', label: '🟡 Pendientes', count: pendingCount },
          { id: 'preparing', label: '🔵 Preparando', count: preparingCount },
          { id: 'ready', label: '✅ Listos', count: orders.filter(o => o.status === 'ready').length },
          { id: 'delivered', label: '📦 Entregados', count: orders.filter(o => o.status === 'delivered').length },
          { id: 'cancelled', label: '❌ Cancelados', count: orders.filter(o => o.status === 'cancelled').length },
          { id: 'all', label: 'Todos', count: orders.length },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              filter === f.id ? 'bg-white text-black' : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 gap-4">
          <Inbox size={48} className="text-slate-600" />
          <p className="text-slate-400 font-black text-xl">Sin pedidos en esta categoría</p>
          <p className="text-slate-600 text-sm">Los pedidos del catálogo digital aparecerán aquí automáticamente.</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredOrders.map((order, idx) => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const items = parseItems(order);
              const isExpanded = expandedId === order.id;
              const total = items.reduce((s, i) => s + (i.price * i.quantity), 0) || order.total || 0;

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`${cfg.bg} border ${cfg.border} rounded-[2rem] overflow-hidden`}
                >
                  {/* Card Header */}
                  <button
                    className="w-full p-6 text-left"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`${cfg.bg} border ${cfg.border} p-3 rounded-2xl shrink-0`}>
                          <ShoppingBag size={20} className={cfg.color} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-white">
                              {order.customerName || 'Cliente'}
                            </span>
                            {order.public_id && (
                              <span className="text-[10px] text-slate-600 font-mono">#{String(order.public_id).slice(0, 8)}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock size={11} />
                              {getTimeAgo(order.date)}
                            </span>
                            <span className="text-xs text-slate-500">{items.length} producto{items.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xl font-black text-white">{fmtC(total)}</p>
                          {order.payWith && <p className="text-xs text-slate-500">Con: {fmtC(order.payWith)}</p>}
                        </div>
                        {isExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden border-t border-white/5"
                      >
                        <div className="p-6 pt-4 space-y-4">
                          {/* Items */}
                          <div className="space-y-2">
                            {items.map((item, i) => (
                              <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                                <div className="flex items-center gap-3">
                                  <span className="bg-white/5 text-white text-xs font-black w-7 h-7 flex items-center justify-center rounded-lg">{item.quantity}</span>
                                  <span className="text-slate-300 text-sm font-medium">{item.name}</span>
                                </div>
                                <span className="text-emerald-400 text-sm font-black">{fmtC(item.price * item.quantity)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between items-center pt-2">
                              <span className="text-slate-400 font-black text-sm">TOTAL</span>
                              <span className="text-white font-black text-lg">{fmtC(total)}</span>
                            </div>
                            {order.payWith && (
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500 text-xs">Cambio estimado</span>
                                <span className="text-amber-400 font-black text-sm">{fmtC(order.payWith - total)}</span>
                              </div>
                            )}
                          </div>

                          {/* Note */}
                          {order.note && (
                            <div className="flex items-start gap-2 bg-black/20 rounded-xl p-3">
                              <MessageSquare size={14} className="text-slate-500 shrink-0 mt-0.5" />
                              <p className="text-slate-300 text-sm italic">"{order.note}"</p>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-3 pt-2">
                            {order.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => updateStatus(order.id, 'preparing')}
                                  disabled={actionLoading === order.id + 'preparing'}
                                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black py-3 px-4 rounded-xl text-sm transition-all disabled:opacity-50"
                                >
                                  <Timer size={16} />
                                  {actionLoading === order.id + 'preparing' ? 'Procesando...' : 'Aceptar y Preparar'}
                                </button>
                                <button
                                  onClick={() => updateStatus(order.id, 'cancelled')}
                                  disabled={actionLoading === order.id + 'cancelled'}
                                  className="flex items-center gap-2 bg-rose-900/50 hover:bg-rose-800 text-rose-300 font-black py-3 px-4 rounded-xl text-sm transition-all border border-rose-700/50 disabled:opacity-50"
                                >
                                  <XCircle size={16} />
                                  Rechazar
                                </button>
                              </>
                            )}
                            {order.status === 'preparing' && (
                              <button
                                onClick={() => updateStatus(order.id, 'ready')}
                                disabled={actionLoading === order.id + 'ready'}
                                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-4 rounded-xl text-sm transition-all disabled:opacity-50"
                              >
                                <CheckCircle2 size={16} />
                                {actionLoading === order.id + 'ready' ? 'Procesando...' : '¡Listo para entregar!'}
                              </button>
                            )}
                            {order.status === 'ready' && (
                              <button
                                onClick={() => updateStatus(order.id, 'delivered')}
                                disabled={actionLoading === order.id + 'delivered'}
                                className="flex-1 flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-600 text-white font-black py-3 px-4 rounded-xl text-sm transition-all disabled:opacity-50"
                              >
                                <Package size={16} />
                                {actionLoading === order.id + 'delivered' ? 'Procesando...' : 'Marcar como Entregado'}
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default LiveOrders;
