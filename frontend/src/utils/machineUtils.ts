// Este archivo ahora solo contiene utilidades para trabajar con la lista de máquinas proveniente de la API

export interface MachineInfo {
  code: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  active?: boolean;
}

// Buscar máquina por código en una lista
export const findMachineByCode = (code: string, machines: MachineInfo[]): MachineInfo | null => {
  return machines.find(machine => machine.code === code) || null;
};

// Filtrar máquinas por categoría
export const getMachinesByCategory = (categoryName: string, machines: MachineInfo[]): MachineInfo[] => {
  return machines.filter(machine => machine.category === categoryName);
};

// Buscar máquinas por término
export const searchMachines = (searchTerm: string, machines: MachineInfo[]): MachineInfo[] => {
  const term = searchTerm.toLowerCase();
  return machines.filter(machine =>
    machine.name.toLowerCase().includes(term) ||
    machine.category.toLowerCase().includes(term) ||
    machine.code.toLowerCase().includes(term)
  );
};