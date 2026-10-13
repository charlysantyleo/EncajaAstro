import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Salida estatica: `npm run build` genera dist/ servible en cualquier hosting estatico.
export default defineConfig({
  output: 'static',
  integrations: [react()],
  // Al pasar el cursor (o enfocar) un enlace interno, Astro baja esa pagina por adelantado.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
