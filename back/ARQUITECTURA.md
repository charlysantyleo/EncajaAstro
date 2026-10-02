# Arquitectura hexagonal del backend

## La idea

El **negocio** (qué es un pedido válido, quién puede ver qué vehículo) vive en el centro y no sabe nada de tecnología. La **tecnología** (GraphQL, Postgres, JWT, Google) vive en los bordes, y se conecta al centro por **puertos**: contratos que dicen *qué* se necesita, sin decir *cómo* se hace.

```
                 ADAPTADORES DE ENTRADA                       ADAPTADORES DE SALIDA
             (cómo llegan las peticiones)                  (cómo se guardan/obtienen cosas)

   GraphQL (resolvers) ─┐                                 ┌─▶ Postgres (repositorios SQL)
   HTTP /auth/google ───┤      ┌──────────────────┐       ├─▶ JWT (tokens)
   WebSocket ───────────┼────▶ │   APLICACIÓN     │ ──────┼─▶ bcrypt (contraseñas)
                        │      │  (casos de uso)  │PUERTOS├─▶ Google OAuth2 (identidad)
                        │      │  ┌────────────┐  │       └─▶ PubSub en memoria (eventos)
                        │      │  │  DOMINIO   │  │
                        │      │  │  (reglas)  │  │
                        │      │  └────────────┘  │
                        │      └──────────────────┘
```

**La regla de oro:** las dependencias apuntan **hacia adentro**.
- El dominio no importa nada de afuera.
- La aplicación solo importa el dominio.
- Los adaptadores importan la aplicación, nunca al revés.
- El único archivo que conoce todas las piezas es `src/contenedor.js`.

## Las capas

| Capa | Carpeta | Qué contiene | Ejemplo |
|---|---|---|---|
| **Dominio** | `src/dominio/` | Reglas puras: sin SQL, sin HTTP, sin librerías | `armarLinea()` revisa cantidad y stock; `exigirDueno()` revisa que el vehículo sea tuyo |
| **Aplicación** | `src/aplicacion/` | Casos de uso: orquestan reglas y puertos | `registrarPedido`: valida, abre transacción, guarda, avisa el stock |
| **Puertos** | `src/puertos/salida.js` | Contratos de lo que la aplicación necesita | `repos.productos.porId(id)`, `tokens.crear(usuario)` |
| **Adaptadores de entrada** | `src/adaptadores/entrada/` | Reciben peticiones y llaman casos de uso | `resolvers.js` (GraphQL), `rutasGoogle.js`, `servidor.js` |
| **Adaptadores de salida** | `src/adaptadores/salida/` | Implementan los puertos con una tecnología concreta | `postgres/repositorios.js` (SQL), `seguridad/tokensJwt.js` |
| **Contenedor** | `src/contenedor.js` | Conecta cada puerto con su adaptador | `tokens = crearTokensJwt(...)` |

## Recorrido de una petición: comprar

1. **Entrada.** GraphQL recibe `registrarPedido`. `adaptadores/entrada/graphql/resolvers.js` solo hace:
   `registrarPedido: (_, { datos }, { actor }) => pedidos.registrarPedido(actor, datos)`.
2. **Aplicación.** `aplicacion/pedidos.js` orquesta todo:
   - pide al dominio validar los items;
   - si hay vehículo, revisa que sea tuyo;
   - abre una `transaccion`;
   - por cada pieza llama `armarLinea()` del dominio, que valida cantidad y stock;
   - guarda con `tx.pedidos.crear(...)`;
   - avisa el stock nuevo con `eventos.stockCambio(...)`.
3. **Dominio.** `dominio/reglas.js` decide si la cantidad y el stock son válidos y calcula el total. No sabe que existe una base de datos.
4. **Salida.** `adaptadores/salida/postgres/repositorios.js` traduce `tx.pedidos.crear(...)` a `INSERT INTO pedido ...`.
5. **Errores.** Si el dominio lanza `NoAutenticado` o `Prohibido`, el adaptador GraphQL (`graphql/errores.js`) lo traduce a `UNAUTHENTICATED` o `FORBIDDEN`.

## ¿Dónde cambio...?

| Quiero... | Archivo(s) | ¿Toco algo más? |
|---|---|---|
| Cambiar una regla, p. ej. "contraseña de 10 caracteres" o "no vender si quedan menos de 2" | `src/dominio/reglas.js` | No |
| Cambiar quién puede hacer qué | `src/dominio/permisos.js`, o la línea `exigir...` del caso de uso | No |
| Agregar un caso de uso nuevo, p. ej. "cancelar pedido" | `src/aplicacion/pedidos.js` + una línea en `graphql/resolvers.js` + el tipo en `graphql/schema.js` | Si necesita datos nuevos: un método en `repositorios.js` y en el contrato de `puertos/salida.js` |
| Cambiar una consulta SQL o el nombre de una columna | `src/adaptadores/salida/postgres/repositorios.js` | No: es el único lugar con SQL |
| Cambiar Postgres por otra base | Un adaptador nuevo con la misma forma que `repositorios.js` + una línea en `contenedor.js` | No |
| Cambiar Google por GitHub, Microsoft, etc. | Un adaptador nuevo como `google/identidadGoogle.js` + una línea en `contenedor.js` | No |
| Cambiar JWT por sesiones en servidor | Un adaptador nuevo con la forma de `Tokens` + una línea en `contenedor.js` | No |
| Usar varios servidores (stock en vivo compartido) | Un adaptador de eventos con Redis + una línea en `contenedor.js` | No |
| Exponer una API REST además de GraphQL | Un adaptador de entrada nuevo que llame a los mismos casos de uso | No |
| Cambiar puerto, URL del front o secretos | `.env` (se lee en `src/config.js`) | No |

## Por qué ayuda

- **Cambios localizados.** Cada tipo de cambio tiene un solo lugar. El SQL ya no está mezclado con las reglas ni con GraphQL.
- **Se puede probar el negocio sin base de datos.** Un caso de uso recibe sus puertos como parámetros, así que en una prueba se le pasan repositorios falsos en memoria.
- **La tecnología es reemplazable.** Postgres, JWT, Google y GraphQL son detalles conectados en `contenedor.js`.

## Nota sobre este refactor

La API GraphQL **no cambió**: mismo schema, mismas respuestas y mismos mensajes de error. Antes y después del cambio se corrió una batería de 78 consultas, permisos y errores, y las respuestas salieron idénticas. También se probaron las escrituras (comprar, bitácora, cuentas, administración) y el stock en tiempo real. El front no necesitó ningún cambio.
