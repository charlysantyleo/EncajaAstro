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
modo sin conexión es la práctica P3-3: por ahora el service worker solo guarda el JavaScript y los iconos, y
las páginas siempre se piden a la red.

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
