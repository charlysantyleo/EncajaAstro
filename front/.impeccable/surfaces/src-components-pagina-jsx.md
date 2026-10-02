---
version: 1
slug: "src-components-pagina-jsx"
primary_target: "src/components/Pagina.jsx"
related_targets: []
---

# Surface brief: toda la tienda (operate)

Mode: Operate. Audiencia: dueños de auto y mecánicos en Guadalajara. Tarea: encontrar la pieza que embona en su vehículo, comprar, anotar el servicio en la bitácora. Restricciones: backend, rutas, store `ir()` y textos se conservan. Rediseño completo: el mundo "nota de remisión" anterior es anti-referencia.

## Direction contract
THESIS: La tienda habla como la barda pintada del taller tapatío: lo que embona en tu auto se PINTA en letra de rótulo con su sombra desplazada. Rechaza la tienda gris de tarjetas con acento rojo y el disfraz de papelería del rediseño anterior.
OWN-WORLD: Barda encalada fría (#F3F4EF) como fondo, azul rey esmalte (#1B3FA8) para el casco (header, pie, botones primarios), amarillo cromo (#F2C12E) para la cinta EMBONA, el auto activo y el destello de stock, rojo chile (#E1301A) de marca para el logo, precios en oferta y errores, negro carbón para texto. Bungee (rótulo, solo títulos, cintas, logo) con sombra desplazada sólida; Archivo (UI y cuerpo, cifras tabulares, número de parte en semicondensada). Esquinas de 6px, fotos sobre placa blanca a la misma escala, sombras sólidas desplazadas en lugar de difusas.
STORY: El visitante pinta su auto en la franja amarilla, ve cada pieza con cinta EMBONA o EQUIVALENTE, compara por número de parte y stock vivo, la agrega a la nota y paga; el pedido queda con folio y se liga a la bitácora.
FIRST VIEWPORT: Barra azul rey con logo EC pintado, buscador ancho y placa del vehículo activo; tabs de categoría con indicador deslizante amarillo; franja de vehículo con el modelo en letra de rótulo a escala grande; a la izquierda rejilla de piezas con cinta EMBONA pintada en esquina; a la derecha la nota sticky blanca con renglones, total animado y barra de envío gratis.
FORM: Rótulo de taller, candidato 4 de mi lista; seed b09d9128. Movimiento signature: la cinta EMBONA y el nombre del auto se pintan con un barrido de brocha (clip-path izquierda→derecha) escalonado; stock que cambia destella en amarillo y se queda marcado. Raises: color de alerta reservado (tablero de salidas), misma placa y escala de foto (folio botánico), una familia de rótulo en escala estricta (Emigre).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
