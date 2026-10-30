import { createClient } from 'graphql-ws';
import { useTienda } from '../store/useTienda';

let cliente = null;
let tokenDelCliente = null;
let conectado = false;

// Para quien se suscribe cuando el WebSocket ya estaba abierto (no le llega el aviso de "connected").
export const estaConectado = () => conectado;

function urlSuscripciones() {
  const base = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000/graphql';
  return base.replace(/^http/, 'ws');
}

// Un WebSocket por pagina. El servidor revisa los permisos con el JWT que llega al conectar, asi que si la
// sesion cambia (entrar, salir, otra cuenta) las suscripciones nuevas usan uno nuevo con el token nuevo.
// El anterior no se cierra: las suscripciones que ya iban en el (existencias en vivo) siguen llegando.
export function obtenerClienteSuscripciones() {
  if (typeof window === 'undefined') return null;
  const token = useTienda.getState().sesion?.token ?? null;
  if (cliente && token !== tokenDelCliente) {
    cliente = null;
    conectado = false;
  }
  if (!cliente) {
    tokenDelCliente = token;
    const nuevo = createClient({
      url: urlSuscripciones(),
      // En WebSocket no hay encabezados: el JWT viaja en connectionParams al conectar.
      connectionParams: () => (token ? { authorization: `Bearer ${token}` } : {}),
      // Si se cae la conexion (el servidor se reinicia, se va el internet), se reintenta solo.
      retryAttempts: Infinity,
      shouldRetry: () => true,
    });
    nuevo.on('connected', () => cliente === nuevo && (conectado = true));
    nuevo.on('closed', () => cliente === nuevo && (conectado = false));
    cliente = nuevo;
  }
  return cliente;
}
