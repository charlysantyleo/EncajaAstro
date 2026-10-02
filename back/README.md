# EnCaja Autopartes — Backend

API GraphQL sobre Express 5, con Apollo Server 5 para las queries y mutations,
y `graphql-ws` sobre WebSocket para las subscriptions. Los datos viven en
PostgreSQL (pensado para un Postgres en la nube), con `pg` como driver, sin
ORM.

## Requisitos

- Node.js 22 LTS
- Una base de datos PostgreSQL accesible por internet (ver mas abajo como
  crear una gratis en Neon)

## Configuracion

```bash
cd back
npm install
cp .env.example .env
```

Edita `.env` y pon tu connection string en `DATABASE_URL`. La mayoria de los
proveedores en la nube (Neon, Supabase, Render) exigen SSL; con
`DATABASE_SSL=true` (el valor por defecto) ya queda cubierto. Si conectas
contra un Postgres local sin SSL, pon `DATABASE_SSL=false`.

## Crear las tablas y la semilla

La base no se auto-inicializa al arrancar el servidor, a diferencia de la
version anterior con SQLite: en un Postgres en la nube esa inicializacion se
hace una sola vez, de forma explicita.

```bash
npm run db:init
```

Esto ejecuta `db.sql` contra `DATABASE_URL`: crea las tablas
(`usuario`, `categoria`, `producto`, `vehiculo`, `compatibilidad`, `pedido`,
`detalle_pedido`, `mantenimiento`) y carga los datos semilla (usuarios demo,
categorias, 16 productos, 5 vehiculos y sus compatibilidades).

## Correr el servidor

```bash
npm start
```

Deja el servidor escuchando en `http://localhost:4000/graphql` para queries y
mutations, y en `ws://localhost:4000/graphql` para subscriptions (mismo
puerto, mismo path: Express y el `WebSocketServer` comparten el mismo
`http.Server`).

## Subscriptions

`stockActualizado(productoId: ID)` se dispara cada vez que cambia el stock de
un producto: al registrar un pedido (`registrarPedido`) o al editar un
producto desde el catalogo (`actualizarProducto`). Sin argumento, la
subscription recibe el evento de cualquier producto; con `productoId`, solo
los de esa pieza. El frontend la usa para refrescar el stock que se ve en el
catalogo sin recargar la pagina.

## Estructura (arquitectura hexagonal)

El backend esta organizado en capas: el negocio en el centro y la tecnologia
(GraphQL, Postgres, JWT, Google) en los bordes. La explicacion completa, con
"donde cambio X", esta en [`ARQUITECTURA.md`](ARQUITECTURA.md).

```
back/
├── index.js                  Arranque: arma la app y levanta el servidor
├── src/
│   ├── dominio/              Reglas puras: permisos, validaciones, errores
│   ├── aplicacion/           Casos de uso: catalogo, garage, pedidos, cuentas
│   ├── puertos/salida.js     Contratos que la aplicacion necesita (repos, tokens...)
│   ├── adaptadores/
│   │   ├── entrada/          GraphQL (schema + resolvers) y HTTP (servidor, rutas de Google)
│   │   └── salida/           Postgres, JWT, bcrypt, Google, eventos en memoria
│   ├── contenedor.js         Conecta cada puerto con su adaptador
│   └── config.js             Variables de entorno
├── db.sql                    Esquema + datos semilla, dialecto Postgres
├── scripts/                  init-db.js (crea tablas) y demo-passwords.js
└── .env.example
```

## Las dos mutations de negocio

- `registrarPedido`: valida stock y compatibilidad con el vehiculo, calcula
  el total, descuenta existencias y crea el pedido con su detalle. Todo
  dentro de una transaccion (`BEGIN`/`COMMIT`/`ROLLBACK` sobre un cliente del
  pool); si algo falla, no queda nada a medio guardar.
- `registrarMantenimiento`: valida que la pieza (si se referencia) sea
  compatible con el vehiculo, que el pedido (si se referencia) realmente
  incluya esa pieza, y que el kilometraje no retroceda. Guarda el registro en
  la bitacora y actualiza el odometro del vehiculo, tambien en una
  transaccion.
