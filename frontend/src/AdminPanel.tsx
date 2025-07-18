import React, { useState, useEffect } from 'react';
import { Edit, Save, X, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { getApiUrl, API_CONFIG } from './config/api';
import { Link } from 'react-router-dom';

interface Machine {
  id: number;
  code: string;
  name: string;
  price: number;
  category: string;
  description: string;
  active: boolean;
}

interface AdminCredentials {
  username: string;
  password: string;
}

function AdminPanel() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingMachine, setEditingMachine] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState<string>('');
  const [credentials, setCredentials] = useState<AdminCredentials>({
    username: '',
    password: ''
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  // Basic auth header
  const getAuthHeader = () => {
    const auth = btoa(`${credentials.username}:${credentials.password}`);
    return `Basic ${auth}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Test authentication by trying to access a protected endpoint
      const testResponse = await fetch(getApiUrl('/quotations'), {
        headers: {
          'Authorization': getAuthHeader()
        }
      });

      if (testResponse.ok) {
        // If auth is successful, load machines (this endpoint doesn't require auth)
        const machinesResponse = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.MACHINES));
        if (machinesResponse.ok) {
          const machinesData = await machinesResponse.json();
          setMachines(machinesData);
          setIsAuthenticated(true);
        } else {
          setError('Error al cargar las máquinas');
        }
      } else {
        setError('Credenciales incorrectas');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePrice = async (machineCode: string) => {
    try {
      const priceNumber = Number(newPrice);
      if (isNaN(priceNumber) || priceNumber <= 0) {
        setUpdateStatus({ type: 'error', message: 'Precio inválido' });
        return;
      }
      const response = await fetch(getApiUrl(`/machines/${machineCode}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeader()
        },
        body: JSON.stringify({ price: priceNumber })
      });

      if (response.ok) {
        // Update local state
        setMachines(prev => prev.map(machine => 
          machine.code === machineCode 
            ? { ...machine, price: priceNumber }
            : machine
        ));
        
        setUpdateStatus({
          type: 'success',
          message: `Precio actualizado para ${machineCode}`
        });
        
        setEditingMachine(null);
        setNewPrice('');
        
        // Clear status after 3 seconds
        setTimeout(() => setUpdateStatus({ type: null, message: '' }), 3000);
      } else {
        setUpdateStatus({
          type: 'error',
          message: 'Error al actualizar el precio'
        });
      }
    } catch (error) {
      setUpdateStatus({
        type: 'error',
        message: 'Error de conexión'
      });
    }
  };

  const startEditing = (machine: Machine) => {
    setEditingMachine(machine.code);
    setNewPrice(String(machine.price));
  };

  const cancelEditing = () => {
    setEditingMachine(null);
    setNewPrice('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full">
          <div className="flex items-center justify-between mb-6">
            <Link
              to="/"
              className="flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Login
            </h1>
            <div className="w-16"></div> {/* Spacer for centering */}
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuario
              </label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Usuario"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Contraseña"
              />
            </div>
            
            {error && (
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a Cotizaciones</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsAuthenticated(false)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {updateStatus.type && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            updateStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {updateStatus.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{updateStatus.message}</span>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Gestión de Precios ({machines.length} máquinas)
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio Actual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {machines.map((machine) => (
                  <tr key={machine.code}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {machine.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {machine.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {machine.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${machine.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingMachine === machine.code ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={newPrice}
                            onChange={(e) => {
                              let val = e.target.value;
                              // Elimina ceros a la izquierda
                              val = val.replace(/^0+(\d)/, '$1');
                              // Solo permitir números
                              val = val.replace(/\D/g, '');
                              setNewPrice(val);
                            }}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Nuevo precio"
                          />
                          <button
                            onClick={() => handleUpdatePrice(machine.code)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(machine)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminPanel; 