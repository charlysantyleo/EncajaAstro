# EnCaja Autopartes — Frontend (Astro)

Astro con islas de React, salida **estatica**. Cada pagina hidrata solo lo que usa y cuando lo usa
(ver "Islas" mas abajo).

## Requisitos

- Node.js 22.12 o superior
- El backend (`../back`) corriendo y con su base de datos inicializada

## Instalacion

```bash
cd front
npm install
cp .env.example .env
npm run dev
```

Abre `http://localhost:4321`. La URL del API se configura con
`PUBLIC_API_URL` (en Astro solo las variables con prefijo `PUBLIC_` llegan
al navegador). Otros comandos: `npm run build` (genera `dist/`) y
`npm run preview`.

## Rutas

| Ruta | Vista | Parametros |
|------|-------|------------|
| `/` | `HomeView` | |
| `/categoria` | `CategoriaView` | `?id=10&nombre=Frenos` o `?q=texto` |
| `/garage` | `GarageView` | |
| `/vehiculo` | `VehiculoView` | `?id=5` |
| `/carrito` | `CarritoView` | |
| `/checkout` | `CheckoutView` | |
| `/pago` | `PagoView` | `?ref=<referencia del pago>` |
| `/entrar` | `EntrarView` | `#token=...` (regreso de Google) |
| `/admin` | panel (HTML estatico tras `PuertaAdmin`) | |

Los ids viajan como query params (no `/categoria/[id]`) para que el build
estatico no necesite el backend encendido.

## Islas

`src/layouts/Base.astro` arma el marco y cada pagina `.astro` monta su vista. Nada se hidrata "por si acaso":

| Pieza | Directiva | Por que |
|-------|-----------|---------|
| `TopBar` | `client:load` | Se usa desde el primer momento. Su HTML ya viene en el build, asi que la barra se ve antes de que cargue React. |
| `HomeView` | `client:load` | El build deja pintada la estructura del catalogo (indice de sistemas, esqueletos); los datos llegan al hidratar. |
| `CategoriaView`, `GarageView`, `VehiculoView`, `CarritoView`, `CheckoutView`, `PagoView`, `EntrarView` | `client:only="react"` | Dependen de la URL (`?id`, `?ref`) o de `localStorage` (nota, sesion): el build no puede pintarlas sin mostrar un estado falso. |
| `Nota` (franja inferior) | `client:idle` | Solo en inicio y catalogo. |
| `StockEnVivo` (WebSocket) | `client:idle` | Solo en las paginas que muestran existencias. |
| `Capas` (avisos y dialogos) | `client:idle` | Cada dialogo es un `lazy()`: su JavaScript se descarga hasta que se abre. |
| `Pie.astro` | ninguna | Componente de Astro: HTML puro, cero JavaScript. |
| `admin/Grafica.jsx` | ninguna | Componente de React usado sin `client:*`: Astro lo convierte en HTML. Cuando tenga datos, basta agregarle `client:visible`. |
| Formulario de tarjeta | `lazy()` | El script de Mercado Pago solo se baja si se elige pagar con tarjeta. |

Reglas para que una isla con HTML del build no falle al hidratar:

- El store (`useTienda`) es seguro: mientras se hidrata entrega su estado inicial y despues el guardado.
- Lo que solo sabe el navegador (URL, tema) se lee en un `useEffect` o con `useEnNavegador()`
  (`src/hooks/useEnNavegador.js`). La ruta activa la pasa Astro como prop (`Astro.url.pathname`).
- Cada isla es una raiz de React aparte: se exporta con `comoIsla(...)` (`src/components/ui/Isla.jsx`)
  para que lleve su `MotionConfig`.

`prefetch` esta activo (`astro.config.mjs`): al pasar el cursor por un enlace interno, Astro baja esa pagina por adelantado.

## Que cambio respecto a Next.js

- `src/app/layout.jsx` y `page.jsx` -> `src/layouts/Base.astro` y
  `src/pages/*.astro`. `App.jsx` desaparece: ya no hay un `switch` de pantallas.
- Cada `.astro` monta su vista como isla dentro de `Base.astro` (antes era una sola isla
  `Pagina.jsx` + `Shell.jsx` con todo adentro; ver "Islas").
- `useTienda` ya no tiene `pantalla`, `categoriaId`, `texto` ni `vehiculoId`:
  eso vive en la URL (`src/lib/rutas.js`). `ir(evento)` se conserva: los
  eventos de navegacion hacen `window.location.assign`, el resto cambia el store.
- Cada navegacion es una carga completa de pagina, asi que el store persiste
  tambien `soloDirectos` y `pedidoConfirmado` (ademas de carrito y vehiculo activo).
- `process.env.NEXT_PUBLIC_API_URL` -> `import.meta.env.PUBLIC_API_URL`.
- Las vistas que dependen de `localStorage` o de la URL usan `client:only="react"`
  (sin HTML del build); las demas se pintan en el build y se hidratan.

## Rediseno (nota de remision)

- Direccion visual: nota de remision de triplicado (hoja amarilla, original blanca, nota rosa, sello de tinta). Tokens en `src/styles/global.css`.
- Animaciones con la libreria `motion` (patrones de beUI: tabs con indicador compartido, drawer/dialogo con resorte, numeros animados, interruptor, cantidad, toast). Primitivas en `src/components/ui/`. Se respeta `prefers-reduced-motion` (`MotionConfig`).
- Iconos: `lucide-react`. Agregar a la nota ya no navega: se queda en la pagina y muestra aviso + nota lateral.
- Backend sin cambios; `QUERY_PRODUCTOS` pide ademas `compatibilidades { tipo vehiculo { id } }` (campo ya existente en el schema) para pintar el sello de ajuste.
