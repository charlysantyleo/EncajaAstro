// Contenido del catalogo en otros idiomas. Los nombres y descripciones viven en la base de datos (en el idioma base);
// su traduccion va en la seccion "catalogo" del JSON de cada idioma:
//   categorias: por slug del sistema en el idioma base ("frenos")
//   productos:  por numero de parte ("BC-4021")
//   notas:      notas de compatibilidad, por su texto original
//   reemplazos: cambios dentro de textos tecnicos ("cil." -> "cyl." en los motores)
// Lo que no este traducido se muestra en el idioma base (por ejemplo, una pieza recien agregada desde el panel).
import { slug } from '../lib/slug';
import { IDIOMA_BASE, datos } from './index';

const catalogo = (idioma) => datos(idioma).catalogo ?? {};

function reemplazar(texto, idioma) {
  if (!texto) return texto;
  return Object.entries(catalogo(idioma).reemplazos ?? {}).reduce((salida, [de, a]) => salida.split(de).join(a), texto);
}

export function traducirCategoria(categoria, idioma) {
  if (idioma === IDIOMA_BASE || !categoria?.nombre) return categoria;
  const traduccion = catalogo(idioma).categorias?.[slug(categoria.nombre)];
  if (!traduccion) return categoria;
  return {
    ...categoria,
    nombre: traduccion.nombre ?? categoria.nombre,
    descripcion: categoria.descripcion != null ? (traduccion.descripcion ?? categoria.descripcion) : categoria.descripcion,
    nombreOriginal: categoria.nombre,
  };
}

export function traducirCompatibilidad(compatibilidad, idioma) {
  if (idioma === IDIOMA_BASE || !compatibilidad) return compatibilidad;
  const notas = catalogo(idioma).notas ?? {};
  return { ...compatibilidad, nota: notas[compatibilidad.nota] ?? compatibilidad.nota, motor: reemplazar(compatibilidad.motor, idioma) };
}

export function traducirProducto(producto, idioma) {
  if (idioma === IDIOMA_BASE || !producto || producto.nombreOriginal) return producto;
  const traduccion = catalogo(idioma).productos?.[producto.numeroParte];
  return {
    ...producto,
    nombreOriginal: producto.nombre,
    nombre: traduccion?.nombre ?? producto.nombre,
    descripcion: producto.descripcion != null ? (traduccion?.descripcion ?? producto.descripcion) : producto.descripcion,
    categoria: traducirCategoria(producto.categoria, idioma),
    compatibilidades: producto.compatibilidades?.map((c) => traducirCompatibilidad(c, idioma)),
  };
}

/** Nombre de un sistema en `idioma`, a partir del nombre en el idioma base (o el mismo si ya esta traducido). */
export function nombreCategoria(nombre, idioma) {
  if (idioma === IDIOMA_BASE) return nombre;
  return catalogo(idioma).categorias?.[slug(nombre ?? '')]?.nombre ?? nombre;
}

/** Nombre de una linea de la nota: se guarda en el idioma base y cada pagina lo muestra en el suyo. */
export function nombreDeLinea(item, idioma) {
  if (idioma === IDIOMA_BASE) return item.nombreOriginal ?? item.nombre;
  return catalogo(idioma).productos?.[item.numeroParte]?.nombre ?? item.nombre;
}
