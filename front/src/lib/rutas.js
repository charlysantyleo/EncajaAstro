// Rutas reales de la tienda. Las categorias y los productos tienen URL limpia (/categoria/frenos,
// /producto/bc-4021-balatas-delanteras-ceramicas): sus paginas se generan en el build. La busqueda y lo
// que depende de cada visitante (pedido, vehiculo) viaja como query param.
import { slug, slugDeProducto } from './slug';
import { nombreCategoria, traducirProducto } from '../i18n/catalogo';
import { IDIOMAS, IDIOMA_BASE, datos, idiomaDelDocumento, prefijo } from '../i18n';

export const rutas = {
  home: '/',
  // Con "/" al final, igual que la canonical y el sitemap (Astro genera carpeta/index.html).
  categoria: (_id, nombre) => `/categoria/${slug(nombre)}/`,
  producto: (producto) => `/producto/${slugDeProducto(producto)}/`,
  busqueda: (texto) => `/categoria?q=${encodeURIComponent(texto)}`,
  garage: '/garage',
  vehiculo: (id) => `/vehiculo?id=${encodeURIComponent(id)}`,
  carrito: '/carrito',
  checkout: '/checkout',
  pago: (referencia) => `/pago?ref=${encodeURIComponent(referencia)}`,
  comprobante: (referencia) => `/comprobante?ref=${encodeURIComponent(referencia)}`,
  admin: '/admin',
  adminPedidos: '/admin/pedidos',
  adminProductos: '/admin/productos',
  adminVehiculos: '/admin/vehiculos',
  adminUsuarios: '/admin/usuarios',
  adminAjustes: '/admin/ajustes',
};

// Las paginas publicas existen en cada idioma de astro.config.mjs, con prefijo y segmentos traducidos que vienen de
// la seccion "rutas" de su JSON (src/i18n/idiomas/<codigo>.json). Con espanol e ingles:
//   /                      ->  /en/
//   /categoria/frenos/     ->  /en/category/brakes/
//   /producto/bc-4021-...  ->  /en/product/bc-4021-front-ceramic-brake-pads/
//   /categoria?q=          ->  /en/search?q=
//   /carrito               ->  /en/cart
// Cuenta, pago y panel solo existen en el idioma base: en los demas se usan las mismas rutas.
const porIdioma = {};
export function rutasPara(idioma) {
  if (idioma === IDIOMA_BASE || !IDIOMAS.includes(idioma)) return rutas;
  porIdioma[idioma] ??= (() => {
    const pre = prefijo(idioma);
    const seg = datos(idioma).rutas;
    return {
      ...rutas,
      home: `${pre}/`,
      categoria: (_id, nombre) => `${pre}/${seg.categoria}/${slug(nombreCategoria(nombre, idioma))}/`,
      producto: (producto) => `${pre}/${seg.producto}/${slugDeProducto(traducirProducto(producto, idioma))}/`,
      busqueda: (texto) => `${pre}/${seg.busqueda}?q=${encodeURIComponent(texto)}`,
      carrito: `${pre}/${seg.carrito}`,
    };
  })();
  return porIdioma[idioma];
}

// Para las acciones del store (siempre en el navegador): las rutas del idioma de la pagina abierta.
export function rutasDeLaPagina() {
  return rutasPara(idiomaDelDocumento());
}

// La pagina de busqueda en cualquier idioma (/categoria, /en/search...).
export const esBusqueda = (ruta) => IDIOMAS.some((idioma) => ruta.replace(/\/$/, '') === rutasPara(idioma).busqueda('').split('?')[0]);

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
  if (typeof window === 'undefined') return { id: null, nombre: null, q: '', ref: null, slug: null };
  const params = new URLSearchParams(window.location.search);
  return { id: params.get('id'), nombre: params.get('nombre'), q: params.get('q') ?? '', ref: params.get('ref'), slug: params.get('slug') };
}

export function rutaActual() {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}
