// Manifiesto de la PWA (P3-2 instalable, P3-4 multi-idioma). Los textos salen del JSON de cada idioma
// (src/i18n/idiomas/<codigo>.json, seccion "app" e "idioma"): el del idioma base lo genera @vite-pwa/astro
// (astro.config.mjs) y los demas, src/pages/[...idioma]/manifest.webmanifest.js. Mismo id ('/'): es la misma app,
// solo cambian el nombre, la descripcion, el idioma y la pagina de inicio.

// Valor de un token de color del primer :root (tema claro) de global.css.
export function tokenDe(css, nombre) {
  const inicio = css.indexOf(':root {');
  const raiz = css.slice(inicio, css.indexOf('}', inicio));
  const valor = raiz.match(new RegExp(`--${nombre}:\\s*(#[0-9a-fA-F]{3,8})\\b`))?.[1];
  if (!valor) throw new Error(`No encontre el token --${nombre} en global.css`);
  return valor.toLowerCase();
}

/**
 * @param datosIdioma el JSON del idioma (src/i18n/idiomas/<codigo>.json)
 * @param prefijo     '' para el idioma base, '/en' para los demas
 */
export function manifiesto(datosIdioma, prefijo, { rojo, papel }) {
  return {
    id: '/',
    name: datosIdioma.app.nombre,
    short_name: datosIdioma.app.nombreCorto,
    description: datosIdioma.app.descripcion,
    lang: datosIdioma.idioma.locale,
    dir: 'ltr',
    start_url: `${prefijo}/`,
    scope: '/',
    display: 'standalone', // ventana propia, sin barra de direcciones ni pestanas
    theme_color: rojo, // --rojo: barra de titulo de la ventana instalada
    background_color: papel, // --papel: pantalla de arranque, el mismo fondo que la pagina
    categories: ['shopping'],
    icons: [
      { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
