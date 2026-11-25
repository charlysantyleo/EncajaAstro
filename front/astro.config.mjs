import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { AstroPWAIntegration } from '@vite-pwa/astro';
import { token } from './scripts/tokens.mjs';
import { manifiesto } from './src/pwa/manifiesto.mjs';

// Paginas que no van en el sitemap ni deben indexarse: dependen de la sesion o de un pedido, o son la busqueda
// (/categoria/, /en/search/) y el respaldo de piezas nuevas (/producto/, /en/product/), que llevan noindex.
// Con o sin el prefijo /en.
const PRIVADAS =
  /^\/(en\/)?((admin|carrito|cart|checkout|pago|comprobante|entrar|restablecer|garage|vehiculo|search)(\/|$)|(categoria|producto|product|category)\/?$)/;

// PWA instalable (practica P3-2) y sin conexion (P3-3). El manifiesto le da a la tienda nombre, icono y ventana
// propia al instalarla.
// Los colores salen de los tokens de src/styles/global.css. Los iconos se generan con `node scripts/iconos-pwa.mjs`.
// El manifiesto en espanol lo genera el plugin; el de ingles, src/pages/en/manifest.webmanifest.js (P3-4).
const pwa = AstroPWAIntegration({
  manifest: manifiesto('es', { rojo: token('rojo'), papel: token('papel') }),
  // Sin conexion (practica P3-3): service worker propio (src/sw.js) con el ciclo install -> activate -> fetch
  // escrito a mano. El plugin lo compila y le inyecta la lista del shell (self.__WB_MANIFEST).
  strategies: 'buildSW',
  // Se registra a mano en Base.astro (virtual:pwa-register).
  injectRegister: false,
  // Una version nueva espera a que el usuario pulse "Actualizar" (no se recarga sola a mitad de un pago).
  registerType: 'prompt',
  buildSW: {
    swSrc: 'src/sw.js',
    // El shell que se guarda al instalar: inicio, la nota (funciona sin red) y offline.html; todo el JavaScript;
    // la fuente del texto (solo latin); el logo. El CSS va dentro del HTML (build.inlineStylesheets) y los
    // iconos y el manifiesto los agrega el plugin.
    globPatterns: [
      'index.html',
      'carrito/index.html',
      'en/index.html',
      'en/cart/index.html',
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
  // Multi-idioma (practica P3-4): espanol sin prefijo (/categoria/frenos/) e ingles con /en (/en/category/brakes/).
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    react(),
    sitemap({ filter: (pagina) => !PRIVADAS.test(new URL(pagina).pathname) && !/\.[a-z]+$/.test(new URL(pagina).pathname) }),
    pwa,
  ],
  // El CSS va dentro del HTML: sin la peticion extra que bloqueaba el primer pintado (~450 ms en mobile).
  build: { inlineStylesheets: 'always' },
  // Al pasar el cursor (o enfocar) un enlace interno, Astro baja esa pagina por adelantado.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
