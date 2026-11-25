// Idiomas de la tienda (practica P3-4). Coinciden con i18n en astro.config.mjs: el espanol va sin prefijo
// (/categoria/frenos/) y el ingles con /en (/en/category/brakes/).
export const IDIOMAS = ['es', 'en'];
export const IDIOMA_BASE = 'es';
export const LOCALE = { es: 'es-MX', en: 'en-US' };
export const NOMBRE_IDIOMA = { es: 'Español', en: 'English' };

export const esIdioma = (valor) => IDIOMAS.includes(valor);

// El idioma de una ruta: /en o /en/... es ingles; lo demas, espanol.
export function idiomaDeRuta(ruta = '/') {
  return /^\/en(\/|$)/.test(ruta) ? 'en' : IDIOMA_BASE;
}

// En el navegador: el lang de <html> (lo pone Base.astro). En el build no hay documento: idioma base.
export function idiomaDelDocumento() {
  if (typeof document === 'undefined') return IDIOMA_BASE;
  return document.documentElement.lang?.startsWith('en') ? 'en' : IDIOMA_BASE;
}
