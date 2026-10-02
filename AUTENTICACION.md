# Autenticación en EnCaja: JWT + OAuth2 (Google)

## La idea en una frase

El usuario demuestra quién es **una vez** (con correo y contraseña, o con Google). El servidor le entrega un **JWT** y el front lo manda en cada petición. Así el backend sabe quién pide qué, sin guardar sesiones.

## 1. JWT (JSON Web Token)

Un JWT es un texto con tres partes separadas por puntos: `encabezado.datos.firma`.

- **Datos (payload):** `{ sub: "1", nombre, email, rol, exp }`. Cualquiera puede leerlos (solo están en base64), así que **nunca** se guarda ahí la contraseña.
- **Firma:** se calcula con `JWT_SECRET`, que solo conoce el servidor. Si alguien modifica los datos (por ejemplo, cambia su `rol` a `ADMIN`), la firma ya no coincide y el token se rechaza.
- **Vencimiento:** el token dura 7 días (`exp`). Después hay que volver a entrar.

En el código, el adaptador `back/src/adaptadores/salida/seguridad/tokensJwt.js` hace esto:

| Función | Qué hace |
|---|---|
| `crear(usuario)` | `jwt.sign(...)` firma el token con `JWT_SECRET` |
| `leer("Bearer ...")` | `jwt.verify(...)` regresa el usuario, o `null` si el token es inválido o venció |

Cada petición GraphQL pasa por el servidor (`back/src/adaptadores/entrada/http/servidor.js`). El servidor lee el encabezado `Authorization: Bearer <token>` y deja el resultado en `contexto.actor`. Si no hay token, `contexto.actor` es `null` y la petición se trata como de **invitado**.

## 2. Contraseñas con bcrypt

Las contraseñas **nunca** se guardan tal cual: se guarda su *hash* bcrypt, por ejemplo `$2b$10$...`.

- `crearCuenta` aplica `bcrypt.hash(password)` y guarda el resultado.
- `iniciarSesion` usa `bcrypt.compare(password, hash)`.

Si el correo no existe o la contraseña está mal, la respuesta es el mismo mensaje en los dos casos ("Correo o contraseña incorrectos"). Así nadie puede averiguar qué correos están registrados.

## 3. OAuth2 con Google (flujo *authorization code*)

OAuth2 permite entrar con Google **sin que la tienda vea nunca tu contraseña de Google**.

```
Navegador                 Backend (:4000)                     Google
   │ clic "Continuar con Google"
   │ ─────────────────────▶ GET /auth/google
   │ ◀──── redirige ─────── (con client_id y state)
   │ ───────────── inicias sesión y aceptas ───────────────────▶
   │ ◀───────────── redirige con ?code=...&state=... ───────────
   │ ─────────────────────▶ GET /auth/google/callback
   │                         1. verifica state
   │                         2. code → access_token ─────────────▶ (POST /token, con client_secret)
   │                         3. access_token → perfil ───────────▶ (GET /userinfo)
   │                         4. busca o crea el usuario por correo
   │                         5. crea NUESTRO JWT
   │ ◀── redirige a /entrar#token=... ──
   │ el front pregunta "yo" con ese token y guarda la sesión
```

Puntos que conviene explicar:

- **`code` y `client_secret`:** el código que Google regresa no sirve solo. Hay que cambiarlo por un *access token* de servidor a servidor, usando el `client_secret`, que nunca llega al navegador.
- **`state`:** es un JWT de 10 minutos que el servidor genera al iniciar el viaje y revisa al volver. Así comprueba que el regreso viene de un login que empezó él (protección contra CSRF).
- **Token después del `#`:** lo que va después del `#` no se envía al servidor, así que no queda en logs. La página `/entrar` lo lee y lo borra de la barra de direcciones.
- **Google solo identifica al usuario:** después de eso, la tienda usa **su propio JWT**, igual que con correo y contraseña.

## 4. Quién puede hacer qué (`back/src/dominio/permisos.js`)

Tres funciones del dominio hacen cumplir las reglas, y los casos de uso (`back/src/aplicacion/`) las llaman:

- `exigirSesion(actor)`: debe haber usuario. Si no, error `UNAUTHENTICATED`.
- `exigirAdmin(actor)`: el rol debe ser `ADMIN`. Si no, error `FORBIDDEN`.
- `exigirDueno(actor, usuarioId)`: el recurso debe ser tuyo, salvo que seas admin.

| Operación | Regla |
|---|---|
| Catálogo, categorías, compatibilidades, stock en vivo | Público |
| `registrarPedido` (comprar) | Público: se puede comprar como invitado. Con sesión, el pedido queda a nombre de tu cuenta |
| `crearCuenta`, `iniciarSesion` | Público |
| `yo`, `vehiculos`, `pedidos` | Con sesión. Solo ves **los tuyos** (el admin ve todos) |
| `vehiculo`, `mantenimientos`, editar o borrar vehículo, `registrarMantenimiento` | Solo el dueño o el admin |
| `agregarVehiculo` | Con sesión. El dueño lo toma el servidor del token, no lo manda el cliente |
| Crear o editar productos y categorías, `registrarCompatibilidad`, `registrarUsuario`, `usuarios` | Solo `ADMIN` |

Detalle importante: antes, el front mandaba `usuarioId` y el servidor le creía. Ahora el id sale del **token firmado**, así que no se puede falsificar.

## 5. Front (Astro + React)

- **`store/useTienda.js`:** guarda `sesion = { token, usuario }` en `localStorage`. Incluye `iniciarSesion()` y `cerrarSesion()`. Al salir, también se olvida el vehículo activo.
- **`graphql/client.js`:** agrega `Authorization: Bearer <token>` a cada petición. Si el servidor responde `UNAUTHENTICATED` (token vencido), cierra la sesión local.
- **`graphql/subscriptionClient.js`:** en WebSocket no hay encabezados, así que el token viaja en `connectionParams`.
- **`EntrarModal.jsx`:** formulario de entrar o crear cuenta, más el botón "Continuar con Google".
- **`pages/entrar.astro` + `EntrarView.jsx`:** la página a la que regresa Google.
- **Barra superior:** "Entrar" para invitados; el nombre y el botón de salir cuando hay sesión.
- **Garage y ficha del vehículo:** a un invitado le piden entrar. Comprar sigue sin pedir cuenta.

**Decisión de simplicidad:** el JWT vive en `localStorage`. Es fácil de entender y de depurar. La versión más segura sería guardarlo en una cookie `httpOnly`, porque un script inyectado (XSS) podría leer `localStorage`.

## 6. Cómo probarlo

1. Configura `back/.env` (ya existe `JWT_SECRET`):
   ```
   JWT_SECRET=<secreto largo y aleatorio>
   FRONT_URL=http://localhost:4321
   ```
2. Si tu base se creó antes de este cambio, asigna la contraseña demo a los usuarios de ejemplo:
   ```
   cd back && npm run db:passwords
   ```
   Si la creas desde cero con `npm run db:init`, ya vienen con ella.
3. Usuarios de ejemplo, todos con la contraseña `encaja123`:
   - `santiago@encaja.mx` (cliente, tiene el Versa y el Jetta)
   - `taller@encaja.mx` (taller)
   - `admin@encaja.mx` (admin)

### Activar "Continuar con Google" (opcional)

1. En https://console.cloud.google.com/apis/credentials, crea un **ID de cliente de OAuth**, tipo **Aplicación web**.
2. En "URI de redireccionamiento autorizados", agrega `http://localhost:4000/auth/google/callback`.
3. Copia el ID y el secreto a `back/.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```
4. Reinicia el backend. Mientras no estén configurados, el botón regresa un mensaje claro de que Google no está configurado.

### Probarlo a mano en Apollo Sandbox (http://localhost:4000/graphql)

```graphql
mutation { iniciarSesion(email: "santiago@encaja.mx", password: "encaja123") { token } }
```

Copia el token y ponlo en *Headers* como `Authorization: Bearer <token>`. Después prueba:

```graphql
{ yo { nombre rol } vehiculos { modelo } }
```

Sin el header, `vehiculos` responde "Necesitas iniciar sesión".
