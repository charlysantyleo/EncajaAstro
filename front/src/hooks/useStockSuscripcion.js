import { useEffect } from 'react';
import { obtenerClienteSuscripciones } from '../graphql/subscriptionClient';
import { useStockEnVivo } from '../store/useStockEnVivo';

const SUBSCRIPCION_STOCK = `
  subscription {
    stockActualizado {
      id
      stock
    }
  }
`;

export function useStockSuscripcion() {
  const actualizar = useStockEnVivo((estado) => estado.actualizar);

  useEffect(() => {
    const cliente = obtenerClienteSuscripciones();
    if (!cliente) return undefined;

    const cancelar = cliente.subscribe(
      { query: SUBSCRIPCION_STOCK },
      {
        next: (mensaje) => {
          const producto = mensaje.data?.stockActualizado;
          if (producto) actualizar(producto.id, producto.stock);
        },
        error: () => {},
        complete: () => {},
      }
    );

    return () => cancelar();
  }, [actualizar]);
}
