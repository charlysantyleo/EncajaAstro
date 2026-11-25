import { useTienda } from '../store/useTienda';
import { SIN_CONEXION } from '../lib/offline';

export const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000/graphql';

// Cada peticion lleva el JWT de la sesion (si hay) en el encabezado Authorization.
// Con { parcial: true }, si llego algo de datos se regresa { datos, errores } en lugar de fallar
// (el tablero muestra las ventas aunque la parte de MongoDB falle).
export async function graphqlRequest(query, variables = {}, { token, parcial = false } = {}) {
  const jwt = token ?? useTienda.getState().sesion?.token;
  let respuesta;
  try {
    respuesta = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    // Sin red y sin service worker que responda (primera visita, o el navegador no lo soporta): mensaje claro
    // en lugar del "Failed to fetch" del navegador.
    throw Object.assign(new Error(SIN_CONEXION), { code: 'SIN_CONEXION' });
  }

  if (!respuesta.ok) {
    throw new Error(`El servidor respondio con estado ${respuesta.status}`);
  }

  const resultado = await respuesta.json();

  if (parcial && resultado.data) return { datos: resultado.data, errores: resultado.errors ?? [] };

  if (resultado.errors?.length) {
    // Si el servidor ya no reconoce el token (vencio o cambio el secreto), se cierra la sesion local.
    if (jwt && resultado.errors[0].extensions?.code === 'UNAUTHENTICATED') {
      useTienda.getState().cerrarSesion();
    }
    // code: SIN_CONEXION o EN_COLA cuando responde el service worker (ver src/sw.js).
    throw Object.assign(new Error(resultado.errors[0].message), { code: resultado.errors[0].extensions?.code });
  }

  return resultado.data;
}
