import { create } from 'zustand';

export const useStockEnVivo = create((set) => ({
  stock: {},
  actualizar(id, stock) {
    set((estado) => ({ stock: { ...estado.stock, [id]: stock } }));
  },
}));
