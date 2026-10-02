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
3. `cd front && npm install`, configurar `.env` (desde `.env.example`) con la URL del backend,
   `npm run dev`.

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
