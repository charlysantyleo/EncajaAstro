# EnCaja Autopartes — Frontend (Astro)

Astro con una isla de React por pagina, salida **estatica**.

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

Los ids viajan como query params (no `/categoria/[id]`) para que el build
estatico no necesite el backend encendido.

## Que cambio respecto a Next.js

- `src/app/layout.jsx` y `page.jsx` -> `src/layouts/Base.astro` y
  `src/pages/*.astro`. `App.jsx` desaparece: ya no hay un `switch` de pantallas.
- Cada `.astro` monta `<Pagina vista="..." client:only="react" />`
  (`src/components/Pagina.jsx`), que envuelve la vista en `Shell.jsx`
  (TopBar, Footer, modales y suscripcion de stock).
- `useTienda` ya no tiene `pantalla`, `categoriaId`, `texto` ni `vehiculoId`:
  eso vive en la URL (`src/lib/rutas.js`). `ir(evento)` se conserva: los
  eventos de navegacion hacen `window.location.assign`, el resto cambia el store.
- Cada navegacion es una carga completa de pagina, asi que el store persiste
  tambien `soloDirectos` y `pedidoConfirmado` (ademas de carrito y vehiculo activo).
- `process.env.NEXT_PUBLIC_API_URL` -> `import.meta.env.PUBLIC_API_URL`.
- `client:only="react"` (sin render en servidor) porque el store lee
  `localStorage`; evita errores de hidratacion.

## Rediseno (nota de remision)

- Direccion visual: nota de remision de triplicado (hoja amarilla, original blanca, nota rosa, sello de tinta). Tokens en `src/styles/global.css`.
- Animaciones con la libreria `motion` (patrones de beUI: tabs con indicador compartido, drawer/dialogo con resorte, numeros animados, interruptor, cantidad, toast). Primitivas en `src/components/ui/`. Se respeta `prefers-reduced-motion` (`MotionConfig`).
- Iconos: `lucide-react`. Agregar a la nota ya no navega: se queda en la pagina y muestra aviso + nota lateral.
- Backend sin cambios; `QUERY_PRODUCTOS` pide ademas `compatibilidades { tipo vehiculo { id } }` (campo ya existente en el schema) para pintar el sello de ajuste.
