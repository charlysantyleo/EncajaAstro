// Ayudas para cuando no hay red (practica P3-3).

// El service worker y el cliente GraphQL empiezan con "Sin conexión" los errores de red: asi la vista puede
// mostrar ese mensaje tal cual en lugar del generico "no se pudo cargar".
export const SIN_CONEXION = 'Sin conexión: no se pudo contactar a la tienda. Revisa tu internet e inténtalo de nuevo.';

export function esSinConexion(mensaje) {
  return typeof mensaje === 'string' && mensaje.startsWith('Sin conexión');
}

// Las respuestas guardadas de la API llevan precios y vehiculos de la cuenta: al cerrar sesion se borran, para
// que quien use el dispositivo despues no las vea sin red.
export async function borrarDatosGuardados() {
  if (typeof caches === 'undefined') return;
  for (const nombre of await caches.keys()) {
    if (nombre.startsWith('encaja-api-')) await caches.delete(nombre);
  }
}
