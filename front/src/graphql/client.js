import { useTienda } from '../store/useTienda';

export const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000/graphql';

// Cada peticion lleva el JWT de la sesion (si hay) en el encabezado Authorization.
export async function graphqlRequest(query, variables = {}, { token } = {}) {
  const jwt = token ?? useTienda.getState().sesion?.token;
  const respuesta = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!respuesta.ok) {
    throw new Error(`El servidor respondio con estado ${respuesta.status}`);
  }

  const resultado = await respuesta.json();

  if (resultado.errors?.length) {
    // Si el servidor ya no reconoce el token (vencio o cambio el secreto), se cierra la sesion local.
    if (jwt && resultado.errors[0].extensions?.code === 'UNAUTHENTICATED') {
      useTienda.getState().cerrarSesion();
    }
    throw new Error(resultado.errors[0].message);
  }

  return resultado.data;
}
