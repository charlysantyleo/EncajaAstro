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
`detalle_pedido`, `pago`, `entrega`, `direccion`, `mantenimiento`, `ajuste`, `imagen`, `catalogo_vehiculo`) y carga
los datos semilla (usuarios demo, categorias, 16 productos, 5 vehiculos y sus compatibilidades) y el catalogo de
vehiculos de `datos/vehiculos.json`.

Si tu base se creo antes de los cobros, agrega la tabla `pago` con
`npm run db:pagos`; si se creo antes de pedir los datos de entrega, agrega
las tablas `entrega` y `direccion` con `npm run db:entregas`; si se creo antes del
panel, agrega las tablas `ajuste` (costo de envio y descuento de taller) e `imagen`
(fotos de productos subidas desde el panel) con `npm run db:panel`; si se creo antes del
catalogo de vehiculos, crealo y convierte las compatibilidades a rangos de años con
`npm run db:vehiculos` (ninguno borra datos, y se pueden correr mas de una vez). Como configurar Mercado Pago y PayPal:
[`../PAGOS.md`](../PAGOS.md).

## Catalogo de vehiculos

Los clientes eligen su coche de una lista compartida (marca, modelo, año y motor) en lugar de escribirlo,
y cada compatibilidad dice "esta pieza embona en Nissan Versa 2012–2019" (opcionalmente "solo con motor
1.6L 4 cil."). Asi el administrador registra una pieza una sola vez y le aparece a todo cliente con ese coche.

La lista sale de tres fuentes gratuitas y queda guardada en `datos/vehiculos.json`:

| Fuente | Que aporta |
|---|---|
| INEGI, Registro Administrativo de la Industria Automotriz de Vehiculos Ligeros (ventas mensuales por modelo) | Que modelos se venden en Mexico y en que años (desde 2005) |
| NHTSA vPIC (gobierno de EE. UU.) | El nombre oficial de cada modelo y su marca real (INEGI escribe "Sentra 4 PTS" o "General Motors") |
| FuelEconomy.gov (EPA, gobierno de EE. UU.) | Los motores de cada modelo y año, y los años anteriores a 2005 |

```bash
npm run vehiculos:armar   # vuelve a descargar las fuentes y regenera datos/vehiculos.json (unos minutos)
npm run db:vehiculos      # carga el JSON a la base (y en bases viejas convierte las compatibilidades)
```

`vehiculos:armar` solo hace falta de vez en cuando (por ejemplo, una vez al año, para los modelos nuevos);
el JSON resultante se sube al repositorio. Lo que el administrador agrega o corrige en **Panel → Vehiculos**
queda marcado como `PANEL` y la carga no lo pisa. Los modelos que solo se venden en Mexico no traen motores
(las fuentes de motores son de EE. UU.): el garage ofrece entonces una lista general de motores.

Fuente de las ventas por modelo: INEGI, Registro Administrativo de la Industria Automotriz de Vehiculos
Ligeros (RAIAVL), usado bajo sus [terminos de libre uso](https://www.inegi.org.mx/inegi/terminos.html).

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
│   ├── aplicacion/           Casos de uso: catalogo, garage, vehiculos, pedidos, pagos, direcciones, cuentas
│   ├── puertos/salida.js     Contratos que la aplicacion necesita (repos, tokens...)
│   ├── adaptadores/
│   │   ├── entrada/          GraphQL (schema + resolvers) y HTTP (servidor, rutas de Google, webhook de pagos)
│   │   └── salida/           Postgres, JWT, bcrypt, Google, pasarelas de pago, eventos en memoria
│   ├── contenedor.js         Conecta cada puerto con su adaptador
│   └── config.js             Variables de entorno
├── db.sql                    Esquema + datos semilla, dialecto Postgres
├── datos/vehiculos.json      Catalogo de vehiculos (INEGI + NHTSA + FuelEconomy.gov)
├── scripts/                  init-db.js (crea tablas), migrar-*.js, demo-passwords.js y vehiculos/ (armar y cargar el catalogo)
└── .env.example
```

## Las dos mutations de negocio

- `registrarPedido`: valida stock y compatibilidad con el vehiculo, revisa los
  datos de entrega (telefono y, si es a domicilio, la direccion y que este en
  cobertura), calcula el total con el costo de envio, descuenta existencias y
  crea el pedido con su detalle, su entrega y su pago. El costo del envio, el
  importe para que salga gratis y los municipios con cobertura estan en
  `src/dominio/entregas.js`; el checkout los lee con `reglasDeEnvio`.
  Todo dentro de una transaccion (`BEGIN`/`COMMIT`/`ROLLBACK` sobre un cliente
  del pool); si algo falla, no queda nada a medio guardar. Despues inicia el
  cobro con el metodo elegido; si la pasarela lo rechaza, el pedido se cancela
  y las piezas regresan al inventario.
- `registrarMantenimiento`: valida que la pieza (si se referencia) sea
  compatible con el vehiculo, que el pedido (si se referencia) realmente
  incluya esa pieza, y que el kilometraje no retroceda. Guarda el registro en
  la bitacora y actualiza el odometro del vehiculo, tambien en una
  transaccion.
