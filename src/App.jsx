import InsightsDashboard from './components/Insights.jsx';
import CashFlow from './components/CashFlow.jsx';
import UserManagementView from './components/UserManagementView.jsx'; // Import new component
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import './App.css';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  History,
  LogOut,
  User,
  Plus,
  Trash2,
  Search,
  Menu,
  X,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Pencil,
  ChevronDown,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Printer,
  Bell,
  Users, // Import Users icon
  Calendar,
  Moon,
  Sun,
  ShieldCheck,
  Settings,
  Send,
  FileText,
  Eye,
  Download,
  Upload,
  Image,
  ScanLine
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import logoImage from '/Gemini_Generated_Image_tlsnlhtlsnlhtlsn.png?url'; // Import the logo image URL
import BarcodeScanner from './components/BarcodeScanner.jsx';
import { QRCodeCanvas } from 'qrcode.react';
import CustomerCatalog from './components/CustomerCatalog.jsx';

// --- MOCK DATA & UTILS ---
// En un entorno real, esto se reemplaza por llamadas a la API (fetch/axios).
// Hemos preparado el código para que funcione visualmente ahora mismo.

// Determinar la URL del API
// 1. Variable de entorno explícita (VITE_API_URL)
// 2. Si estamos en Capacitor (Android), usar la URL de producción obligatoriamente
// 3. Si estamos en producción web (Render), usar rutas relativas ''
// 4. Si estamos en local, usar localhost
const isCapacitor = Boolean(window.Capacitor && window.Capacitor.isNative);
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (isCapacitor ? 'https://sistema-ventas-tjby.onrender.com' :
    (import.meta.env.MODE === 'production' ? '' : 'http://localhost:3001'));

console.log('--- SISTEMA INICIALIZADO ---');
console.log('Es Capacitor (Android):', isCapacitor);
console.log('API_BASE_URL:', API_BASE_URL || '(relativa)');

// Formato de moneda para Nicaragua
const formatCurrency = (amount) => {
  const safeAmount = (amount === undefined || amount === null || isNaN(Number(amount))) ? 0 : Number(amount);
  return new Intl.NumberFormat('es-NI', {
    style: 'currency',
    currency: 'NIO',
    minimumFractionDigits: 2
  }).format(safeAmount);
};

// Función para obtener la fecha actual ajustada según el offset configurado
const getNicaraguaDate = (offset = -6) => {
  // Date.now() es UTC. Sumamos el offset para obtener un objeto Date cuyos dígitos UTC sean la hora local.
  return new Date(Date.now() + (offset * 3600000));
};

// Función para formatear fecha (ahora siempre en UTC para el backend)
const formatNicaraguaDateTime = (date) => {
  return new Date().toISOString();
};

const getNicaraguaDateString = (offset = -6) => {
  const nicaDate = getNicaraguaDate(offset);
  return nicaDate.toISOString().split('T')[0];
};

// Helper universal para mostrar fechas de la DB (UTC) ajustadas al offset local
const formatDisplayDateTime = (dateStr, options = {}, offset = -6) => {
  try {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    // Detectar si la fecha es UTC real (ISO con Z o T)
    // Las fechas locales viejas suelen ser "YYYY-MM-DD HH:mm:ss" sin 'T' o sin 'Z'
    const isExplicitUTC = dateStr.includes('Z') || dateStr.includes('T');

    if (isExplicitUTC) {
      // Shifter la fecha por el offset y formatear como UTC para ver los dígitos locales correctos
      const adjusted = new Date(d.getTime() + (offset * 3600000));
      return adjusted.toLocaleString('es-NI', { timeZone: 'UTC', ...options });
    } else {
      // Es una fecha local vieja, mostrar directamente
      return d.toLocaleString('es-NI', options);
    }
  } catch (_e) {
    return dateStr;
  }
};

const INITIAL_PRODUCTS = [];

// --- Helper para convertir imagen a Base64 ---
const processImage = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

// --- Hook Personalizado para persistir estado en localStorage ---
const usePersistentState = (key, defaultValue) => {
  const [state, setState] = useState(() => {
    try {
      const persistedValue = window.localStorage.getItem(key);
      return persistedValue ? JSON.parse(persistedValue) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, state]);

  return [state, setState];
};

// --- Dark Mode Hook ---
const useDarkMode = () => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
  }, []);

  return [darkMode, setDarkMode];
};

// --- SONIDO DE NOTIFICACIÓN ---
const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.warn('AudioContext no soportado:', e);
  }
};


/**
 * COMPONENTE PRINCIPAL (APP)
 */
export default function App() {
  // --- CLIENT ROUTING ---
  const [isCustomerMode, setIsCustomerMode] = useState(window.location.hash === '#catalog');

  useEffect(() => {
    const handleHashChange = () => {
      setIsCustomerMode(window.location.hash === '#catalog');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // --- ESTADO GLOBAL ---
  const [user, setUser] = useState(null); // { name, role, token }
  const [view, setView] = useState('login'); // login, dashboard, pos, inventory, history
  const [currentAutoOrderId, setCurrentAutoOrderId] = useState(null);
  const [products, setProducts] = usePersistentState('products', INITIAL_PRODUCTS);
  const [sales, setSales] = usePersistentState('sales', []);
  const [cart, setCart] = useState([]);
  const [invoiceNumber, setInvoiceNumber] = usePersistentState('invoiceNumber', 1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [bellNotifications, setBellNotifications] = useState([]);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [expandedNotificationId, setExpandedNotificationId] = useState(null);

  const [darkMode, setDarkMode] = useDarkMode();
  const toggleDarkMode = () => setDarkMode(prev => !prev);

  const [editingProduct, setEditingProduct] = useState(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Para forzar recarga del resumen diario

  // Estados para Proveedores y Compras
  const [suppliers, setSuppliers] = useState([]);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  // Estado para Cierre de Caja
  const [cashClosing, setCashClosing] = useState(null);

  // Estado para Configuración (Fecha/Hora y Notificaciones)
  const [timeOffset, setTimeOffset] = useState(-6);
  const [notificationPhone, setNotificationPhone] = useState('');
  const [callmebotApiKey, setCallmebotApiKey] = useState('');

  // Estado para notificaciones temporales
  const [notification, setNotification] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  // Estado para Auto-Órdenes capturadas
  const [pendingAutoOrders, setPendingAutoOrders] = useState([]);
  const [lastNotifiedOrderId, setLastNotifiedOrderId] = useState(null);

  const showNotification = useCallback((msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // --- Cargar productos desde el backend ---
  const fetchProducts = useCallback(async () => {
    if (!user || !user.token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`, // Asumiendo que user.token está disponible
          'x-user-role': user.role // Asumiendo que user.role está disponible
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        const errorData = await response.json();
        console.error('Error al cargar productos:', errorData.message);
        showNotification(`Error al cargar productos: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('Error de conexión al cargar productos:', error);
      showNotification('Error de conexión al cargar productos.', 'error');
    }
  }, [user, showNotification]); // Dependencias de user y showNotification

  // --- Cargar historial de ventas desde el backend ---
  const fetchSales = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/sales-history`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'x-user-role': user.role
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSales(data);
      } else {
        console.error('Error al cargar el historial de ventas:', response.statusText);
        showNotification('Error al cargar historial de ventas.', 'error');
      }
    } catch (error) {
      console.error('Error al conectar con el backend para ventas:', error);
      showNotification('Error de conexión al cargar historial de ventas.', 'error');
    }
  }, [user, showNotification]);

  const fetchSuppliers = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/suppliers`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'x-user-role': user.role
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
      } else {
        console.error('Error fetching suppliers:', response.status);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  }, [user]);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'x-user-role': user.role
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.time_offset) setTimeOffset(parseFloat(data.time_offset));
        if (data.notification_phone) setNotificationPhone(data.notification_phone);
        if (data.callmebot_apikey) setCallmebotApiKey(data.callmebot_apikey);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, [user]);

  const updateSettings = async (settings) => {
    if (!user || !user.token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
          'x-user-role': user.role
        },
        body: JSON.stringify(settings)
      });
      if (response.ok) {
        if (settings.time_offset !== undefined) setTimeOffset(parseFloat(settings.time_offset));
        if (settings.notification_phone !== undefined) setNotificationPhone(settings.notification_phone);
        if (settings.callmebot_apikey !== undefined) setCallmebotApiKey(settings.callmebot_apikey);
        showNotification('Configuración de sistema actualizada', 'success');
      }
    } catch (error) {
      showNotification('Error al actualizar configuración', 'error');
    }
  };

  const handleDownloadPDF = () => {
    window.open(`${API_BASE_URL}/api/reports/pdf`, '_blank');
    showNotification('Iniciando descarga de reporte...', 'info');
  };

  const handlePreviewPDF = async () => {
    try {
      showNotification('Preparando vista previa...', 'info');
      const response = await fetch(`${API_BASE_URL}/api/reports/pdf`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'x-user-role': user.role
        }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setShowPdfPreview(true);
      } else {
        showNotification('Error al generar vista previa', 'error');
      }
    } catch (error) {
      showNotification('Error de conexión', 'error');
    }
  };

  const handleSendManualReport = async () => {
    try {
      showNotification('Enviando reporte...', 'info');
      // Intentamos primero con el backend (si hay API Key)
      const response = await fetch(`${API_BASE_URL}/api/send-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'x-user-role': user.role
        }
      });

      if (response.ok) {
        const data = await response.json();
        showNotification(data.message, 'success');
      } else {
        // Fallback: Abrir WhatsApp Web con el reporte (Sin Key)
        const reportResponse = await fetch(`${API_BASE_URL}/api/generate-only-report`, {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'x-user-role': user.role
          }
        });
        if (reportResponse.ok) {
          const { report } = await reportResponse.json();
          const phone = notificationPhone.replace(/\D/g, '') || "50585853867";
          const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(report)}`;
          window.open(waUrl, '_blank');
          showNotification('Abriendo WhatsApp Web...', 'info');
        } else {
          showNotification('Error al generar reporte manual', 'error');
        }
      }
    } catch (error) {
      showNotification('Error de conexión', 'error');
    }
  };

  useEffect(() => {
    // Si la App se inicializa y hay un usuario logueado, cargar los datos
    if (user) {
      // Carga inicial
      fetchProducts();
      fetchSales();
      fetchSuppliers();
      fetchSettings();

      // Sincronización "Tiempo Real" (Polling cada 15 segundos)
      const intervalId = setInterval(() => {
        fetchProducts();
        fetchSales();
        fetchSuppliers();
      }, 15000);

      // Limpiar intervalo si el usuario sale o el componente se desmonta
      return () => clearInterval(intervalId);
    }
  }, [user, fetchProducts, fetchSales, fetchSuppliers, fetchSettings]);

  // Estado para el modal de la factura
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [currentReceiptData, setCurrentReceiptData] = useState(null);
  const [storeInfo] = useState({
    name: "Empresa",
    address: ["B° Camilo Ortega", "frente al costado oeste de la iglesia católica"],
    city: "Managua, Nicaragua",
    phone: "Telf: 2222-5555",
    footer: "¡Gracias por su compra!",
  });


  // Estado para el modal de edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [hasWelcomed, setHasWelcomed] = useState(false);

  // --- Efecto para Bienvenida por Voz y Notificación simulada ---
  useEffect(() => {
    if (user && !hasWelcomed) {
      console.log('--- BIENVENIDA POST-LOGIN ---');
      // 1. Bienvenida por voz con protección total
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel(); // Detener cualquier voz previa
          const welcomeMessage = new SpeechSynthesisUtterance("Bienvenid@ al sistema de ventas");
          welcomeMessage.lang = 'es-ES';
          welcomeMessage.rate = 1;
          window.speechSynthesis.speak(welcomeMessage);
        }
      } catch (speechError) {
        console.warn('SpeechSynthesis no disponible o falló:', speechError);
      }

      setHasWelcomed(true);

      // 2. Simulación de notificación de stock bajo
      const timer = setTimeout(() => {
        try {
          const lowStockProducts = products.filter(p => p.stock > 0 && p.stock < 10);
          const newNotifications = [];

          if (lowStockProducts.length > 0) {
            lowStockProducts.forEach(p => {
              newNotifications.push({
                id: `stock-${p.id}`,
                icon: AlertCircle,
                title: "Inventario bajo",
                message: `Quedan ${p.stock} unidades de '${p.name}'`,
                details: `Categoría: ${p.category}\nPrecio: ${formatCurrency(p.price)}`
              });
            });
          }

          newNotifications.push({
            id: 'welcome',
            icon: TrendingUp,
            title: "¡Sistema listo!",
            message: "Todo listo para empezar a vender.",
            details: "Esta es tu central de notificaciones. Aquí recibirás alertas importantes sobre tu inventario."
          });

          setBellNotifications(prev => [...prev, ...newNotifications]);
        } catch (notifError) {
          console.error("Error al procesar notificaciones iniciales:", notifError);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [user, products, hasWelcomed]);

  // --- ESCUCHA DE AUTO-PEDIDOS (POLLING) ---
  useEffect(() => {
    if (user && user.role !== 'customer') { // Solo admin/vendedor ven esto
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/pending-auto-orders`, {
            headers: { 'Authorization': `Bearer ${user.token}` }
          });
          if (res.ok) {
            const orders = await res.json();
            setPendingAutoOrders(orders);
            
            // Si hay una orden nueva (id superior al último notificado)
            if (orders.length > 0) {
              const newestOrder = orders[0];
              if (newestOrder.id !== lastNotifiedOrderId) {
                playNotificationSound();
                setLastNotifiedOrderId(newestOrder.id);
                // Mostrar notificación especial
                showNotification(`¡NUEVO PEDIDO DE ${newestOrder.customerName || 'Cliente'}!`, 'info');
              }
            }
          }
        } catch (err) {
          console.error('Error polling auto-orders:', err);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user, lastNotifiedOrderId, showNotification]);

  const handleDeleteSupplier = async (id) => {
    if (!window.confirm('¿Eliminar este proveedor?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/suppliers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'x-user-role': user.role
        }
      });
      if (response.ok) {
        setSuppliers(suppliers.filter(s => s.id !== id));
        showNotification('Proveedor eliminado', 'success');
      } else {
        const errorData = await response.json();
        showNotification(`Error al eliminar proveedor: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('Error de conexión al eliminar proveedor:', error);
      showNotification('Error al eliminar proveedor', 'error');
    }
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const supplierData = Object.fromEntries(formData.entries());
    const method = editingSupplier ? 'PUT' : 'POST';
    const url = editingSupplier ? `${API_BASE_URL}/api/suppliers/${editingSupplier.id}` : `${API_BASE_URL}/api/suppliers`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
          'x-user-role': user.role
        },
        body: JSON.stringify(supplierData)
      });
      if (response.ok) {
        const saved = await response.json();
        if (editingSupplier) {
          setSuppliers(suppliers.map(s => s.id === saved.id ? saved : s));
        } else {
          setSuppliers([...suppliers, saved]);
        }
        setIsSupplierModalOpen(false);
        showNotification('Proveedor guardado', 'success');
      } else {
        const errorData = await response.json();
        showNotification(`Error al guardar proveedor: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('Error de conexión al guardar proveedor:', error);
      showNotification('Error al guardar proveedor', 'error');
    }
  };

  const updateAutoOrderStatus = async (id, status) => {
    if (!user || !user.token) return;
    try {
      await fetch(`${API_BASE_URL}/api/auto-orders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ status })
      });
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const loadAutoOrder = (order) => {
    if (!order || !order.items) return;
    
    let newCart = [];
    order.items.forEach(item => {
      const realProduct = products.find(p => p.id === item.id || p.id === Number(item.id));
      if (realProduct) {
        const existing = newCart.find(i => i.id === realProduct.id);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          newCart.push({ ...realProduct, quantity: item.quantity });
        }
      }
    });

    setCart(newCart);

    updateAutoOrderStatus(order.id, 'preparing');
    setCurrentAutoOrderId(order.id);
    showNotification(`Pedido de ${order.customerName || 'Cliente'} cargado`, 'success');
    // Remover de la lista local de pendientes para evitar duplicados visuales antes del próximo polling
    setPendingAutoOrders(prev => prev.filter(o => o.id !== order.id));
  };

  const handleRecordPurchase = async (purchaseData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
          'x-user-role': user.role
        },
        body: JSON.stringify(purchaseData)
      });
      if (response.ok) {
        const data = await response.json();
        showNotification(data.message, 'success');
        fetchProducts(); // Recargar stock
        setIsPurchaseModalOpen(false);
      } else {
        const errorData = await response.json();
        showNotification(`Error al registrar compra: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('Error de conexión al registrar compra:', error);
      showNotification('Error al registrar compra', 'error');
    }
  };
  // --- LÓGICA DE LOGIN ---
  const handleLogin = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        showNotification(errorData.message || 'Credenciales incorrectas.', 'error');
        return;
      }

      const { token, user: userData } = await response.json();
      setUser({ ...userData, token }); // Set user with data from backend (including role and token)

      // Navigate based on role
      if (userData.role === 'admin' || userData.role === 'inventory_manager') {
        setView('dashboard');
      } else if (userData.role === 'seller') {
        setView('pos');
      } else {
        setView('dashboard'); // Default fallback
      }

      showNotification(`Bienvenido, ${userData.name}!`);

    } catch (error) {
      console.error('Error durante el login:', error);
      showNotification('Error de conexión al servidor.', 'error');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
    setCart([]);
    setSales([]); // Limpiar ventas al cerrar sesión
  };

  // --- LÓGICA DE VENTAS (POS) ---
  const addToCart = (product) => {
    if (product.stock <= 0) {
      showNotification('¡Producto agotado!', 'error');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        // Verificar stock en carrito vs real
        if (existing.quantity >= product.stock) {
          showNotification('No hay más stock disponible', 'error');
          return prev;
        }
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    showNotification(`"${product.name}" añadido al carrito.`);
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        // Validar contra stock real
        const product = products.find(p => p.id === id);
        if (newQty > product.stock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const processSale = (paymentMethod, receivedAmount) => {
    if (cart.length === 0) return false;

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (paymentMethod === 'Efectivo' && receivedAmount < total) {
      showNotification('El monto recibido es menor que el total.', 'error');
      return false;
    }

    const transactionId = currentAutoOrderId ? currentAutoOrderId : invoiceNumber;
    const changeAmount = receivedAmount - total;
    const currentUtcDate = new Date().toISOString();

    // 1. Prepara los datos para la factura
    const receiptData = {
      id: transactionId,
      items: cart,
      total: total,
      paymentMethod: paymentMethod,
      receivedAmount: receivedAmount,
      changeAmount: changeAmount,
      date: currentUtcDate,
      seller: user.name,
    };

    // 2. Guarda los datos en el estado para el modal y ábrelo
    setCurrentReceiptData(receiptData);
    setIsReceiptModalOpen(true);


    // 3. Actualizar Stock Local
    const newProducts = products.map(p => {
      const cartItem = cart.find(c => c.id === p.id);
      if (cartItem) {
        return { ...p, stock: p.stock - cartItem.quantity };
      }
      return p;
    });
    setProducts(newProducts);

    // 4. Guardar Venta LOCALMENTE (Restaurado)
    setSales(prev => [...prev, receiptData]);

    // 5. Intentar Sync con Backend (Background)
    Promise.all(cart.map(item => {
      const saleData = {
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        transactionId: transactionId,
        paymentMethod,
        receivedAmount,
        changeAmount,
        date: currentUtcDate,
      };

      return fetch(`${API_BASE_URL}/api/record-sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      });
    })).then(async () => {
      fetchSales(); // Recargar historial después de sincronizar con el backend
      if (currentAutoOrderId) {
        await updateAutoOrderStatus(currentAutoOrderId, 'ready');
        setCurrentAutoOrderId(null);
      }
    }).catch(error => console.error('Error al registrar venta en backend:', error));

    setCart([]);
    if (currentAutoOrderId) {
      if (invoiceNumber <= currentAutoOrderId) {
        setInvoiceNumber(currentAutoOrderId + 1);
      }
    } else {
      setInvoiceNumber(prev => prev + 1);
    }
    setRefreshKey(prev => prev + 1); // Forzar recarga del resumen diario
    showNotification(`Venta #${transactionId} procesada!`);

    return true; // Indica que el proceso de venta se inició
  };

  // --- LÓGICA DE INVENTARIO ---
  const handleAddProduct = async (newProductData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
          'x-user-role': user.role
        },
        body: JSON.stringify(newProductData),
      });
      if (response.ok) {
        showNotification('Producto agregado correctamente', 'success');
        await fetchProducts(); // Recargar productos después de añadir
      } else {
        const errorData = await response.json();
        showNotification(`Error al agregar producto: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('Error de conexión al agregar producto:', error);
      showNotification('Error de conexión al agregar producto.', 'error');
    }
  };

  const handleEditProduct = async (updatedProductData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${updatedProductData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
          'x-user-role': user.role
        },
        body: JSON.stringify(updatedProductData),
      });
      if (response.ok) {
        showNotification('Producto actualizado con éxito', 'success');
        await fetchProducts(); // Recargar productos después de actualizar
      } else {
        const errorData = await response.json();
        showNotification(`Error al actualizar producto: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('Error de conexión al actualizar producto:', error);
      showNotification('Error de conexión al actualizar producto.', 'error');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
          'x-user-role': user.role
        },
      });
      if (response.ok) {
        showNotification('Producto eliminado', 'success');
        await fetchProducts(); // Recargar productos después de eliminar
      } else {
        const errorData = await response.json();
        showNotification(`Error al eliminar producto: ${errorData.message}`, 'error');
      }
    } catch (error) {
      console.error('Error de conexión al eliminar producto:', error);
      showNotification('Error de conexión al eliminar producto.', 'error');
    }
  };

  const handleShowReceipt = (sale) => {
    setCurrentReceiptData(sale);
    setIsReceiptModalOpen(true);
  };

  // --- LÓGICA DE CANCELACIÓN DE VENTA ---
  const handleCancelSale = async (transactionId) => {
    if (!window.confirm('¿Estás seguro de que quieres cancelar esta venta? Los productos serán devueltos al inventario.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/cancel-sale/${transactionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
          'x-user-role': user.role
        },
      });

      if (response.ok) {
        const { message } = await response.json(); // Backend only sends message
        showNotification(message, 'success');
        fetchProducts(); // Re-fetch products to update stock
        fetchSales(); // Re-fetch sales to update history
      } else {
        const { message } = await response.json();
        showNotification(message, 'error');
      }
    } catch (error) {
      console.error('Error al cancelar la venta:', error);
      showNotification('Error de conexión al cancelar la venta.', 'error');
    }
  };

  // --- MIGRACIÓN DE DATOS ---
  const handleMigration = async () => {
    if (!window.confirm('¿Estás seguro de migrar los productos de LocalStorage al servidor? Esto puede duplicar productos si ya existen.')) {
      return;
    }

    try {
      const localProducts = JSON.parse(localStorage.getItem('products') || '[]');
      if (localProducts.length === 0) {
        showNotification('No hay productos en LocalStorage para migrar.', 'info');
        return;
      }

      let migratedCount = 0;
      for (const p of localProducts) {
        // Adaptar campos si es necesario
        const productToDist = {
          name: p.name,
          price: p.price,
          stock: p.stock,
          category: p.category,
          manual_code: p.manual_code || generateUniqueManualCode(),
          image: p.image || null
        };

        await fetch(`${API_BASE_URL}/api/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`,
            'x-user-role': user.role
          },
          body: JSON.stringify(productToDist)
        });
        migratedCount++;
      }

      showNotification(`Se migraron ${migratedCount} productos exitosamente.`, 'success');
      await fetchProducts(); // Recargar productos del servidor

    } catch (error) {
      console.error("Error durante la migración:", error);
      showNotification("Error durante la migración.", 'error');
    }
  };

  if (isCustomerMode) {
    return <CustomerCatalog apiBaseUrl={API_BASE_URL} formatCurrency={formatCurrency} />;
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} notification={notification} />;
  }

  return (
    <div className="min-h-screen bg-violet-50 text-slate-900 transition-colors duration-300">
      <div className="flex bg-violet-600 shadow-sm border-b border-violet-700 h-16 sticky top-0 z-40 px-4 md:px-8 items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 -ml-2 text-white hover:bg-violet-500 rounded-lg lg:hidden transition-colors"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl overflow-hidden shadow-lg shadow-violet-500/30">
            <img src={logoImage} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-white whitespace-nowrap">
              Sistema Ventas
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">

          <div className="hidden md:flex items-center gap-3 pl-4 border-l border-violet-700 dark:border-slate-700">
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{user.name}</p>
              <p className="text-xs text-violet-200 capitalize">{user.role.replace('_', ' ')}</p>
            </div>
            <div className="w-10 h-10 bg-violet-500 rounded-full flex items-center justify-center text-white">
              <User size={20} />
            </div>
          </div>

          <button onClick={handleLogout} className="p-2 text-violet-200 hover:text-red-300 transition-colors" title="Cerrar Sesión">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-64px)] relative">
        {/* Backdrop for mobile */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 lg:w-64 bg-violet-700 border-r border-violet-800 
          flex-shrink-0 flex flex-col justify-between py-6
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${!isMobileMenuOpen && 'lg:w-20'}
        `}>
          <nav className="space-y-1 px-2">
            {(user.role === 'admin' || user.role === 'inventory_manager') && (
              <SidebarItem icon={<LayoutDashboard size={22} />} label="Panel Control" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }} />
            )}
            {(user.role === 'admin' || user.role === 'seller') && (
              <SidebarItem icon={<DollarSign size={22} />} label="Punto de Venta" active={view === 'pos'} onClick={() => { setView('pos'); setIsMobileMenuOpen(false); }} />
            )}
            {(user.role === 'admin' || user.role === 'inventory_manager') && (
              <>
                <SidebarItem icon={<Package size={20} />} label="Inventario" active={view === 'inventory'} onClick={() => { setView('inventory'); setIsMobileMenuOpen(false); }} />
                <SidebarItem icon={<Users size={20} />} label="Proveedores" active={view === 'suppliers'} onClick={() => { setView('suppliers'); setIsMobileMenuOpen(false); }} />
              </>
            )}
            {(user.role === 'admin' || user.role === 'seller') && <SidebarItem icon={<History size={20} />} label="Historial" active={view === 'history'} onClick={() => { setView('history'); setIsMobileMenuOpen(false); }} />}
            {(user.role === 'admin' || user.role === 'seller') && <SidebarItem icon={<ShieldCheck size={20} />} label="Cierre de Caja" active={view === 'cash-closing'} onClick={() => { setView('cash-closing'); setIsMobileMenuOpen(false); }} />}
            {(user.role === 'admin' || user.role === 'inventory_manager') && (
              <SidebarItem icon={<Banknote size={22} />} label="Flujo de Caja" active={view === 'cash_flow'} onClick={() => { setView('cash_flow'); setIsMobileMenuOpen(false); }} />
            )}
            {user.role === 'admin' && <SidebarItem icon={<Settings size={20} />} label="Configuración" active={view === 'settings'} onClick={() => { setView('settings'); setIsMobileMenuOpen(false); }} />}
            {user.role === 'admin' && (
              <SidebarItem icon={<Users size={22} />} label="Usuarios" active={view === 'users'} onClick={() => { setView('users'); setIsMobileMenuOpen(false); }} />
            )}
          </nav>

          <div className="px-6">
            <div className="bg-violet-600 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center text-white">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Estado Sistema</p>
                  <p className="text-[10px] text-violet-200">En Línea</p>
                </div>
              </div>
              <p className="text-xs text-violet-100 mt-2 leading-relaxed">
                Todas las conexiones estables.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Header / Topbar - Removed as it's now global above */}

          {/* Notification Toast */}
          {notification && (
            <div className={`fixed top-20 right-8 z-50 animate-in slide-in-from-right-10 fade-in duration-300 shadow-2xl rounded-xl p-4 flex items-center gap-3 border ${notification.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : notification.type === 'success' ? 'bg-green-50 border-green-100 text-green-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
              {notification.type === 'error' ? <AlertCircle size={20} /> : <Bell size={20} />}
              <div>
                <p className="font-bold text-sm">{notification.type === 'error' ? 'Error' : notification.type === 'success' ? 'Éxito' : 'Info'}</p>
                <p className="text-sm">{notification.msg}</p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-violet-100">
            {view === 'dashboard' && (user.role === 'admin' || user.role === 'inventory_manager') && (
              <DashboardView
                products={products}
                refreshKey={refreshKey}
                onSendReport={handleSendManualReport}
                onDownloadPDF={handleDownloadPDF}
                onPreviewPDF={handlePreviewPDF}
                user={user}
              />
            )}
            {view === 'pos' && (user.role === 'admin' || user.role === 'seller') && <POSView
              products={products}
              cart={cart}
              addToCart={addToCart}
              removeFromCart={removeFromCart}
              updateQuantity={updateQuantity}
              processSale={processSale}
              showNotification={showNotification}
              view={view}
              onOpenCheckout={() => setIsCheckoutModalOpen(true)}
              pendingAutoOrders={pendingAutoOrders}
              loadAutoOrder={loadAutoOrder}
            />}
            {view === 'inventory' && (user.role === 'admin' || user.role === 'inventory_manager') && (
              <InventoryView
                products={products}
                suppliers={suppliers}
                handleAddProduct={handleAddProduct}
                handleDeleteProduct={handleDeleteProduct}
                handleEditProduct={handleEditProduct}
                isEditModalOpen={isEditModalOpen}
                setIsEditModalOpen={setIsEditModalOpen}
                editingProduct={editingProduct}
                setEditingProduct={setEditingProduct}
                handleMigration={handleMigration}
                processImage={processImage}
              />
            )}
            {view === 'history' && (user.role === 'admin' || user.role === 'seller') && <HistoryView sales={sales} onCancelSale={handleCancelSale} onShowReceipt={handleShowReceipt} timeOffset={timeOffset} />}
            {view === 'suppliers' && (user.role === 'admin' || user.role === 'inventory_manager') && (
              <SuppliersView
                suppliers={suppliers}
                onAdd={() => { setEditingSupplier(null); setIsSupplierModalOpen(true); }}
                onEdit={(s) => { setEditingSupplier(s); setIsSupplierModalOpen(true); }}
                onDelete={handleDeleteSupplier}
                onPurchase={() => setIsPurchaseModalOpen(true)}
              />
            )}
            {view === 'cash-closing' && (user.role === 'admin' || user.role === 'seller') && <CashClosingView timeOffset={timeOffset} user={user} />}
            {view === 'cash_flow' && (user.role === 'admin' || user.role === 'inventory_manager') && <CashFlow timeOffset={timeOffset} user={user} />}
            {view === 'users' && user.role === 'admin' && <UserManagementView showNotification={showNotification} userRole={user.role} />}
            {view === 'settings' && user.role === 'admin' && (
              <SettingsView
                timeOffset={timeOffset}
                notificationPhone={notificationPhone}
                callmebotApiKey={callmebotApiKey}
                onUpdateSettings={updateSettings}
              />
            )}
            {showPdfPreview && (
              <PDFPreviewModal
                url={pdfUrl}
                isOpen={showPdfPreview}
                onClose={() => setShowPdfPreview(false)}
              />
            )}
          </div>
        </main>
      </div>


      <ReceiptPreviewModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receiptData={currentReceiptData}
        storeInfo={storeInfo}
        logoSrc={logoImage}
        timeOffset={timeOffset}
      />

      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        cartTotal={cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)}
        processSale={processSale}
        timeOffset={timeOffset}
      />

      {isSupplierModalOpen && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => setIsSupplierModalOpen(false)}
          onSave={handleSaveSupplier}
        />
      )}
      {isPurchaseModalOpen && (
        <PurchaseModal
          suppliers={suppliers}
          products={products}
          onClose={() => setIsPurchaseModalOpen(false)}
          onSave={handleRecordPurchase}
        />
      )}
      {/* Edit Modal (if needed here, but checking InventoryView first) */}
    </div >
  );
};

const ReceiptPreviewModal = ({ isOpen, onClose, receiptData, storeInfo, logoSrc, timeOffset }) => {
  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    const printContents = document.getElementById('receipt-content-modal').innerHTML;
    const originalContents = document.body.innerHTML;

    document.body.innerHTML = `<div class="print-container">${printContents}</div>`;

    // Agrega estilos específicos para impresión
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        .print-container {
          width: 300px; /* Ancho típico de ticket */
          margin: 0 auto;
        }
      }
    `;
    document.head.appendChild(style);

    window.print();

    document.head.removeChild(style);
    document.body.innerHTML = originalContents;
    window.location.reload(); // Se recarga para asegurar que el estado de React se reinicie limpiamente
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 print:hidden">
      <div className="bg-slate-100 rounded-xl shadow-2xl w-full max-w-sm p-6 m-4 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Factura Generada</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>

        <div className="bg-white p-2 shadow-lg">
          <div id="receipt-content-modal">
            <ReceiptContent sale={receiptData} storeInfo={storeInfo} formatCurrency={formatCurrency} logoSrc={logoSrc} timeOffset={timeOffset} />
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 border rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Printer size={18} /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};

const ReceiptContent = ({ sale, storeInfo, formatCurrency, logoSrc, timeOffset }) => {
  if (!sale) return null;

  const subtotal = sale.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = sale.total || subtotal; // Usa el total guardado o calcúlalo
  const change = sale.changeAmount >= 0 ? sale.changeAmount : (sale.receivedAmount - total);

  return (
    <div
      className="w-[300px] bg-white p-4 text-xs font-mono leading-tight text-black"
      style={{ fontFamily: "'Courier New', Courier, monospace" }}
    >
      <div className="text-center mb-2">
        <img src={logoSrc} alt="Logo" className="w-20 h-20 mx-auto" />
        {storeInfo.address.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
        <p>{storeInfo.city}</p>
        <p>{storeInfo.phone}</p>
      </div>

      <div className="mb-2 border-b border-black pb-2 border-dashed">
        <div className="flex justify-between">
          <span>Fecha: {formatDisplayDateTime(sale.date, { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
          <span>Hora: {formatDisplayDateTime(sale.date, { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex justify-between">
          <span>Ticket #: {String(sale.id || sale.transactionId).padStart(6, '0')}</span>
          <span>Caja: {sale.seller || "Caja 1"}</span>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex font-bold border-b border-black border-dashed pb-1 mb-1">
          <span className="w-8">CANT</span>
          <span className="flex-1 px-1">DESCRIPCION</span>
          <span className="w-16 text-right">TOTAL</span>
        </div>

        {sale.items.map((item, index) => (
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

        {sale.paymentMethod === 'Efectivo' && (
          <>
            <div className="flex justify-between mt-2 pt-2 border-t border-dotted border-gray-400">
              <span>Efectivo:</span>
              <span>{formatCurrency(sale.receivedAmount)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Cambio:</span>
              <span>{formatCurrency(change > 0 ? change : 0)}</span>
            </div>
          </>
        )}
        {sale.paymentMethod === 'Crédito' && (
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
        <p className="mb-2 font-bold text-[10px] uppercase">Ver estado del pedido</p>
        <div className="p-2 border border-black rounded-lg">
          <QRCodeCanvas 
            value={`${window.location.origin}${window.location.pathname}#catalog?statusId=${sale.id || sale.transactionId}`}
            size={80}
            level="H"
            includeMargin={false}
          />
        </div>
        <p className="mt-2 text-[8px] italic">#{sale.id || sale.transactionId}</p>
      </div>
    </div>
  );
}



const LoginView = ({ onLogin, notification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { // Simular latencia de red
      onLogin(email, password);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-violet-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-100 text-violet-700 mb-4">
            <ShoppingCart size={32} />
          </div>
          <h2 className="text-3xl font-bold text-slate-800">Bienvenido</h2>
          <p className="text-slate-500 mt-2">Sistema de Ventas Profesional</p>
        </div>

        {notification && (
          <div className="mb-6 p-3 rounded bg-red-50 text-red-600 text-sm flex items-center gap-2 border border-red-100">
            <AlertCircle size={16} /> {notification.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
              placeholder="ej. admin@tienda.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-semibold shadow-lg transition-all ${loading ? 'bg-violet-400 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-700 hover:shadow-violet-500/30'}`}
          >
            {loading ? 'Entrando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
          <p>Credenciales Demo:</p>
          <p>Admin: felix@tienda.com / felix</p>
          <p>Vendedor: vendedor@tienda.com / 123</p>
        </div>
      </div>
    </div>
  );
};

const SupplierModal = ({ supplier, onClose, onSave }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in duration-300">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-violet-50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-violet-800">{supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={onSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre Comercial</label>
              <input name="name" defaultValue={supplier?.name} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre de Contacto</label>
              <input name="contact_name" defaultValue={supplier?.contact_name} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Teléfono</label>
              <input name="phone" defaultValue={supplier?.phone} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
              <input name="email" type="email" defaultValue={supplier?.email} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Dirección</label>
              <textarea name="address" defaultValue={supplier?.address} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 h-20" />
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Cancelar</button>
            <button type="submit" className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 shadow-lg shadow-violet-200 transition-all">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PurchaseModal = ({ suppliers, products, onClose, onSave }) => {
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [purchaseItems, setPurchaseItems] = useState([]);
  const [notes, setNotes] = useState('');

  const addItem = () => {
    setPurchaseItems([...purchaseItems, { product_id: '', quantity: 1, cost_price: 0 }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...purchaseItems];
    newItems[index][field] = value;
    setPurchaseItems(newItems);
  };

  const removeItem = (index) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const total = purchaseItems.reduce((sum, item) => sum + (item.quantity * item.cost_price), 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in duration-300">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-emerald-800">Ingreso de Mercadería</h2>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Proveedor</label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">Seleccionar Proveedor</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Notas / Factura de Compra</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Ej: Factura #1234 - Productos de temporada"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-700">Productos Recibidos</h3>
              <button onClick={addItem} className="text-emerald-600 font-bold flex items-center gap-1 hover:underline">
                <Plus size={18} /> Agregar Fila
              </button>
            </div>

            <div className="space-y-3">
              {purchaseItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="col-span-5">
                    <label className="text-xs font-bold text-slate-400 mb-1 block">Producto</label>
                    <select
                      value={item.product_id}
                      onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="">Buscar Producto...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.stock} actuales)</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 mb-1 block">Cantidad</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs font-bold text-slate-400 mb-1 block">Costo Unitario</label>
                    <input
                      type="number"
                      value={item.cost_price}
                      onChange={(e) => updateItem(index, 'cost_price', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <button onClick={() => removeItem(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {purchaseItems.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                  Agregue productos a esta compra
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50 rounded-b-2xl">
          <div className="text-slate-600">
            Total de Compra: <span className="text-2xl font-black text-slate-800">{formatCurrency(total)}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all">Cancelar</button>
            <button
              onClick={() => onSave({ supplier_id: selectedSupplier, items: purchaseItems, notes })}
              disabled={!selectedSupplier || purchaseItems.length === 0}
              className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
            >
              Completar Ingreso
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
const DailySummary = ({ refreshKey, user }) => {
  const [summary, setSummary] = useState({ totalSales: 0, salesCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!user || !user.token) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/daily-summary`, {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'x-user-role': user.role
          }
        });
        const data = await response.json();
        setSummary(data);
      } catch (error) {
        console.error("Error fetching daily summary:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, [refreshKey, user]);

  if (isLoading) return <div className="p-4 rounded-xl bg-slate-100 animate-pulse" style={{ height: '96px' }} />;

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-lg overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-10">
        <DollarSign size={80} />
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
        <div>
          <p className="text-violet-200 text-sm font-medium">Ventas Totales de Hoy</p>
          <p className="text-3xl sm:text-4xl font-black text-white">{formatCurrency(summary.totalSales)}</p>
        </div>
        <div className="sm:text-right">
          <p className="text-violet-200 text-sm font-medium">Transacciones</p>
          <p className="text-3xl sm:text-4xl font-black text-white">{summary.salesCount}</p>
        </div>
      </div>
    </div>
  );
};
const PDFPreviewModal = ({ url, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Vista Previa de Reporte</h3>
              <p className="text-xs text-slate-500">Revisa la información antes de imprimir o descargar</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = url;
                link.download = `Reporte_Ventas_${new Date().toISOString().split('T')[0]}.pdf`;
                link.click();
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all"
            >
              <Download size={16} /> Descargar
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-slate-100 p-4">
          <iframe
            src={`${url}#toolbar=0`}
            className="w-full h-full rounded-lg border shadow-inner bg-white"
            title="PDF Preview"
          />
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({ products, refreshKey, onSendReport, onDownloadPDF, onPreviewPDF, user }) => {
  const [chartData, setChartData] = useState({ salesTrend: [], salesByCategory: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      if (!user || !user.token) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard-charts`, {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'x-user-role': user.role
          }
        });
        if (response.ok) {
          const data = await response.json();
          setChartData(data);
        }
      } catch (error) {
        console.error("Error fetching chart data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChartData();
  }, [user]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Panel de Control</h2>
          <p className="text-slate-500 text-sm">Resumen de actividad en tiempo real</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          <button
            onClick={onPreviewPDF}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
          >
            <Eye size={16} /> <span className="hidden sm:inline">Vista Previa</span><span className="sm:hidden">PDF</span>
          </button>
          <button
            onClick={onDownloadPDF}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-600 text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-slate-700 transition-all shadow-md shadow-slate-200"
          >
            <FileText size={16} /> <span className="hidden sm:inline">Descargar PDF</span><span className="sm:hidden">Bajar</span>
          </button>
          <button
            onClick={onSendReport}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
          >
            <Send size={16} /> <span className="hidden sm:inline">Enviar Reporte</span><span className="sm:hidden">Enviar</span>
          </button>
        </div>
      </div>

      {/* Resumen Diario */}
      <DailySummary refreshKey={refreshKey} user={user} />

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Tendencia de Ventas (Últimos 7 días) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[400px]">
          <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-violet-500" /> Tendencia de Ventas (7 días)
          </h3>
          <div className="flex-1 w-full">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400">Cargando datos...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={chartData.salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(str) => {
                    const d = new Date(str + 'T00:00:00');
                    return d.toLocaleDateString(undefined, { weekday: 'short' });
                  }} />
                  <YAxis />
                  <Tooltip labelFormatter={(label) => {
                    const d = new Date(label + 'T00:00:00');
                    return d.toLocaleDateString();
                  }} formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} name="Ventas" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico de Ventas por Categoría */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[400px]">
          <h3 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
            <Package size={20} className="text-violet-500" /> Distribución por Categoría
          </h3>
          <div className="flex-1 w-full">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400">Cargando datos...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={chartData.salesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.salesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Productos con Bajo Stock */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              <AlertCircle size={20} className="text-orange-500" /> Stock Bajo
            </h3>
            <span className="text-xs font-medium px-2 py-1 bg-orange-100 text-orange-700 rounded-full">Atención requerida</span>
          </div>
          <div className="space-y-3">
            {products.filter(p => p.stock < 10).slice(0, 5).map(p => (
              <div key={p.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200">
                    {p.image ? <img src={p.image} className="w-full h-full object-cover" alt={p.name} /> : <span className="text-slate-400 font-bold">!</span>}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500">Stock actual: <span className="text-red-600 font-bold">{p.stock}</span></p>
                  </div>
                </div>
                <button className="text-violet-600 hover:text-violet-800 text-sm font-medium">Reabastecer</button>
              </div>
            ))}
            {products.filter(p => p.stock < 10).length === 0 && (
              <p className="text-slate-500 text-center py-4">Todo el inventario está saludable.</p>
            )}
          </div>
        </div>

        {/* Productos Más Vendidos (Simulado para Demo Visual) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-500" /> Más Vendidos
          </h3>
          <div className="space-y-4">
            {products.slice(0, 5).map((p, i) => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-slate-500">{i + 1}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{p.name}</span>
                </div>
                <span className="text-sm text-slate-500">{p.stock} unid. restantes</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-between text-sm border-b border-slate-100 pb-2">
        <span>Valor Inventario</span>
        <span className="font-mono font-bold">{formatCurrency(products.reduce((a, b) => a + (b.price * b.stock), 0))}</span>
      </div>
      <div className="flex justify-between text-sm pt-1">
        <span className="text-slate-500">Usuarios Activos en Sistema</span>
        <span className="font-mono font-bold text-slate-700">2</span>
      </div>
    </div>
  );
};

const POSView = ({ products, cart, addToCart, removeFromCart, updateQuantity, processSale, showNotification, view, onOpenCheckout, pendingAutoOrders, loadAutoOrder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [quickCodeInput, setQuickCodeInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1); // Estado para el índice seleccionado en la búsqueda de productos
  const [selectedCartItemIndex, setSelectedCartItemIndex] = useState(-1); // Nuevo estado para el índice seleccionado en el carrito
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const searchInputRef = useRef(null); // Ref para el campo de búsqueda

  useEffect(() => {
    if (searchInputRef.current && !isScannerOpen) {
      searchInputRef.current.focus(); // Enfocar el campo de búsqueda al montar el componente (y al cerrar escaner)
    }
  }, [isScannerOpen]);

  const categories = ['Todos', ...new Set(products.map(p => p.category))];

  const filteredProducts = useMemo(() => {
    const productsFiltered = products.filter(p =>
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.manual_code && p.manual_code.includes(searchTerm))) &&
      (selectedCategory === 'Todos' || p.category === selectedCategory)
    );
    // Reiniciar selectedProductIndex si los productos filtrados cambian y el índice actual es inválido
    if (selectedProductIndex >= productsFiltered.length) {
      setSelectedProductIndex(productsFiltered.length > 0 ? 0 : -1);
    } else if (selectedProductIndex === -1 && productsFiltered.length > 0) {
      setSelectedProductIndex(0); // Seleccionar el primero por defecto si no hay nada seleccionado
    } else if (productsFiltered.length === 0) {
      setSelectedProductIndex(-1);
    }
    return productsFiltered;
  }, [products, searchTerm, selectedCategory, selectedProductIndex]);

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleOpenCheckout = useCallback(() => {
    if (cart.length > 0) {
      setIsCheckoutOpen(true);
    }
  }, [cart.length]);

  const handleQuickCodeEntry = (e) => {
    if (e.key === 'Enter' && quickCodeInput.trim() !== '') {
      e.preventDefault();
      const product = products.find(p => p.manual_code === quickCodeInput.trim());
      if (product) {
        addToCart(product);
        setQuickCodeInput('');
        setSelectedCartItemIndex(-1); // Deseleccionar ítem del carrito al añadir nuevo producto
      } else {
        showNotification('Producto no encontrado con ese código rápido.', 'error');
        setQuickCodeInput('');
      }
    }
  };

  const handleScan = (decodedText) => {
    setIsScannerOpen(false);
    const exactMatch = products.find(p => p.manual_code === decodedText);
    if (exactMatch) {
      addToCart(exactMatch);
    } else {
      showNotification(`Producto no registrado: ${decodedText}`, 'error');
    }
  };

  // Manejador de teclado extendido para la búsqueda de productos
  const handleSearchKeyDown = (e) => {
    if (filteredProducts.length === 0) {
      setSelectedProductIndex(-1);
      return;
    }

    const productsPerRow = 4; // Asumiendo 4 columnas para xl:grid-cols-4

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedProductIndex(prevIndex =>
        Math.min(prevIndex + productsPerRow, filteredProducts.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedProductIndex(prevIndex =>
        Math.max(prevIndex - productsPerRow, 0)
      );
    } else if (e.key === 'ArrowRight') { // Navegación horizontal
      e.preventDefault();
      setSelectedProductIndex(prevIndex =>
        Math.min(prevIndex + 1, filteredProducts.length - 1)
      );
    } else if (e.key === 'ArrowLeft') { // Navegación horizontal
      e.preventDefault();
      setSelectedProductIndex(prevIndex =>
        Math.max(prevIndex - 1, 0)
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedProductIndex !== -1) {
        addToCart(filteredProducts[selectedProductIndex]);
        setSearchTerm('');
        setSelectedProductIndex(-1);
        searchInputRef.current?.focus();
        setSelectedCartItemIndex(-1); // Deseleccionar ítem del carrito al añadir nuevo producto
      }
    } else if (e.key === 'Tab') { // Manejar Tab para mover el foco al carrito
      e.preventDefault();
      if (cart.length > 0) {
        setSelectedCartItemIndex(0); // Seleccionar el primer ítem del carrito
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '*') {
        e.preventDefault();
        handleOpenCheckout();
      }

      if (view === 'pos' && cart.length > 0) {
        if (e.key === 'ArrowDown' && selectedCartItemIndex < cart.length - 1) {
          e.preventDefault();
          setSelectedCartItemIndex(prevIndex => prevIndex + 1);
        } else if (e.key === 'ArrowUp' && selectedCartItemIndex > 0) {
          e.preventDefault();
          setSelectedCartItemIndex(prevIndex => prevIndex - 1);
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCartItemIndex !== -1) {
          e.preventDefault();
          const itemToRemove = cart[selectedCartItemIndex];
          removeFromCart(itemToRemove.id);
          // Ajustar el índice después de eliminar
          if (cart.length === 1) { // Si era el último ítem
            setSelectedCartItemIndex(-1);
          } else if (selectedCartItemIndex === cart.length - 1) { // Si era el último de la lista y quedan más
            setSelectedCartItemIndex(prevIndex => prevIndex - 1);
          }
          // En caso contrario, el mismo índice apuntará al siguiente elemento
        } else if (selectedCartItemIndex !== -1) { // Ajuste de cantidad para ítem seleccionado en carrito
          if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            updateQuantity(cart[selectedCartItemIndex].id, 1);
          } else if (e.key === '-') {
            e.preventDefault();
            updateQuantity(cart[selectedCartItemIndex].id, -1);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleOpenCheckout, view, cart, updateQuantity, removeFromCart, selectedCartItemIndex]);

  // Resetear selectedCartItemIndex si el carrito se vacía
  useEffect(() => {
    if (cart.length === 0) {
      setSelectedCartItemIndex(-1);
    }
  }, [cart.length]);

  return (
    <div className="flex flex-col h-full gap-4 md:flex-row md:gap-8 animate-in fade-in">
      {/* Panel Izquierdo: Selección de Productos */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* SECCIÓN DE PEDIDOS PENDIENTES (QR) */}
        {pendingAutoOrders && pendingAutoOrders.length > 0 && (
          <div className="p-4 bg-indigo-50 border-b border-indigo-100 animate-in slide-in-from-top-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-lg">
                  <Bell size={16} className="animate-bounce" />
                </div>
                <h3 className="font-black text-indigo-900 text-xs">PEDIDOS QR PENDIENTES</h3>
              </div>
              <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{pendingAutoOrders.length}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {pendingAutoOrders.map(order => (
                <div key={order.id} className="min-w-[200px] bg-white p-3 rounded-xl border border-indigo-100 shadow-sm flex flex-col">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-slate-400">#{order.id}</span>
                    <span className="text-[10px] font-bold text-indigo-600 truncate max-w-[100px]">{order.customerName || 'Cliente'}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mb-1">{order.items.length} prod. • {formatCurrency(order.total)}</p>
                  {order.note && <p className="text-[9px] text-indigo-700 bg-indigo-50 p-1 rounded mb-1 italic">"{order.note}"</p>}
                  {order.payWith && <p className="text-[9px] font-bold text-emerald-600 mb-2">Paga con: {formatCurrency(order.payWith)}</p>}
                  <button 
                    onClick={() => loadAutoOrder(order)}
                    className="w-full py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-1"
                  >
                    <ShoppingCart size={12} /> Cargar al carrito
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Header del POS */}
        <div className="p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar producto..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (filteredProducts.length > 0) {
                        addToCart(filteredProducts[0]);
                        setSearchTerm('');
                      } else if (filteredProducts.length === 0 && searchTerm) {
                        const exactMatch = products.find(p => p.manual_code === searchTerm);
                        if (exactMatch) {
                          addToCart(exactMatch);
                          setSearchTerm('');
                        } else {
                          showNotification('Producto no encontrado', 'error');
                        }
                      }
                    }
                  }}
                />
              </div>
              <button
                onClick={() => setIsScannerOpen(true)}
                className="px-4 py-3 bg-violet-100 text-violet-600 rounded-xl hover:bg-violet-200 transition-colors flex items-center justify-center shadow-sm"
                title="Escanear Código de Barras"
              >
                <ScanLine size={24} />
              </button>
            </div>
            <select
              className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-violet-500 outline-none cursor-pointer"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Productos (Grid) */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product, index) => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`bg-white p-4 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-all border ${selectedProductIndex === index ? 'border-2 border-violet-500 ring-2 ring-violet-200' : 'border-slate-200 hover:border-violet-300'}`}
                >
                  <div className="aspect-square bg-slate-100 rounded-lg mb-3 overflow-hidden flex items-center justify-center relative">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="text-slate-300" size={40} />
                    )}
                    <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded-md text-xs font-bold text-violet-600 shadow-sm">
                      {product.stock}
                    </div>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm line-clamp-2 md:line-clamp-1 mb-1" title={product.name}>{product.name}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 truncate max-w-[60px]">Stock: {product.stock}</span>
                    <span className="font-bold text-violet-600">{formatCurrency(product.price)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Search size={48} className="mb-4 opacity-50" />
              <p>No se encontraron productos</p>
            </div>
          )}
        </div>
      </div>

      {/* Panel Derecho: Carrito / Checkout */}
      <div className={`w-full md:w-96 bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col ${isCheckoutOpen ? 'fixed inset-0 z-50 md:relative md:inset-auto' : 'hidden md:flex'}`}>
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-violet-50 rounded-t-xl">
          <h2 className="font-bold text-violet-700 flex items-center gap-2">
            <ShoppingCart size={20} /> Carrito Actual
          </h2>
          {isCheckoutOpen && (
            <button onClick={() => setIsCheckoutOpen(false)} className="md:hidden p-2 hover:bg-slate-200 rounded-full">
              <X size={20} />
            </button>
          )}
          <span className="bg-violet-100 text-violet-600 px-2 py-1 rounded-full text-xs font-bold">
            {cart.reduce((a, b) => a + b.quantity, 0)} items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-violet-50">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center">
                <ShoppingCart size={32} className="opacity-50" />
              </div>
              <p>El carrito está vacío</p>
              <p className="text-xs text-center max-w-[200px]">Selecciona productos del inventario para comenzar una venta.</p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={item.id} className={`flex items-center gap-3 bg-white p-3 rounded-lg border shadow-sm ${selectedCartItemIndex === index ? 'border-violet-500' : 'border-slate-100'}`}>
                <div className="w-12 h-12 bg-violet-100 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <Package size={20} className="text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                  <p className="text-xs text-violet-600 font-medium">{formatCurrency(item.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-violet-100 rounded text-slate-500">
                    <LogOut className="rotate-180" size={14} />
                  </button>
                  <span className="w-4 text-center text-sm font-bold">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-violet-100 rounded text-slate-500">
                    <Plus size={14} />
                  </button>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-slate-500 text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(cartTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-sm">
              <span>Impuestos (0%)</span>
              <span>{formatCurrency(0)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-slate-800 pt-2 border-t border-slate-100">
              <span>Total a Pagar</span>
              <span className="text-violet-600">{formatCurrency(cartTotal)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button onClick={onOpenCheckout} className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm shadow-green-200" disabled={cart.length === 0}>
              <Banknote size={20} /> Efectivo
            </button>
            <button onClick={() => processSale('Tarjeta', 0)} className="bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm shadow-violet-200" disabled={cart.length === 0}>
              <CreditCard size={20} /> Tarjeta
            </button>
          </div>

          <button onClick={() => setIsCheckoutOpen(false)} className="md:hidden w-full py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-medium">
            Seguir Comprando
          </button>
        </div>
      </div>

      {/* Botón Flotante Ver Carrito (Móvil) */}
      {!isCheckoutOpen && cart.length > 0 && (
        <button
          onClick={() => setIsCheckoutOpen(true)}
          className="md:hidden fixed bottom-6 right-6 bg-violet-600 text-white p-4 rounded-full shadow-xl z-40 animate-bounce flex items-center gap-2"
        >
          <ShoppingCart size={24} />
          <span className="font-bold">{cart.length}</span>
        </button>
      )}

      {isScannerOpen && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
};


const CheckoutModal = ({ isOpen, onClose, cartTotal, processSale, timeOffset }) => {
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [receivedAmount, setReceivedAmount] = useState(0);

  const change = useMemo(() => {
    if (paymentMethod === 'Efectivo') {
      return receivedAmount - cartTotal;
    }
    return 0;
  }, [receivedAmount, cartTotal, paymentMethod]);

  const handleProcessSale = useCallback(() => {
    const success = processSale(paymentMethod, receivedAmount, timeOffset);
    if (success) {
      onClose();
      setReceivedAmount(0);
    }
  }, [processSale, paymentMethod, receivedAmount, onClose, timeOffset]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        handleProcessSale();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleProcessSale]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Finalizar Venta</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X /></button>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="flex justify-between items-center text-2xl font-bold">
              <span className="text-slate-500">Total:</span>
              <span className="text-emerald-600">{formatCurrency(cartTotal)}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Método de Pago</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPaymentMethod('Efectivo')}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-colors ${paymentMethod === 'Efectivo' ? 'bg-violet-50 border-violet-500' : 'border-slate-300'}`}
              >
                <Banknote size={20} /> Efectivo
              </button>
              <button
                onClick={() => setPaymentMethod('Crédito')}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-colors ${paymentMethod === 'Crédito' ? 'bg-violet-50 border-violet-500' : 'border-slate-300'}`}
              >
                <CreditCard size={20} /> Crédito
              </button>
            </div>
          </div>

          {paymentMethod === 'Efectivo' && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="text-sm font-medium text-slate-700">Monto Recibido</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">C$</span>
                  <input
                    type="number"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(parseFloat(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-3 pl-10 text-right text-lg font-mono focus:ring-2 focus:ring-violet-500 outline-none"
                  />
                </div>
              </div>
              {change >= 0 && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">
                  <p className="text-slate-500">Cambio a entregar:</p>
                  <p className="text-3xl font-bold text-emerald-600">{formatCurrency(change)}</p>
                </div>
              )}
            </div>
          )}

          {paymentMethod === 'Crédito' && (
            <div className="p-4 rounded-lg bg-amber-100 text-amber-600 border border-amber-200 text-center animate-in fade-in">
              <p className="font-bold">Venta al crédito</p>
              <p className="text-sm opacity-80">El total se registrará como una cuenta por cobrar.</p>
            </div>
          )}

          <button
            onClick={handleProcessSale}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex justify-center items-center gap-2 ${paymentMethod === 'Efectivo' && change < 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-500/30'}`}
            disabled={paymentMethod === 'Efectivo' && change < 0}
          >
            <DollarSign size={20} />
            CONFIRMAR VENTA
          </button>
        </div>
      </div>
    </div>
  );
};

const InventoryView = ({
  products,
  suppliers,
  handleAddProduct,
  handleDeleteProduct,
  handleEditProduct,
  isEditModalOpen,
  setIsEditModalOpen,
  editingProduct,
  setEditingProduct,
  handleMigration,
  processImage
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProd, setNewProd] = useState({ name: '', price: '', stock: '', category: 'General', classification: 'B', manual_code: '', image: null, supplier_id: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState(''); // 'add' or 'edit'

  const handleScan = (decodedText) => {
    setIsScannerOpen(false);
    if (scannerTarget === 'add') {
      setNewProd({ ...newProd, manual_code: decodedText });
    } else if (scannerTarget === 'edit') {
      setEditingProduct({ ...editingProduct, manual_code: decodedText });
    }
  };

  const handleFile = async (file, isEdit = false) => {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const base64 = await processImage(file);
      if (isEdit) {
        setEditingProduct({ ...editingProduct, image: base64 });
      } else {
        setNewProd({ ...newProd, image: base64 });
      }
    } catch (error) {
      console.error("Error processing image", error);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e, isEdit = false) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file, isEdit);
  };

  const handleImageChange = async (e, isEdit = false) => {
    const file = e.target.files[0];
    if (file) handleFile(file, isEdit);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditingProduct(null);
    setIsEditModalOpen(false);
  };

  const handleUpdateProduct = (e) => {
    e.preventDefault();
    handleEditProduct({
      ...editingProduct,
      price: parseFloat(editingProduct.price),
      stock: parseInt(editingProduct.stock),
      manual_code: editingProduct.manual_code || '' // Ensure manual_code is passed
    });
    handleCloseEditModal();
  };

  const handleOpenAddModal = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/next-manual-code`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        const { nextCode } = await response.json();
        setNewProd({ ...newProd, manual_code: nextCode });
      }
    } catch (error) {
      console.error("Error fetching next manual code:", error);
    }
    setIsModalOpen(true);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleAddProduct({
      ...newProd,
      price: parseFloat(newProd.price),
      stock: parseInt(newProd.stock),
    });
    setIsModalOpen(false);
    setNewProd({ name: '', price: '', stock: '', category: 'General', classification: 'B', manual_code: '', image: null, supplier_id: '' });
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.manual_code && p.manual_code.includes(searchTerm))
  );

  return (
    <div className="animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Inventario</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar producto..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={handleMigration}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-600 transition-colors shadow-sm"
            title="Migrar productos de LocalStorage al Servidor"
          >
            <ArrowRightLeft size={18} /> Migrar
          </button>
          <button
            onClick={handleOpenAddModal}
            className="bg-violet-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-violet-700 transition-colors shadow-sm"
          >
            <Plus size={18} /> Nuevo Producto
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Img</th>
                <th className="px-6 py-4 font-semibold">Producto</th>
                <th className="px-6 py-4 font-semibold">Código Rápido</th>
                <th className="px-6 py-4 font-semibold">Categoría</th>
                <th className="px-6 py-4 font-semibold">Precio</th>
                <th className="px-6 py-4 font-semibold">Stock</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-10 h-10 object-cover rounded-md border border-slate-200" />
                    ) : (
                      <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center text-slate-400">
                        <Package size={16} />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800">{product.name}</td>
                  <td className="px-6 py-4 font-mono text-slate-700">{product.manual_code}</td>
                  <td className="px-6 py-4">
                    <span className="inline-block bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-violet-600">{formatCurrency(product.price)}</td>
                  <td className="px-6 py-4">
                    <span className={`font-semibold ${product.stock < 10 ? 'text-red-500' : 'text-slate-600'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => handleOpenEditModal(product)}
                        className="text-slate-400 hover:text-violet-500 transition-colors"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Agregar Producto */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4">Agregar Producto</h3>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Nombre</label>
                <input required className="w-full border rounded-lg px-3 py-2 mt-1" value={newProd.name} onChange={e => setNewProd({ ...newProd, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Código Rápido (Opcional)</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    className="flex-1 border rounded-lg px-3 py-2 font-mono"
                    value={newProd.manual_code}
                    onChange={e => setNewProd({ ...newProd, manual_code: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => { setScannerTarget('add'); setIsScannerOpen(true); }}
                    className="px-3 py-2 bg-violet-100 text-violet-600 rounded-lg hover:bg-violet-200 transition-colors"
                  >
                    <ScanLine size={20} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Precio (C$)</label>
                  <input type="number" step="0.5" required className="w-full border rounded-lg px-3 py-2 mt-1" value={newProd.price} onChange={e => setNewProd({ ...newProd, price: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Stock Inicial</label>
                  <input type="number" required className="w-full border rounded-lg px-3 py-2 mt-1" value={newProd.stock} onChange={e => setNewProd({ ...newProd, stock: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Categoría</label>
                  <select className="w-full border rounded-lg px-3 py-2 mt-1" value={newProd.category} onChange={e => setNewProd({ ...newProd, category: e.target.value })}>
                    <option>General</option>
                    <option>Bebidas</option>
                    <option>Granos</option>
                    <option>Abarrotes</option>
                    <option>Servicios</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Proveedor</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    value={newProd.supplier_id}
                    onChange={e => setNewProd({ ...newProd, supplier_id: e.target.value })}
                  >
                    <option value="">Sin proveedor</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium text-slate-700">Imagen del Producto</label>
                  <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, false)}
                    className={`mt-1 relative border-2 border-dashed rounded-xl p-4 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${isDragging ? 'border-violet-500 bg-violet-50' : 'border-slate-300 hover:border-violet-400 bg-slate-50'}`}
                    onClick={() => document.getElementById('new-prod-image').click()}
                  >
                    <input
                      id="new-prod-image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageChange(e, false)}
                    />
                    {newProd.image ? (
                      <div className="relative group">
                        <img src={newProd.image} alt="Preview" className="h-24 w-24 object-cover rounded-lg border border-slate-200" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <Plus className="text-white" size={20} />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="mx-auto text-slate-400 mb-1" size={24} />
                        <p className="text-[10px] text-slate-500">Arrastra o haz clic</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium text-slate-700">Clasificación</label>
                  <select required className="w-full border rounded-lg px-3 py-2 mt-1" value={newProd.classification} onChange={e => setNewProd({ ...newProd, classification: e.target.value })}>
                    <option value="B">Tipo B (Medio)</option>
                    <option value="A">Tipo A (Diario)</option>
                    <option value="C">Tipo C (Ocasional)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border rounded-lg hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Editar Producto */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4">Editar Producto</h3>
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Nombre</label>
                <input required className="w-full border rounded-lg px-3 py-2 mt-1" value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Código Rápido</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    className="flex-1 border rounded-lg px-3 py-2 font-mono"
                    value={editingProduct.manual_code || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, manual_code: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => { setScannerTarget('edit'); setIsScannerOpen(true); }}
                    className="px-3 py-2 bg-violet-100 text-violet-600 rounded-lg hover:bg-violet-200 transition-colors"
                  >
                    <ScanLine size={20} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Precio (C$)</label>
                  <input type="number" step="0.5" required className="w-full border rounded-lg px-3 py-2 mt-1" value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Stock</label>
                  <input type="number" required className="w-full border rounded-lg px-3 py-2 mt-1" value={editingProduct.stock} onChange={e => setEditingProduct({ ...editingProduct, stock: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Categoría</label>
                  <select className="w-full border rounded-lg px-3 py-2 mt-1" value={editingProduct.category} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}>
                    <option>General</option>
                    <option>Bebidas</option>
                    <option>Granos</option>
                    <option>Abarrotes</option>
                    <option>Servicios</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Proveedor</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    value={editingProduct.supplier_id || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, supplier_id: e.target.value })}
                  >
                    <option value="">Sin proveedor</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium text-slate-700">Imagen del Producto</label>
                  <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, true)}
                    className={`mt-1 relative border-2 border-dashed rounded-xl p-4 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${isDragging ? 'border-violet-500 bg-violet-50' : 'border-slate-300 hover:border-violet-400 bg-slate-50'}`}
                    onClick={() => document.getElementById('edit-prod-image').click()}
                  >
                    <input
                      id="edit-prod-image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageChange(e, true)}
                    />
                    {editingProduct.image ? (
                      <div className="relative group">
                        <img src={editingProduct.image} alt="Preview" className="h-24 w-24 object-cover rounded-lg border border-slate-200" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <Pencil className="text-white" size={20} />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="mx-auto text-slate-400 mb-1" size={24} />
                        <p className="text-[10px] text-slate-500">Arrastra o haz clic</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium text-slate-700">Clasificación</label>
                  <select required className="w-full border rounded-lg px-3 py-2 mt-1" value={editingProduct.classification || 'B'} onChange={e => setEditingProduct({ ...editingProduct, classification: e.target.value })}>
                    <option value="B">Tipo B (Medio)</option>
                    <option value="A">Tipo A (Diario)</option>
                    <option value="C">Tipo C (Ocasional)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={handleCloseEditModal} className="flex-1 py-2 border rounded-lg hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isScannerOpen && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
};

const HistoryView = ({ sales, onCancelSale, onShowReceipt, timeOffset }) => {
  const [expandedSaleId, setExpandedSaleId] = useState(null);

  const formatDisplayDateString = (dateStr) => {
    return formatDisplayDateTime(dateStr, {}, timeOffset);
  };

  const groupedSales = useMemo(() => {
    const salesMap = new Map();
    sales.forEach(item => {
      const groupKey = `${item.transactionId}-${item.date}`;
      if (!salesMap.has(groupKey)) {
        salesMap.set(groupKey, {
          id: groupKey, // Usamos esta clave compuesta para UI expasion
          transactionId: item.transactionId, // Conservar ID real de la venta
          date: item.date,
          seller: item.seller || "Vendedor por Defecto", // Asumir vendedor si no viene del backend por transacción
          paymentMethod: item.paymentMethod, // Tomar del primer item
          receivedAmount: item.receivedAmount, // Tomar del primer item
          change: item.changeAmount, // Tomar del primer item
          items: [],
          total: 0,
        });
      }
      const transaction = salesMap.get(groupKey);
      transaction.items.push(item);
      transaction.total += item.price * item.quantity;
      salesMap.set(groupKey, transaction);
    });
    // Convertir el mapa a un array y ordenar por fecha
    return Array.from(salesMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [sales]);

  const toggleSaleDetails = (id) => {
    setExpandedSaleId(expandedSaleId === id ? null : id);
  };

  return (
    <div className="animate-in fade-in">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Historial de Ventas</h2>
      <div className="space-y-4">
        {groupedSales.map((sale, index) => ( // Iterar sobre las ventas agrupadas
          <div key={`${sale.id}-${index}`} className="bg-white rounded-xl shadow-sm border border-slate-200 transition-all duration-300">
            <div
              className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 cursor-pointer"
              onClick={() => toggleSaleDetails(sale.id)}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-violet-50 text-violet-600 rounded-lg">
                  <DollarSign size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Factura #{String(sale.transactionId || sale.id).padStart(5, '0')}</p>
                  <p className="text-sm text-slate-500">{formatDisplayDateString(sale.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Vendedor</p>
                  <p className="text-sm font-medium text-slate-700">{sale.seller}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Pago</p>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${sale.paymentMethod === 'Crédito' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-700'}`}>
                    {sale.paymentMethod}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(sale.total)}</p>
                </div>
                <ChevronDown
                  className={`text-slate-400 transition-transform duration-300 ${expandedSaleId === sale.id ? 'rotate-180' : ''}`}
                  size={20}
                />
              </div>
            </div>

            {/* Detalles de la venta (expandible) */}
            {expandedSaleId === sale.id && (
              <div className="border-t border-slate-200 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <h4 className="font-semibold text-slate-600 mb-3">Detalles de la Factura: #{String(sale.transactionId || sale.id).padStart(5, '0')}</h4>
                <div className="bg-slate-50 rounded-lg border border-slate-100">
                  <table className="w-full text-sm text-left">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="p-3 font-normal">Producto</th>
                        <th className="p-3 font-normal text-center">Cantidad</th>
                        <th className="p-3 font-normal text-right">Precio Unit.</th>
                        <th className="p-3 font-normal text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sale.items.map((item, idx) => (
                        <tr key={`${item.id}-${idx}`} className="border-b border-slate-100 last:border-none">
                          <td className="p-3">{item.productName}</td>
                          <td className="p-3 text-center">{item.quantity}</td>
                          <td className="p-3 text-right font-mono">{formatCurrency(item.price)}</td>
                          <td className="p-3 text-right font-mono">{formatCurrency(item.price * item.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {sale.paymentMethod === 'Efectivo' && (
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-500">Total</p>
                      <p className="font-mono font-semibold">{formatCurrency(sale.total)}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-500">Recibido</p>
                      <p className="font-mono font-semibold">{formatCurrency(sale.receivedAmount)}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-500">Cambio</p>
                      <p className="font-mono font-semibold">{formatCurrency(sale.change)}</p>
                    </div>
                  </div>
                )}
                
                {/* QR para seguimiento del cliente */}
                <div className="mt-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between">
                  <div className="flex-1">
                    <h5 className="text-xs font-bold text-indigo-900 mb-1 flex items-center gap-1">
                      <ScanLine size={12} /> CÓDIGO DE SEGUIMIENTO QR
                    </h5>
                    <p className="text-[10px] text-slate-500 mb-2">El cliente puede escanear este código para ver el estado de su pedido en tiempo real.</p>
                    <p className="text-[10px] font-mono text-indigo-600 bg-white px-2 py-1 rounded inline-block">#{sale.transactionId || sale.id}</p>
                  </div>
                  <div className="p-2 bg-white rounded-lg shadow-sm border border-indigo-100">
                    <QRCodeCanvas 
                      value={`${window.location.origin}${window.location.pathname}#catalog?statusId=${sale.transactionId || sale.id}`}
                      size={64}
                      level="M"
                    />
                  </div>
                </div>

                {/* Add Cancel Sale Button */}
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); onShowReceipt(sale); }}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Printer size={18} /> Imprimir Factura
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onCancelSale(sale.transactionId || sale.id); }} // Prevent toggling details
                    className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                  >
                    <X size={18} /> Cancelar Venta
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {groupedSales.length === 0 && (
          <p className="text-center text-slate-400 py-10">No hay ventas registradas aún.</p>
        )}
      </div>
    </div>
  );
};

// --- COMPONENTES UI GENÉRICOS ---

const SidebarItem = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${active ? 'bg-violet-500 text-white shadow-lg shadow-violet-900/30' : 'text-violet-100 hover:bg-violet-600 hover:text-white'}`}
  >
    <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    <span className="font-medium">{label}</span>
    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
  </button>
);

const SuppliersView = ({ suppliers, onAdd, onEdit, onDelete, onPurchase }) => {
  return (
    <div className="animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Proveedores</h2>
        <div className="flex gap-3">
          <button onClick={onPurchase} className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 shadow-lg shadow-violet-200 transition-all flex items-center gap-2">
            <Package size={18} /> Ingreso de Mercadería
          </button>
          <button onClick={onAdd} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center gap-2">
            <Plus size={18} /> Nuevo Proveedor
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-bold">
            <tr>
              <th className="px-6 py-4">Empresa / Nombre</th>
              <th className="px-6 py-4">Contacto</th>
              <th className="px-6 py-4">Teléfono</th>
              <th className="px-6 py-4">Correo</th>
              <th className="px-6 py-4">Dirección</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {suppliers.map(s => (
              <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-700">{s.name}</td>
                <td className="px-6 py-4 text-slate-600">{s.contact_name || '-'}</td>
                <td className="px-6 py-4 text-slate-600 font-mono text-sm">{s.phone || '-'}</td>
                <td className="px-6 py-4 text-slate-600 text-sm">{s.email || '-'}</td>
                <td className="px-6 py-4 text-slate-600 text-sm">{s.address || '-'}</td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => onEdit(s)} className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => onDelete(s.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                  No hay proveedores registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CashClosingView = ({ timeOffset, user }) => {
  const [data, setData] = useState({
    date: getNicaraguaDateString(timeOffset),
    starting_cash: 0,
    expected_cash: 0,
    actual_cash: 0,
    difference: 0,
    total_entries: 0,
    total_exits: 0,
    notes: '',
    status: 'open',
    total_sales: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user || !user.token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/cash-closings/date/${data.date}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'x-user-role': user.role
        }
      });
      if (response.ok) {
        const result = await response.json();
        if (result) {
          setData(prev => ({ ...prev, ...result }));
        } else {
          try {
            const summaryRes = await fetch(`${API_BASE_URL}/api/daily-summary`, {
              headers: {
                'Authorization': `Bearer ${user.token}`,
                'x-user-role': user.role
              }
            });
            if (summaryRes.ok) {
              const summary = await summaryRes.json();
              setData(prev => ({
                ...prev,
                expected_cash: summary.totalSales,
                total_sales: summary.totalSales,
                difference: -summary.totalSales
              }));
            }
          } catch (e) { console.error(e); }
        }
      }
    } catch (error) {
      console.error("Error fetching closing data:", error);
    } finally {
      setLoading(false);
    }
  }, [data.date, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (isClosing = false) => {
    try {
      // Validar que el monto contado sea válido si se va a cerrar
      if (isClosing && (data.actual_cash === undefined || data.actual_cash === null)) {
        alert("Por favor ingrese el monto contado antes de cerrar.");
        return;
      }

      const payload = {
        ...data,
        status: isClosing ? 'closed' : 'open',
        // Asegurar que los campos numéricos sean números y no undefined
        starting_cash: Number(data.starting_cash || 0),
        total_entries: Number(data.total_entries || 0),
        total_exits: Number(data.total_exits || 0),
        actual_cash: Number(data.actual_cash || 0),
        expected_cash: Number(data.expected_cash || 0),
        difference: Number(data.difference || 0),
        total_sales: Number(data.total_sales || 0)
      };

      const response = await fetch(`${API_BASE_URL}/api/cash-closings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
          'x-user-role': user.role
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert(isClosing ? "Caja cerrada con éxito" : "Borrador guardado");
        fetchData();
      } else {
        const errData = await response.json().catch(() => ({}));
        alert("Error del servidor: " + (errData.message || "No se pudo guardar el cierre"));
      }
    } catch (error) {
      console.error("Error al guardar cierre de caja:", error);
      alert("Error de conexión: No se pudo contactar al servidor.");
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Cargando datos de caja...</div>;

  const isClosed = data.status === 'closed';

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-violet-600 p-8 text-white">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-3xl font-black">Cierre de Caja Diario</h2>
            <div className="bg-violet-500/30 px-4 py-1 rounded-full text-sm font-bold backdrop-blur-sm border border-violet-400/30">
              {data.date}
            </div>
          </div>
          <p className="text-violet-100 opacity-80">Conciliación de ingresos y efectivo físico en caja.</p>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <LayoutDashboard size={16} /> Sistema (Ventas)
              </h3>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-600">Ventas del Día:</span>
                  <span className="text-xl font-bold text-slate-800">{formatCurrency(data.total_sales)}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                  <span className="font-bold text-slate-800 text-lg">Total Esperado:</span>
                  <span className="text-2xl font-black text-violet-600">{formatCurrency(data.expected_cash)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Banknote size={16} /> Dinero Físico en Caja
              </h3>
              <div className="bg-violet-50 p-6 rounded-2xl border border-violet-100">
                <label className="block text-slate-600 mb-2 font-medium">Ingrese monto contado:</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-violet-400">C$</span>
                  <input
                    type="number"
                    disabled={isClosed}
                    className="w-full bg-white border-2 border-violet-200 rounded-xl py-4 pl-14 pr-6 text-3xl font-black text-violet-700 focus:border-violet-500 outline-none transition-all disabled:opacity-50"
                    value={data.actual_cash}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setData(prev => ({ ...prev, actual_cash: val, difference: val - prev.expected_cash }));
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-2xl border-2 flex flex-col md:flex-row justify-between items-center gap-4 ${data.difference === 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : data.difference > 0 ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${data.difference === 0 ? 'bg-emerald-500 text-white' : 'bg-white shadow-sm'}`}>
                {data.difference === 0 ? <TrendingUp size={24} /> : <AlertCircle size={24} />}
              </div>
              <div>
                <p className="font-bold text-lg">Diferencia de Caja</p>
                <p className="text-sm opacity-80">{data.difference === 0 ? '¡Excelente! La caja cuadra perfectamente.' : data.difference > 0 ? 'Sobran fondos en caja.' : 'Faltan fondos en caja.'}</p>
              </div>
            </div>
            <div className="text-4xl font-black">{formatCurrency(data.difference)}</div>
          </div>

          {!isClosed && (
            <div className="flex gap-4">
              <button onClick={() => handleSave(false)} className="flex-1 bg-white border-2 border-slate-200 text-slate-600 py-4 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm">
                Guardar Borrador
              </button>
              <button onClick={() => handleSave(true)} className="flex-1 bg-violet-600 text-white py-4 rounded-xl font-bold hover:bg-violet-700 shadow-lg shadow-violet-200 transition-all">
                CERRAR CAJA
              </button>
            </div>
          )}

          {isClosed && (
            <div className="bg-emerald-500 text-white p-6 rounded-2xl text-center font-black text-xl shadow-lg">
              ESTA CAJA YA FUE CERRADA
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SettingsView = ({ timeOffset, notificationPhone, callmebotApiKey, onUpdateSettings }) => {
  const [localOffset, setLocalOffset] = useState(timeOffset);
  const [localPhone, setLocalPhone] = useState(notificationPhone);
  const [localApiKey, setLocalApiKey] = useState(callmebotApiKey);

  useEffect(() => {
    setLocalOffset(timeOffset);
    setLocalPhone(notificationPhone);
    setLocalApiKey(callmebotApiKey);
  }, [timeOffset, notificationPhone, callmebotApiKey]);

  return (
    <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Settings size={28} className="text-violet-600" /> Configuración del Sistema
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ajuste de Fecha y Hora */}
        <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
          <h3 className="font-bold text-slate-700 mb-2">Ajuste de Fecha y Hora</h3>
          <p className="text-sm text-slate-500 mb-4">Ajuste el desfase horario del sistema (UTC offset).</p>

          <div className="bg-white p-4 rounded-lg border border-slate-200 mb-4">
            <p className="text-xs text-slate-400 uppercase font-black mb-1">Hora actual del sistema:</p>
            <p className="text-2xl font-mono font-bold text-violet-700">
              {formatDisplayDateTime(new Date().toISOString(), { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }, localOffset)}
            </p>
            <p className="text-xs text-slate-500">
              {formatDisplayDateTime(new Date().toISOString(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }, localOffset)}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="number"
              step="1"
              className="w-24 border rounded-lg px-3 py-2 text-center font-bold text-lg"
              value={localOffset}
              onChange={(e) => setLocalOffset(parseFloat(e.target.value))}
            />
            <button
              onClick={() => onUpdateSettings({ time_offset: String(localOffset) })}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors shadow-sm"
            >
              Guardar Ajuste
            </button>
          </div>
          <p className="mt-2 text-[10px] text-slate-400 italic">* Valor recomendado para Nicaragua: -6</p>
        </div>

        {/* Notificaciones WhatsApp (CallMeBot) */}
        <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
          <h3 className="font-bold text-slate-700 mb-2">Notificaciones WhatsApp (CallMeBot)</h3>
          <p className="text-sm text-slate-500 mb-4">Reciba alertas automáticas y reportes diarios directamente en su celular.</p>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 uppercase font-black block mb-1">Número de WhatsApp</label>
              <input
                type="text"
                placeholder="+50585853867"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={localPhone}
                onChange={(e) => setLocalPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase font-black block mb-1">API Key (Solo para Automático)</label>
              <input
                type="text"
                placeholder="Ingresa la clave recibida"
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
              />
            </div>
            <button
              onClick={() => onUpdateSettings({ notification_phone: localPhone, callmebot_apikey: localApiKey })}
              className="w-full py-2 bg-violet-600 text-white rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors shadow-sm"
            >
              Guardar Configuración de WhatsApp
            </button>
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            <strong>¿Cómo obtener la API Key?</strong>
            <ol className="list-decimal ml-4 mt-1 space-y-1">
              <li>Agrega a <strong>+34 644 66 32 62</strong> a tus contactos.</li>
              <li>Envía <strong>"I allow callmebot to send me messages"</strong> por WhatsApp.</li>
              <li>Recibirás tu clave al instante para habilitar los reportes automáticos.</li>
            </ol>
            <p className="mt-2 text-[10px] text-blue-500 italic">* El botón manual en el Panel de Control funciona siempre sin clave.</p>
          </div>
        </div>

        <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
          <h3 className="font-bold text-slate-700 mb-2">Información del Negocio</h3>
          <p className="text-sm text-slate-500">Configure el nombre, dirección y logo en las facturas.</p>
          <button className="mt-4 px-4 py-2 bg-violet-100 text-violet-700 rounded-lg text-sm font-bold hover:bg-violet-200 transition-colors">Editar Perfil</button>
        </div>
      </div>
    </div>
  );
};

const UsersView = () => <UserManagementView />;
const CashFlowView = () => <CashFlow />;