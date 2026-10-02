import { createClient } from 'graphql-ws';
import { useTienda } from '../store/useTienda';

let cliente = null;

function urlSuscripciones() {
  const base = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000/graphql';
  return base.replace(/^http/, 'ws');
}

export function obtenerClienteSuscripciones() {
  if (typeof window === 'undefined') return null;
  if (!cliente) {
    cliente = createClient({
      url: urlSuscripciones(),
      // En WebSocket no hay encabezados: el JWT viaja en connectionParams al conectar.
      connectionParams: () => {
        const token = useTienda.getState().sesion?.token;
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    });
  }
  return cliente;
}
