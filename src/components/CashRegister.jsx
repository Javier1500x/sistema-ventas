import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DollarSign, ArrowUp, ArrowDown, X, Lock, AlertCircle, TrendingUp } from 'lucide-react';

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-NI', {
        style: 'currency',
        currency: 'NIO',
        minimumFractionDigits: 2
    }).format(amount);
};

export default function CashRegisterView({ user, API_BASE_URL }) {
    const [transactions, setTransactions] = useState([]);
    const [initialCash, setInitialCash] = useState(0); 
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [notification, setNotification] = useState(null);

    const showNotification = useCallback((msg, type = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3000);
    }, []);

    const fetchCashTransactions = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/cash-transactions/today`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'x-user-role': user.role
                }
            });
            if (response.ok) {
                const data = await response.json();
                setTransactions(data);
            } else {
                console.error('Error al cargar las transacciones de caja:', response.statusText);
                showNotification('Error al cargar transacciones.', 'error');
            }
        } catch (_err) {
            console.error('Error al conectar con el backend para transacciones de caja.');
            showNotification('Error de conexión.', 'error');
        }
    }, [showNotification, user, API_BASE_URL]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchCashTransactions();
        // Here, you would also fetch the initial cash for the day if it was stored persistently
        // For now, it defaults to 0
    }, [fetchCashTransactions]);

    const addCashTransaction = async (amount, description, type) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/cash-transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`,
                    'x-user-role': user.role
                },
                body: JSON.stringify({ amount, description, type }),
            });
            if (response.ok) {
                fetchCashTransactions();
                showNotification('Movimiento de caja registrado.', 'success');
            } else {
                showNotification('Error al registrar movimiento.', 'error');
            }
        } catch (_err) {
            showNotification('Error de conexión.', 'error');
        }
    };

    const handleCloseRegister = async () => {
        if (window.confirm('¿Estás seguro de que quieres cerrar la caja? Esta acción no se puede deshacer.')) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/clear-test-data`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${user.token}`,
                        'x-user-role': user.role
                    }
                });
                if (response.ok) {
                    setTransactions([]); // Clear local state after successful backend clear
                    setInitialCash(0); // Reset initial cash for the new day
                    showNotification('Caja cerrada con éxito. El conteo se ha reiniciado.', 'success');
                } else {
                    showNotification('Error al cerrar la caja.', 'error');
                }
            } catch (_err) {
                showNotification('Error de conexión.', 'error');
            }        }
    };

    const currentBalance = useMemo(() => {
        return initialCash + transactions.reduce((acc, t) => acc + t.amount, 0);
    }, [initialCash, transactions]);

    return (
        <div className="animate-in fade-in">
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white animate-in slide-in-from-top-5 fade-in duration-300 ${notification.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
                    <div className="flex items-center gap-2">
                        {notification.type === 'error' ? <AlertCircle size={18} /> : <TrendingUp size={18} />}
                        {notification.msg}
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Control de Caja</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <DollarSign size={18} /> Nuevo Movimiento
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-semibold text-slate-700 mb-2">Saldo Inicial</h3>
                    <p className="text-3xl font-bold text-slate-800">{formatCurrency(initialCash)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-semibold text-slate-700 mb-2">Saldo Actual</h3>
                    <p className="text-3xl font-bold text-indigo-600">{formatCurrency(currentBalance)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center items-center">
                    <button
                        onClick={handleCloseRegister}
                        className="w-full bg-red-600 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-sm"
                    >
                        <Lock size={18} /> Cerrar Caja del Día
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <h3 className="p-4 font-bold text-slate-800 border-b border-slate-100">Movimientos de Caja</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Fecha</th>
                                <th className="px-6 py-4 font-semibold">Descripción</th>
                                <th className="px-6 py-4 font-semibold">Tipo</th>
                                <th className="px-6 py-4 font-semibold text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transactions.map((t, index) => (
                                <tr key={index} className="hover:bg-slate-50/50">
                                    <td className="px-6 py-4 text-slate-500">{new Date(t.date).toLocaleString()}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800">{t.description}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${t.type === 'entry' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                            {t.type === 'entry' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                            {t.type === 'entry' ? 'Entrada' : 'Salida'}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 font-mono text-right ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(t.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <TransactionModal
                    onClose={() => setIsModalOpen(false)}
                    onAddTransaction={addCashTransaction}
                />
            )}
        </div>
    );
}

const TransactionModal = ({ onClose, onAddTransaction }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('entry');

    const handleSubmit = (e) => {
        e.preventDefault();
        onAddTransaction(parseFloat(amount), description, type);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Nuevo Movimiento de Caja</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-slate-700">Tipo de Movimiento</label>
                        <select
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        >
                            <option value="entry">Entrada de Dinero</option>
                            <option value="exit">Salida de Dinero</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700">Monto (C$)</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700">Descripción</label>
                        <input
                            required
                            className="w-full border rounded-lg px-3 py-2 mt-1"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-lg hover:bg-slate-50">Cancelar</button>
                        <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};