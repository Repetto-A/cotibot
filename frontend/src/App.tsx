import React, { useState, useMemo, useEffect } from 'react';
import { Download, Share2, Mail, Phone, User, Building, Package, AlertCircle, Tractor, Settings } from 'lucide-react';
import MachinerySelector from './components/MachinerySelector';
import { findMachineByCode } from './utils/machineUtils';
import { getApiUrl, API_CONFIG } from './config/api';
import { Link } from 'react-router-dom';

interface QuotationForm {
  clientName: string;
  clientCuit: string;
  clientPhone: string;
  clientAddress: string;
  machineModel: string;
  quantity: number;
  discountPercent: number;
}

interface MachineFromAPI {
  id: number;
  code: string;
  name: string;
  price: number;
  category: string;
  description: string;
  active: boolean;
}

function App() {
  // State para la lista real de máquinas
  const [machines, setMachines] = useState<MachineFromAPI[]>([]);
  const [isLoadingMachines, setIsLoadingMachines] = useState(true);
  const [machineError, setMachineError] = useState<string | null>(null);

  useEffect(() => {
    const loadMachines = async () => {
      try {
        setIsLoadingMachines(true);
        setMachineError(null);
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.MACHINES));
        if (response.ok) {
          const machinesFromAPI: MachineFromAPI[] = await response.json();
          setMachines(machinesFromAPI.filter(m => m.active));
        } else {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        setMachineError('No se pudieron cargar las máquinas desde el servidor.');
        setMachines([]);
      } finally {
        setIsLoadingMachines(false);
      }
    };
    loadMachines();
  }, []);
  
  const [form, setForm] = useState<QuotationForm>({
    clientName: '',
    clientCuit: '',
    clientPhone: '',
    clientAddress: '',
    machineModel: '',
    quantity: 1,
    discountPercent: 0
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [lastQuotation, setLastQuotation] = useState<string | null>(null);
  const [showMachineSelector, setShowMachineSelector] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'quantity' || name === 'discountPercent') {
      // Elimina ceros a la izquierda y fuerza valor numérico
      const clean = value === '' ? '' : String(Number(value));
      setForm(prev => ({
        ...prev,
        [name]: clean === '' ? '' : Number(clean)
      }));
    } else {
      setForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleMachineSelect = (machineCode: string) => {
    setForm(prev => ({ ...prev, machineModel: machineCode }));
    setShowMachineSelector(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    
    try {
      const selectedMachine = findMachineByCode(form.machineModel, machines);
      if (!selectedMachine) {
        throw new Error('No se ha seleccionado una máquina');
      }

      const quotationData = {
        machineCode: form.machineModel,
        clientCuit: form.clientCuit,
        clientName: form.clientName,
        clientPhone: form.clientPhone,
        clientAddress: form.clientAddress, // <-- ahora se envía correctamente
        clientEmail: '', // Optional field
        clientCompany: '', // Optional field
        notes: `Dirección: ${form.clientAddress}\nCantidad: ${form.quantity}\nDescuento: ${form.discountPercent}%`,
        discountPercent: form.discountPercent
      };

      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.GENERATE_QUOTE), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotationData)
      });

      if (response.ok) {
        // Get the PDF blob
        const pdfBlob = await response.blob();
        const pdfUrl = URL.createObjectURL(pdfBlob);
        setLastQuotation(pdfUrl);
      } else {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('Error generating quotation:', error);
      alert('Error al generar la cotización. Por favor, inténtalo de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!lastQuotation) return;
    
    const selectedMachine = machines.find(m => m.code === form.machineModel);
    const shareText = `Cotización Agromaq\n\nProducto: ${selectedMachine?.name}\nCliente: ${form.clientName}\nPrecio: $${selectedMachine?.price.toLocaleString()}`;

    try {
      // Fetch the PDF blob from the URL
      const response = await fetch(lastQuotation);
      const pdfBlob = await response.blob();
      
      // Create a File object from the blob
      const pdfFile = new File([pdfBlob], `cotizacion-${form.clientName.replace(' ', '-')}.pdf`, {
        type: 'application/pdf'
      });

      // Try to use native sharing if available
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: 'Cotización Agromaq',
          text: shareText,
          files: [pdfFile]
        });
      } else {
        // Fallback: Open WhatsApp with text only (files can't be shared via URL)
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback to text-only sharing
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  // Cuando se selecciona una máquina:
  const selectedMachine = findMachineByCode(form.machineModel, machines);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <img src="/test.png" alt="Logo Agromaq" className="w-32 h-auto" />
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/admin"
                className="flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm">Administración</span>
              </Link>
            </div>

          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quotation Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">Solicitar Cotización</h2>
                {isLoadingMachines && (
                  <p className="text-sm text-blue-600 mt-1">Cargando precios desde el servidor...</p>
                )}
                {machineError && (
                  <div className="flex items-center space-x-2 mt-1">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <p className="text-sm text-yellow-700">{machineError}</p>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    name="clientName"
                    value={form.clientName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descuento (%)
                  </label>
                  <input
                    type="number"
                    name="discountPercent"
                    value={form.discountPercent}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Building className="w-4 h-4 inline mr-2" />
                    CUIT
                  </label>
                  <input
                    type="text"
                    name="clientCuit"
                    value={form.clientCuit}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="20-12345678-9"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="clientPhone"
                    value={form.clientPhone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="+54 9 11 1234-5678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Dirección
                  </label>
                  <input
                    type="text"
                    name="clientAddress"
                    value={form.clientAddress}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Av. Corrientes 1234, CABA"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Package className="w-4 h-4 inline mr-2" />
                  Modelo de Maquinaria
                </label>
                
                {selectedMachine ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-green-900">{selectedMachine.name}</h4>
                          <p className="text-sm text-green-700 mt-1">{selectedMachine.category}</p>
                          <p className="text-xs text-green-600 mt-1">Código: {selectedMachine.code}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">${selectedMachine.price.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMachineSelector(true)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                    >
                      Cambiar selección
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowMachineSelector(true)}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors text-gray-600 font-medium"
                  >
                    + Seleccionar Maquinaria
                  </button>
                )}
                
                {/* Machine Selector Modal */}
                {showMachineSelector && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                      <div className="p-6 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold text-gray-900">Seleccionar Maquinaria</h3>
                          <button
                            type="button"
                            onClick={() => setShowMachineSelector(false)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="p-6 overflow-y-auto">
                        <MachinerySelector
                          selectedMachine={form.machineModel}
                          onMachineSelect={handleMachineSelect}
                          machines={machines}
                          isLoadingMachines={isLoadingMachines}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleInputChange}
                  min="1"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isGenerating ? 'Generando Cotización...' : 'Generar Cotización'}
              </button>
            </form>

            {lastQuotation && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-medium text-green-900 mb-3">Cotización Generada</h3>
                <div className="flex space-x-3">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(lastQuotation);
                        const pdfBlob = await response.blob();
                        const url = URL.createObjectURL(pdfBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `cotizacion-${form.clientName.replace(' ', '-')}.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      } catch (error) {
                        console.error('Error downloading PDF:', error);
                        // Fallback to opening in new tab
                        window.open(lastQuotation, '_blank');
                      }
                    }}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar PDF</span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex items-center space-x-2 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Compartir</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Machine Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Catálogo de Maquinaria</h3>
            
            {selectedMachine && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">Seleccionado:</h4>
                <div className="text-green-800">
                  <p className="font-semibold">{selectedMachine.name}</p>
                  <p className="text-sm text-green-600">{selectedMachine.category}</p>
                  <p className="text-lg font-bold mt-2">${selectedMachine.price.toLocaleString()}</p>
                  {form.quantity > 1 && (
                    <p className="text-sm">
                      Subtotal: ${(selectedMachine.price * form.quantity).toLocaleString()}
                    </p>
                  )}
                  {form.discountPercent > 0 && (
                    <div className="text-sm">
                      <p className="text-red-600">
                        Descuento {form.discountPercent}%: -${((selectedMachine.price * form.quantity * form.discountPercent) / 100).toLocaleString()}
                      </p>
                      <p className="font-bold">
                        Total: ${((selectedMachine.price * form.quantity) * (1 - form.discountPercent / 100)).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="text-center py-8">
              <Tractor className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Amplio Catálogo Disponible</h4>
              <p className="text-gray-600 mb-4">
                Contamos con más de 50 productos en 10 categorías diferentes
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
                <div>• Acoplados rurales</div>
                <div>• Acoplados tanque</div>
                <div>• Tolvas</div>
                <div>• Cargadores y elevadores</div>
                <div>• Palas de arrastre</div>
                <div>• Rastras</div>
                <div>• Sin fines</div>
                <div>• Y más...</div>
              </div>
              <button
                type="button"
                onClick={() => setShowMachineSelector(true)}
                className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Ver Catálogo Completo
              </button>
            </div>
          </div>
        </div>
      </main>


    </div>
  );
}

export default App;
