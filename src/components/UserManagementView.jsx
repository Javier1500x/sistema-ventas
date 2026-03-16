import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, User, CheckCircle, XCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const UserManagementView = ({ showNotification, userRole }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'seller' });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // For this simple demo, we pass the userRole in a header for authorization
      // In a real app, this would be handled by JWT in an Authorization header
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: {
          'x-user-role': userRole // Temporarily pass role for backend authorization
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError('Error al cargar los usuarios.');
      showNotification('Error al cargar los usuarios.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification, userRole]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      showNotification('Usuario creado con éxito.');
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'seller' });
      fetchUsers();
    } catch (err) {
      console.error("Error creating user:", err);
      showNotification('Error al crear el usuario.', 'error');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      // Only send password if it's explicitly set (i.e., changing it)
      if (payload.password === '') {
        delete payload.password;
      }

      const response = await fetch(`${API_BASE_URL}/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      showNotification('Usuario actualizado con éxito.');
      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'seller' });
      fetchUsers();
    } catch (err) {
      console.error("Error updating user:", err);
      showNotification('Error al actualizar el usuario.', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('¿Estás seguro de que quieres DESACTIVAR este usuario? No podrá iniciar sesión.')) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': userRole
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      showNotification('Usuario desactivado con éxito.');
      fetchUsers();
    } catch (err) {
      console.error("Error deleting user:", err);
      showNotification('Error al desactivar el usuario.', 'error');
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, password: '', role: user.role, status: user.status });
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'seller' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'seller' });
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando usuarios...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h2>
        <button
          onClick={openAddModal}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={18} /> Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Nombre</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Rol</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-800">{user.name}</td>
                  <td className="px-6 py-4">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'seller' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.status === 'active' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      {user.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-slate-400 hover:text-indigo-500 transition-colors"
                        title="Editar Usuario"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        title="Desactivar Usuario"
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

      {isModalOpen && (
        <UserFormModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSubmit={editingUser ? handleEditUser : handleAddUser}
          formData={formData}
          onInputChange={handleInputChange}
          isEditing={!!editingUser}
        />
      )}
    </div>
  );
};

const UserFormModal = ({ isOpen, onClose, onSubmit, formData, onInputChange, isEditing }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XCircle/></button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nombre</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={onInputChange}
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={onInputChange}
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Contraseña {isEditing && '(dejar en blanco para no cambiar)'}</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={onInputChange}
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-indigo-500 focus:border-indigo-500"
              {...(isEditing ? {} : { required: true })} // Password is required only for new users
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Rol</label>
            <select
              name="role"
              value={formData.role}
              onChange={onInputChange}
              className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="seller">Vendedor</option>
              <option value="admin">Admin</option>
              <option value="inventory_manager">Gerente de Inventario</option>
            </select>
          </div>
          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-slate-700">Estado</label>
              <select
                name="status"
                value={formData.status}
                onChange={onInputChange}
                className="w-full border rounded-lg px-3 py-2 mt-1 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-lg hover:bg-slate-50">Cancelar</button>
            <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{isEditing ? 'Guardar Cambios' : 'Crear Usuario'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagementView;