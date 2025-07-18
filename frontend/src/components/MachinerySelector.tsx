import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { MachineInfo } from '../utils/machineUtils';

interface MachinerySelectorProps {
  selectedMachine: string;
  onMachineSelect: (machine: string) => void;
  machines: MachineInfo[];
  isLoadingMachines?: boolean;
}

interface MachineryCategory {
  categoria: string;
  productos: string[];
}

const MachinerySelector: React.FC<MachinerySelectorProps> = ({
  selectedMachine,
  onMachineSelect,
  machines,
  isLoadingMachines = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Filtrar máquinas por búsqueda
  const filteredMachines = searchTerm
    ? machines.filter(machine =>
        machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : machines;

  // Agrupar por categoría
  const categories = Array.from(new Set(filteredMachines.map(m => m.category)));

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-4">
      {isLoadingMachines && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">Cargando maquinaria...</span>
          </div>
        </div>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Buscar maquinaria..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {categories.map(category => {
          const categoryMachines = filteredMachines.filter(m => m.category === category);
          const isExpanded = expandedCategories.has(category);
          return (
            <div key={category} className="border border-gray-200 rounded-lg">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{category}</h3>
                  <p className="text-sm text-gray-500">{categoryMachines.length} productos</p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {isExpanded && (
                <div className="border-t border-gray-200 p-2">
                  <div className="space-y-1">
                    {categoryMachines.map(machine => {
                      const isSelected = selectedMachine === machine.code;
                      return (
                        <button
                          key={machine.code}
                          type="button"
                          onClick={() => onMachineSelect(machine.code)}
                          className={`w-full text-left p-3 rounded-lg transition-all ${
                            isSelected
                              ? 'bg-green-50 border-2 border-green-500'
                              : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className={`font-medium ${isSelected ? 'text-green-900' : 'text-gray-900'}`}>{machine.name}</p>
                              <p className="text-xs text-gray-500 mt-1">Código: {machine.code}</p>
                            </div>
                            <div className="text-right ml-4">
                              <p className={`font-bold ${isSelected ? 'text-green-600' : 'text-gray-900'}`}>${machine.price.toLocaleString()}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {filteredMachines.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No se encontraron productos que coincidan con "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
};

export default MachinerySelector;