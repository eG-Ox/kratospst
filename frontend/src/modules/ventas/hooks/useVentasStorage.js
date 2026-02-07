import { useEffect, useState } from 'react';

const STORAGE_KEY = 'kratos_ventas_v1';

const loadVentas = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Error leyendo ventas en storage:', error);
    return [];
  }
};

const saveVentas = (ventas) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ventas));
  } catch (error) {
    console.error('Error guardando ventas en storage:', error);
  }
};

export const useVentasStorage = () => {
  const [ventas, setVentas] = useState(() => loadVentas());

  useEffect(() => {
    saveVentas(ventas);
  }, [ventas]);

  return [ventas, setVentas];
};
