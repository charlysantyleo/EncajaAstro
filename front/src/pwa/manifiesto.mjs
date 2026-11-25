// Manifiesto de la PWA en cada idioma (P3-2 instalable, P3-4 multi-idioma). El espanol lo genera @vite-pwa/astro
// (astro.config.mjs) y el ingles lo sirve src/pages/en/manifest.webmanifest.js. Mismo id ('/'): es la misma app,
// solo cambian el nombre, la descripcion, el idioma y la pagina de inicio.

// Valor de un token de color del primer :root (tema claro) de global.css.
export function tokenDe(css, nombre) {
  const inicio = css.indexOf(':root {');
  const raiz = css.slice(inicio, css.indexOf('}', inicio));
  const valor = raiz.match(new RegExp(`--${nombre}:\\s*(#[0-9a-fA-F]{3,8})\\b`))?.[1];
  if (!valor) throw new Error(`No encontre el token --${nombre} en global.css`);
  return valor.toLowerCase();
}

const TEXTOS = {
  es: {
    name: 'EnCaja Autopartes',
    description: 'Refacciones para tu auto con compatibilidad verificada por marca, modelo y año.',
    lang: 'es-MX',
    start_url: '/',
  },
  en: {
    name: 'EnCaja Auto Parts',
    description: 'Parts for your car with fitment verified by make, model and year.',
    lang: 'en-US',
    start_url: '/en/',
  },
};

export function manifiesto(idioma, { rojo, papel }) {
  const textos = TEXTOS[idioma] ?? TEXTOS.es;
  return {
    id: '/',
    name: textos.name,
    short_name: 'EnCaja',
    description: textos.description,
    lang: textos.lang,
    dir: 'ltr',
    start_url: textos.start_url,
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
