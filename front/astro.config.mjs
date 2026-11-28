import { readFileSync, writeFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { AstroPWAIntegration } from '@vite-pwa/astro';
import { token } from './scripts/tokens.mjs';
import { manifiesto } from './src/pwa/manifiesto.mjs';

// ---------------------------------------------------------------- idiomas (practica P3-4)
// Los idiomas de la tienda. El primero es el base: va sin prefijo (/categoria/frenos/); los demas con su codigo
// (/en/category/brakes/). Cada uno necesita su archivo src/i18n/idiomas/<codigo>.json.
// Agregar uno: `npm run i18n:nuevo fr`, traducir src/i18n/idiomas/fr.json y agregar 'fr' aqui. Nada mas.
const IDIOMAS = ['es', 'en'];
const [IDIOMA_BASE] = IDIOMAS;
const DATOS = Object.fromEntries(
  IDIOMAS.map((codigo) => [codigo, JSON.parse(readFileSync(new URL(`./src/i18n/idiomas/${codigo}.json`, import.meta.url), 'utf-8'))])
);
const prefijo = (codigo) => (codigo === IDIOMA_BASE ? '' : `/${codigo}`);

// Paginas que no van en el sitemap ni deben indexarse: las de cada visitante (cuenta, pedidos, panel; solo en el
// idioma base) y, en cada idioma, la nota, la busqueda y los respaldos /producto y /categoria sin slug.
const SOLO_BASE = ['admin', 'checkout', 'pago', 'comprobante', 'entrar', 'restablecer', 'garage', 'vehiculo'];
function esPrivada(ruta) {
  const limpia = ruta.replace(/\/$/, '') || '/';
  if (SOLO_BASE.some((p) => limpia === `/${p}` || limpia.startsWith(`/${p}/`))) return true;
  return IDIOMAS.some((codigo) => {
    const { carrito, busqueda, producto, categoria } = DATOS[codigo].rutas;
    return [carrito, busqueda, producto, categoria].some((segmento) => limpia === `${prefijo(codigo)}/${segmento}`);
  });
}

// Netlify: una pieza o sistema creado despues del build no tiene pagina generada; su URL limpia se resuelve en el
// navegador con la pagina de respaldo de su idioma (?slug=). Se escribe dist/_redirects desde los mismos datos.
function redireccionesPorIdioma() {
  return {
    name: 'encaja-redirecciones',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const lineas = IDIOMAS.flatMap((codigo) => {
          const { categoria, producto, busqueda } = DATOS[codigo].rutas;
          const pre = prefijo(codigo);
          return [`${pre}/${categoria}/*  ${pre}/${busqueda}?slug=:splat  302`, `${pre}/${producto}/*  ${pre}/${producto}?slug=:splat  302`];
        });
        writeFileSync(new URL('_redirects', dir), `# Generado en el build (astro.config.mjs): respaldo de paginas nuevas por idioma.\n${lineas.join('\n')}\n`);
      },
    },
  };
}

// ---------------------------------------------------------------- PWA (practicas P3-2 y P3-3)
// El manifiesto le da a la tienda nombre, icono y ventana propia al instalarla. Los colores salen de los tokens de
// src/styles/global.css y los textos del JSON del idioma; el de los demas idiomas lo sirve
// src/pages/[...idioma]/manifest.webmanifest.js. Los iconos se generan con `node scripts/iconos-pwa.mjs`.
const pwa = AstroPWAIntegration({
  manifest: manifiesto(DATOS[IDIOMA_BASE], '', { rojo: token('rojo'), papel: token('papel') }),
  // Sin conexion (practica P3-3): service worker propio (src/sw.js) con el ciclo install -> activate -> fetch
  // escrito a mano. El plugin lo compila y le inyecta la lista del shell (self.__WB_MANIFEST).
  strategies: 'buildSW',
  // Se registra a mano en Base.astro (virtual:pwa-register).
  injectRegister: false,
  // Una version nueva espera a que el usuario pulse "Actualizar" (no se recarga sola a mitad de un pago).
  registerType: 'prompt',
  buildSW: {
    swSrc: 'src/sw.js',
    // El shell que se guarda al instalar: el inicio y la nota de cada idioma (la nota funciona sin red) y
    // offline.html; todo el JavaScript; la fuente del texto (solo latin); el logo. El CSS va dentro del HTML
    // (build.inlineStylesheets) y los iconos y el manifiesto los agrega el plugin.
    globPatterns: [
      ...IDIOMAS.flatMap((codigo) => {
        const carpeta = prefijo(codigo).slice(1);
        const en = (ruta) => (carpeta ? `${carpeta}/${ruta}` : ruta);
        return [en('index.html'), en(`${DATOS[codigo].rutas.carrito}/index.html`)];
      }),
      'offline.html',
      '_astro/**/*.{js,css}',
      '_astro/geist-latin-wght-normal.*.woff2',
      '_astro/geist-mono-latin-wght-normal.*.woff2',
      'marca/logo*.webp',
      'favicon.ico',
      'apple-touch-icon.png',
    ],
    // carrito/index.html se pide como /carrito/ (con diagonal final, como los enlaces de la tienda).
    manifestTransforms: [
      (entradas) => ({
        manifest: entradas.map((e) => ({
          ...e,
          url: e.url === 'index.html' ? '/' : e.url.endsWith('/index.html') ? `/${e.url.slice(0, -'index.html'.length)}` : e.url.endsWith('.html') ? `/${e.url}` : e.url,
        })),
        warnings: [],
      }),
    ],
  },
});

// Salida estatica: `npm run build` genera dist/ servible en cualquier hosting estatico.
export default defineConfig({
  output: 'static',
  // URL publica de la tienda: canonical, Open Graph y sitemap.xml la necesitan absoluta.
  // Netlify define URL en cada build; SITE_URL permite fijarla a mano (por ejemplo, un dominio propio).
  site: process.env.SITE_URL || process.env.URL || 'http://localhost:4321',
  // Multi-idioma: i18n nativo de Astro. Los componentes leen esta misma lista (astro:config/client).
  i18n: {
    defaultLocale: IDIOMA_BASE,
    locales: IDIOMAS,
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    react(),
    sitemap({ filter: (pagina) => !esPrivada(new URL(pagina).pathname) && !/\.[a-z]+$/.test(new URL(pagina).pathname) }),
    pwa,
    redireccionesPorIdioma(),
  ],
  // El CSS va dentro del HTML: sin la peticion extra que bloqueaba el primer pintado (~450 ms en mobile).
  build: { inlineStylesheets: 'always' },
  // Al pasar el cursor (o enfocar) un enlace interno, Astro baja esa pagina por adelantado.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
