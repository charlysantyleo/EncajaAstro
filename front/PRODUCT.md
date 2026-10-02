# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Dueños de auto y mecánicos de taller por igual, en Guadalajara, Jalisco. Los primeros no saben de números de parte y necesitan que la tienda les diga qué embona; los segundos saben exactamente qué buscan y quieren velocidad, número de parte y stock. Compran como invitados (sin cuenta); el garage y la bitácora viven en su cuenta.

## Product Purpose
Tienda de refacciones con compatibilidad vehicular verificada. El usuario registra su vehículo una vez (garage), el catálogo se filtra por lo que embona (ajuste directo o equivalencia), compra, y anota el servicio en la bitácora del vehículo con su kilometraje. Éxito: comprar una pieza que sí entra a la primera.

## Positioning
Catálogo cruzado con garage y bitácora: la compatibilidad es la base del catálogo, no un filtro opcional; cada compra puede ligarse al historial de mantenimiento del vehículo.

## Operating Context
Rutas: `/`, `/categoria?id|q`, `/garage`, `/vehiculo?id`, `/carrito`, `/checkout`. Stock en tiempo real por suscripción WebSocket (graphql-ws). Envío gratis desde $999 MXN en zona metropolitana de Guadalajara. Proyecto integrador PWII.

## Capabilities and Constraints
- Frontend Astro 7 + islas React 19 (`client:only="react"`), salida estática, zustand con persistencia, ids por query params.
- Backend Express + Apollo GraphQL. Desde 2026-10-02 tiene autenticación: JWT (correo/contraseña con bcrypt) y OAuth2 con Google; garage y bitácora requieren cuenta, comprar no (ver AUTENTICACION.md).
- Se conserva la API del store `ir(evento, payload)` y las rutas.
- Textos en español.

## Brand Commitments
Nombre "EnCaja Autopartes", logo "EC". Acento rojo actual (#ec3013) existente; el rediseño reemplaza el mundo visual.

## Evidence on Hand
16 fotos reales de piezas en `public/img/` (mapeadas por número de parte en `src/imagenes.js`) y `catalogo.jpg`. No hay testimonios, reseñas ni métricas; no inventarlas.

## Product Principles
1. La compatibilidad se muestra siempre: cada pieza dice si embona en el vehículo activo.
2. Rápido para quien sabe (número de parte, stock, búsqueda), guiado para quien no.
3. El stock en vivo es visible y honesto.
4. Comprar y dar mantenimiento son un solo flujo.

## Accessibility & Inclusion
Contraste suficiente, navegación por teclado, `prefers-reduced-motion` respetado en toda animación.
