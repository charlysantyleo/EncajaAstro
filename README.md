# EnCaja Autopartes

Version del proyecto sobre el stack: Astro (con islas de React) en el frontend, Express 5 +
Apollo Server 5 (GraphQL) en el backend, subscriptions por WebSocket con
`graphql-ws` para el stock en tiempo real, y PostgreSQL en la nube como base
de datos.

- `back/` — API GraphQL. Ver `back/README.md`.
- `front/` — aplicacion Astro + React. Ver `front/README.md`.

## Orden para levantarlo

1. Crear una base PostgreSQL en la nube (guia abajo) y obtener su connection
   string.
2. `cd back && npm install`, configurar `.env` con ese connection string y
   un `JWT_SECRET` (ver `.env.example`), correr `npm run db:init` una vez y
   despues `npm start`. Autenticacion (JWT + Google): ver `AUTENTICACION.md`.
   Cobros (Mercado Pago + PayPal): ver `PAGOS.md`.
3. `cd front && npm install`, configurar `.env` (desde `.env.example`) con la URL del backend,
   `npm run dev`.

## Práctica P3-1: auditoría de calidad (Lighthouse)

Lighthouse se corre sobre el **build de producción**, no sobre `npm run dev`: el servidor de desarrollo no
empaqueta ni minifica y agrega la barra de herramientas de Astro, que cambia los puntajes.

1. Levanta el backend (`cd back && npm start`): el build del front lee de él las categorías y los productos
   para generar sus páginas.
2. Construye y sirve el front:
   ```bash
   cd front
   npm run build
   npm run preview
   ```
3. En Chrome abre cada página, `DevTools → Lighthouse → Mode: Navigation → Device: Mobile → Analyze page load`:

| Página | URL (con `npm run preview`) |
|---|---|
| Home | `http://localhost:4321/` |
| Categoría | `http://localhost:4321/categoria/electrico/` (o cualquier `/categoria/<sistema>/`) |
| Producto | `http://localhost:4321/producto/bc-4021-balatas-delanteras-ceramicas/` (o cualquier `/producto/<número de parte>-<nombre>/`) |

También se generan `sitemap-index.xml` y `robots.txt` (en `front/dist`). En Netlify la URL pública se toma
sola (variable `URL`); para otro hosting, define `SITE_URL` al construir.

## Práctica P3-2: PWA instalable

La tienda se puede instalar como aplicación (icono, nombre y ventana propia) gracias al manifiesto que genera
[`@vite-pwa/astro`](https://github.com/vite-pwa/astro).

| Qué | Dónde |
|---|---|
| Integración y manifiesto (`name`, `short_name`, `start_url`, `scope`, `display: standalone`, `theme_color`, `background_color`, `icons`) | `front/astro.config.mjs` |
| Colores del manifiesto, leídos de los tokens de diseño (`--rojo` → `theme_color`, `--papel` → `background_color`) | `front/scripts/tokens.mjs` ← `front/src/styles/global.css` |
| Iconos 192, 512 y maskable 512 (logo dentro del 80 % central), con los mismos tokens | `front/scripts/iconos-pwa.mjs` → `front/public/pwa-*.png`, `maskable-icon-512x512.png` |
| `<link rel="manifest">`, color de la ventana instalada y registro del service worker | `front/src/layouts/Base.astro` |
| Bono: botón propio "Instalar la app" con `beforeinstallprompt` | `front/src/components/Pie.astro` |

El manifiesto y el service worker **solo existen en el build** (en `npm run dev` no hay nada que instalar):

```bash
cd front
npm run build
npm run preview
```

1. Abre `http://localhost:4321/` en Chrome o Edge → `DevTools → Application → Manifest`: nombre, colores e
   iconos, sin errores en *Installability*.
2. Instala con el icono de la barra de direcciones o con el botón **Instalar la app** del pie de página. En el
   teléfono, abre el sitio publicado (HTTPS) → menú → *Instalar aplicación* / *Agregar a pantalla principal*.
3. Lighthouse 12 (el de Chrome actual) ya no trae la categoría PWA. Para el reporte de instalabilidad se usa
   Lighthouse 11, la última versión que la tiene:
   ```bash
   npx lighthouse@11.7.1 http://localhost:4321/ --only-categories=pwa --view
   ```

Para regenerar los iconos si cambia el logo o el color: `node scripts/iconos-pwa.mjs` (desde `front/`). El
modo sin conexión se agregó en la práctica P3-3 (abajo).

## Práctica P3-3: la tienda sin conexión (Service Worker)

La tienda sigue funcionando sin red: el catálogo y las fichas que ya visitaste se ven, la nota funciona, y lo que
no está guardado muestra un mensaje claro. Todo vive en un service worker propio, `front/src/sw.js`, que
`@vite-pwa/astro` compila (estrategia `buildSW`) e inyecta con la lista del shell.

| Pieza | Qué hace | Dónde |
|---|---|---|
| Registro | `registerSW` en todas las páginas; franja de estado: sin conexión, versión nueva, listo para usarse sin red | `front/src/layouts/Base.astro` |
| `install` | Precache del shell: inicio, nota y `offline.html`; todo el JavaScript; la fuente del texto; logo, iconos y manifiesto (el CSS va dentro del HTML) | `front/src/sw.js`, lista en `front/astro.config.mjs` |
| `activate` | Borra las caches de versiones anteriores y `clients.claim()` | `front/src/sw.js` |
| `fetch` | **Network-first** para páginas y para el catálogo/ficha de la API GraphQL; **cache-first** para JS, imágenes y fuentes | `front/src/sw.js` |
| Respaldo | `offline.html`: avisa qué página no está guardada y lista las que sí | `front/public/offline.html` |
| Actualización | La versión nueva espera; la franja ofrece **Actualizar** → `skipWaiting` + `clients.claim` → una sola recarga | `front/src/sw.js`, `Base.astro` |
| Bono | Un servicio de la bitácora anotado sin red se guarda en IndexedDB y se envía con **Background Sync**; al terminar, **notificación** | `front/src/sw.js`, `front/src/components/MantenimientoModal.jsx` |

**Probarlo** (el service worker solo existe en el build, no en `npm run dev`):

```bash
cd front
npm run build
npm run preview
```

1. Abre `http://localhost:4321/` y navega con internet: una categoría, la ficha de una pieza, agrega algo a la nota.
2. `DevTools → Application → Service workers`: `sw.js` *activated and is running*. En *Cache storage* aparecen
   `encaja-shell-…`, `encaja-paginas-…`, `encaja-recursos-…` y `encaja-api-…`.
3. `DevTools → Network → Offline` (o *Offline* en Application → Service workers) y recarga: lo visitado se ve con
   la franja roja "Sin conexión"; una página nueva muestra `offline.html`; la nota sigue funcionando.
4. Para ver la actualización limpia, cambia algo visible (un texto), vuelve a correr `npm run build` con el preview
   abierto y recarga: aparece "Hay una versión nueva" con el botón **Actualizar**. Si el contenido no cambia,
   `sw.js` sale igual y no hay versión nueva.

Al cerrar sesión se borran las respuestas guardadas de la API (llevan precios y vehículos de la cuenta).

## Práctica P3-4: cualquier pantalla y dos idiomas

La tienda se adapta a teléfono, tableta, escritorio y a la ventana de la PWA instalada, y se ve en español o en
inglés.

**Multi-plataforma** (`front/src/styles/global.css` y `front/src/layouts/Base.astro`)

| Norma | Cómo se aplica |
|---|---|
| Viewport | `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` |
| Mobile-first | Las reglas base son las del teléfono (desde 320 px); al final del CSS solo hay `@media (min-width: 360px / 768px / 1200px)` que agregan lo que cabe |
| Sin scroll horizontal | Revisado en 320, 360, 390, 768, 1024, 1200 y 1440 px, y acostado en 740×360 y 844×390, en las 8 páginas públicas |
| Orientación y `dvh` | `@media (orientation: landscape) and (max-height: 500px)`: la cabecera deja de estar fija y los títulos se limitan con `dvh`. La app usa `min-height: 100dvh`; los diálogos, `92dvh` |
| Áreas seguras | `env(safe-area-inset-*)` en la cabecera (arriba), los márgenes laterales (`--lado-izq`/`--lado-der`), la nota fija y los diálogos (abajo) |
| PWA instalada | `@media (display-mode: standalone)`; la ventana es redimensionable y usa los mismos cortes |

**Multi-idioma** (i18n nativo de Astro en `front/astro.config.mjs`: `defaultLocale: 'es'`, `locales: ['es', 'en']`,
`prefixDefaultLocale: false`)

| Página | Español | Inglés |
|---|---|---|
| Inicio | `/` | `/en/` |
| Sistema | `/categoria/frenos/` | `/en/category/brakes/` |
| Pieza | `/producto/bc-4021-balatas-delanteras-ceramicas/` | `/en/product/bc-4021-front-ceramic-brake-pads/` |
| Nota | `/carrito` | `/en/cart` |
| Búsqueda | `/categoria?q=` | `/en/search?q=` |

- Cada página lleva `<html lang>`, `hreflang` (es, en y `x-default`) y un selector de idioma en la barra que lleva a la misma página en el otro idioma.
- Las páginas de `src/pages/` y `src/pages/en/` son envoltorios: el contenido está en `src/vistas/` y recibe el idioma.
- Textos de la interfaz: `src/i18n/textos.js` (la clave es el texto en español: `t('Agregar a la nota')`). Nombres y descripciones del catálogo: `src/i18n/catalogo.js` (por número de parte y por sistema).
- El manifiesto de la PWA también se traduce: `/en/manifest.webmanifest` (nombre, descripción, `lang` y `start_url: /en/`).
- Cuenta, garage, pago, comprobante y panel siguen solo en español. Una pieza agregada desde el panel sin traducción se ve con su nombre en español, y la búsqueda compara contra los nombres en español de la base.

Para revisarlo: `npm run build` y `npm run preview`, y en Chrome `DevTools → Toggle device toolbar` para los
anchos y la orientación. Para probarlo instalada, instala la app y cambia el idioma desde la barra (`ES`/`EN`).

## Crear un Postgres gratis en Neon

Neon (`neon.tech`) tiene un tier gratuito pensado justo para esto: da un
Postgres real, accesible por internet, sin tarjeta de credito.

1. Entra a `https://neon.tech` y crea una cuenta (con GitHub, Google o
   correo).
2. Crea un proyecto nuevo. Te va a pedir nombre del proyecto, region (elige
   una cercana, por ejemplo `US East` o `US West`) y version de Postgres
   (cualquiera reciente sirve, 16 o 17).
3. En el dashboard del proyecto, entra a la pestana **Connection Details** (o
   **Dashboard** segun la version de la interfaz). Ahi vas a ver un
   connection string que empieza con `postgresql://` — algo asi:

   ```
   postgresql://neondb_owner:AbCdEf123456@ep-cool-name-12345678.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

4. Copia ese connection string completo y pegalo como valor de
   `DATABASE_URL` en `back/.env` (a partir de `back/.env.example`).
5. Con eso ya puedes correr `npm run db:init` desde `back/` para crear las
   tablas y cargar los datos de ejemplo, y despues `npm start`.

El connection string de Neon ya incluye `sslmode=require`, y
`back/db.js`/`back/scripts/init-db.js` usan SSL por defecto
(`DATABASE_SSL=true`), asi que no hace falta tocar nada mas para que
funcione contra Neon.

Si prefieres otro proveedor (Supabase, Railway, Render, ElephantSQL...), el
procedimiento es el mismo: crear el proyecto, copiar su connection string de
Postgres y pegarlo en `DATABASE_URL`. El codigo no asume nada especifico de
Neon, solo un Postgres estandar accesible por `pg`.
