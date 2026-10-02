// Rutas reales de la tienda. Los ids y la busqueda viajan como query params
// para que el build estatico no dependa de que el backend este corriendo.

export const rutas = {
  home: '/',
  categoria: (id, nombre) =>
    `/categoria?id=${encodeURIComponent(id)}${nombre ? `&nombre=${encodeURIComponent(nombre)}` : ''}`,
  busqueda: (texto) => `/categoria?q=${encodeURIComponent(texto)}`,
  garage: '/garage',
  vehiculo: (id) => `/vehiculo?id=${encodeURIComponent(id)}`,
  carrito: '/carrito',
  checkout: '/checkout',
};

export function navegar(url) {
  window.location.assign(url);
}

// Regresa en el historial si el usuario venia de otra pagina de la tienda;
// si entro directo (enlace, recarga en frio) va a la ruta de respaldo.
export function volver(respaldo = rutas.home) {
  const vieneDeLaTienda = document.referrer && new URL(document.referrer).origin === window.location.origin;
  if (vieneDeLaTienda && window.history.length > 1) {
    window.history.back();
  } else {
    navegar(respaldo);
  }
}

export function leerParametros() {
  if (typeof window === 'undefined') return { id: null, nombre: null, q: '' };
  const params = new URLSearchParams(window.location.search);
  return { id: params.get('id'), nombre: params.get('nombre'), q: params.get('q') ?? '' };
}

export function rutaActual() {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}
