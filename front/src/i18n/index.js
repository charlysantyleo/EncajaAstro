// Idiomas de la tienda (practica P3-4).
//
//   QUE IDIOMAS HAY   -> astro.config.mjs (i18n.locales). El primero sin prefijo es defaultLocale.
//   QUE DICE CADA UNO -> src/i18n/idiomas/<codigo>.json: textos de la interfaz, rutas traducidas, nombre de la app,
//                        pagina sin conexion y traduccion del catalogo.
//
// Agregar un idioma: `npm run i18n:nuevo fr`, traducir src/i18n/idiomas/fr.json y agregar 'fr' a i18n.locales.
// No hay que copiar paginas ni tocar componentes: todo se arma con estos datos.
import { i18n } from 'astro:config/client';

const archivos = import.meta.glob('./idiomas/*.json', { eager: true, import: 'default' });
const DATOS = Object.fromEntries(Object.entries(archivos).map(([ruta, datos]) => [ruta.match(/([\w-]+)\.json$/)[1], datos]));

export const IDIOMA_BASE = i18n?.defaultLocale ?? 'es';
export const IDIOMAS = (i18n?.locales ?? [IDIOMA_BASE]).map((l) => (typeof l === 'string' ? l : l.path));

for (const codigo of IDIOMAS) {
  if (!DATOS[codigo]) throw new Error(`Falta src/i18n/idiomas/${codigo}.json (el idioma "${codigo}" esta en i18n.locales de astro.config.mjs)`);
}

/** Todo lo de un idioma (su JSON). Si no existe, el del idioma base. */
export const datos = (idioma) => DATOS[idioma] ?? DATOS[IDIOMA_BASE];

/** '' para el idioma base (sin prefijo, prefixDefaultLocale: false) y '/en', '/fr'... para los demas. */
export const prefijo = (idioma) => (idioma === IDIOMA_BASE ? '' : `/${idioma}`);

/** 'es-MX', 'en-US'...: para Intl (ordenar, fechas) y para el manifiesto. */
export const locale = (idioma) => datos(idioma).idioma.locale;

/** El idioma de una ruta: /en/... es 'en'; sin prefijo de idioma, el base. */
export function idiomaDeRuta(ruta = '/') {
  const primero = ruta.split('/')[1];
  return IDIOMAS.includes(primero) && primero !== IDIOMA_BASE ? primero : IDIOMA_BASE;
}

/** En el navegador, el lang de <html> (lo pone Base.astro); en el build, el idioma base. */
export function idiomaDelDocumento() {
  if (typeof document === 'undefined') return IDIOMA_BASE;
  const lang = document.documentElement.lang;
  return IDIOMAS.includes(lang) ? lang : IDIOMA_BASE;
}

// ---------- textos de la interfaz ----------

// El JSON va anidado por area ({ barra: { buscar: '...' } }) para que sea facil de traducir; aqui se aplana a
// 'barra.buscar'.
function aplanar(objeto, previo = '', salida = {}) {
  for (const [clave, valor] of Object.entries(objeto ?? {})) {
    const completa = previo ? `${previo}.${clave}` : clave;
    if (valor && typeof valor === 'object') aplanar(valor, completa, salida);
    else salida[completa] = valor;
  }
  return salida;
}
const TEXTOS = Object.fromEntries(IDIOMAS.map((codigo) => [codigo, aplanar(DATOS[codigo].textos)]));

/**
 * traducir('en', 'comun.yaLlevas', { n: 2 }) -> 'You already have 2 in your note.'
 * Si a un idioma le falta una clave se usa la del idioma base; si tampoco existe, se ve la clave (facil de detectar).
 */
export function traducir(idioma, clave, variables) {
  const texto = TEXTOS[idioma]?.[clave] ?? TEXTOS[IDIOMA_BASE][clave] ?? clave;
  return variables ? texto.replace(/\{(\w+)\}/g, (_, nombre) => String(variables[nombre] ?? '')) : texto;
}

// Mensajes que llegan ya escritos en el idioma base (del service worker o del servidor): se busca su clave por el
// texto y se traducen. Si no se conoce, se muestra tal cual.
const CLAVE_POR_TEXTO = Object.fromEntries(Object.entries(TEXTOS[IDIOMA_BASE]).map(([clave, texto]) => [texto, clave]));
export function traducirMensaje(idioma, mensaje) {
  const clave = CLAVE_POR_TEXTO[mensaje];
  return clave ? traducir(idioma, clave) : mensaje;
}
