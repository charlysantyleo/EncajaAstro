import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// Paginas que no van en el sitemap ni deben indexarse: dependen de la sesion o de un pedido, o son la busqueda
// (/categoria/) y el respaldo de piezas nuevas (/producto/), que llevan noindex.
const PRIVADAS = /^\/((admin|carrito|checkout|pago|comprobante|entrar|restablecer|garage|vehiculo)(\/|$)|(categoria|producto)\/?$)/;

// Salida estatica: `npm run build` genera dist/ servible en cualquier hosting estatico.
export default defineConfig({
  output: 'static',
  // URL publica de la tienda: canonical, Open Graph y sitemap.xml la necesitan absoluta.
  // Netlify define URL en cada build; SITE_URL permite fijarla a mano (por ejemplo, un dominio propio).
  site: process.env.SITE_URL || process.env.URL || 'http://localhost:4321',
  integrations: [react(), sitemap({ filter: (pagina) => !PRIVADAS.test(new URL(pagina).pathname) })],
  // El CSS va dentro del HTML: sin la peticion extra que bloqueaba el primer pintado (~450 ms en mobile).
  build: { inlineStylesheets: 'always' },
  // Al pasar el cursor (o enfocar) un enlace interno, Astro baja esa pagina por adelantado.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
