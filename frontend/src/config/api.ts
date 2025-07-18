// API Configuration
// Cuando deployees el backend en Render, la URL final será algo como:
// https://tu-backend-render.onrender.com
// Solo cambia la variable VITE_API_BASE_URL en el .env para apuntar allí cuando esté listo.

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  ENDPOINTS: {
    MACHINES: '/machines',
    ADMIN_MACHINES: '/admin/machines',
    GENERATE_QUOTE: '/generate-quote',
    QUOTATIONS: '/quotations',
    QUOTATION_STATS: '/quotations/stats'
  }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}; 