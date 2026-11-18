import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { AstroPWAIntegration } from '@vite-pwa/astro';
import { token } from './scripts/tokens.mjs';

// Paginas que no van en el sitemap ni deben indexarse: dependen de la sesion o de un pedido, o son la busqueda
// (/categoria/) y el respaldo de piezas nuevas (/producto/), que llevan noindex.
const PRIVADAS = /^\/((admin|carrito|checkout|pago|comprobante|entrar|restablecer|garage|vehiculo)(\/|$)|(categoria|producto)\/?$)/;

// PWA instalable (practica P3-2). El manifiesto le da a la tienda nombre, icono y ventana propia al instalarla.
// Los colores salen de los tokens de src/styles/global.css. Los iconos se generan con `node scripts/iconos-pwa.mjs`.
const pwa = AstroPWAIntegration({
  manifest: {
    id: '/',
    name: 'EnCaja Autopartes',
    short_name: 'EnCaja',
    description: 'Refacciones para tu auto con compatibilidad verificada por marca, modelo y año.',
    lang: 'es-MX',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone', // ventana propia, sin barra de direcciones ni pestanas
    theme_color: token('rojo'), // #e10600: barra de titulo de la ventana instalada
    background_color: token('papel'), // #f7f7f5: pantalla de arranque, el mismo fondo que la pagina
    categories: ['shopping'],
    icons: [
      { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  // El service worker se registra a mano en Base.astro (virtual:pwa-register).
  injectRegister: false,
  // Sin recargas sorpresa: una version nueva espera a que se cierren las pestanas (no corta un pago a la mitad).
  registerType: 'prompt',
  generateSW: {
    // Aqui el foco es que se pueda instalar; el modo sin conexion es la practica P3-3. Por eso solo se guardan
    // el JavaScript (con hash, nunca cambia de contenido) y el logo; las paginas siempre se piden a la red, para
    // que nunca se muestre un catalogo, una nota o un panel viejos.
    globPatterns: ['_astro/**/*.{js,css}', 'marca/logo*.webp'],
    navigateFallback: null,
    cleanupOutdatedCaches: true,
  },
});

// Salida estatica: `npm run build` genera dist/ servible en cualquier hosting estatico.
export default defineConfig({
  output: 'static',
  // URL publica de la tienda: canonical, Open Graph y sitemap.xml la necesitan absoluta.
  // Netlify define URL en cada build; SITE_URL permite fijarla a mano (por ejemplo, un dominio propio).
  site: process.env.SITE_URL || process.env.URL || 'http://localhost:4321',
  integrations: [react(), sitemap({ filter: (pagina) => !PRIVADAS.test(new URL(pagina).pathname) }), pwa],
  // El CSS va dentro del HTML: sin la peticion extra que bloqueaba el primer pintado (~450 ms en mobile).
  build: { inlineStylesheets: 'always' },
  // Al pasar el cursor (o enfocar) un enlace interno, Astro baja esa pagina por adelantado.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
