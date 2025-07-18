import React from 'react';
import { Tractor } from 'lucide-react';

interface HeaderProps {
  logoUrl?: string;
}

const Header: React.FC<HeaderProps> = ({ logoUrl }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Agromaq" 
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    // Fallback to tractor icon if logo fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : (
                <Tractor className="w-6 h-6 text-white" />
              )}
              <Tractor className={`w-6 h-6 text-white ${logoUrl ? 'hidden' : ''}`} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AGROMAQ</h1>
              <p className="text-xs text-gray-500">Maquinaria Agrícola</p>
            </div>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="#" className="text-gray-600 hover:text-green-600 transition-colors">Productos</a>
            <a href="#" className="text-gray-600 hover:text-green-600 transition-colors">Servicios</a>
            <a href="#" className="text-gray-600 hover:text-green-600 transition-colors">Contacto</a>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;