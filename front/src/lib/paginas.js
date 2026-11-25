// Paginas publicas que se generan en el build en los dos idiomas (practica P3-4). Las paginas de src/pages/ y de
// src/pages/en/ son envoltorios delgados: el contenido vive en src/vistas/ y recibe el idioma.
import { catalogoDeBuild } from './datosDeBuild';
import { slugDeCategoria, slugDeProducto } from './slug';
import { traducirCategoria, traducirProducto } from '../i18n/catalogo';

export const rutaDeCategoria = (categoria, idioma) =>
  idioma === 'en' ? `/en/category/${slugDeCategoria(traducirCategoria(categoria, 'en'))}/` : `/categoria/${slugDeCategoria(categoria)}/`;

export const rutaDeProducto = (producto, idioma) =>
  idioma === 'en' ? `/en/product/${slugDeProducto(traducirProducto(producto, 'en'))}/` : `/producto/${slugDeProducto(producto)}/`;

// La misma pagina en cada idioma: para hreflang y para el selector de idioma.
export const alternosDeCategoria = (categoria) => ({ es: rutaDeCategoria(categoria, 'es'), en: rutaDeCategoria(categoria, 'en') });
export const alternosDeProducto = (producto) => ({ es: rutaDeProducto(producto, 'es'), en: rutaDeProducto(producto, 'en') });

export async function rutasDeCategorias(idioma) {
  const { categorias, productos } = await catalogoDeBuild();
  return categorias.map((categoria) => ({
    params: { slug: slugDeCategoria(traducirCategoria(categoria, idioma)) },
    props: { categoria, categorias, productos: productos.filter((p) => p.categoria?.id === categoria.id) },
  }));
}

export async function rutasDeProductos(idioma) {
  const { productos } = await catalogoDeBuild();
  return productos.map((producto) => ({ params: { slug: slugDeProducto(traducirProducto(producto, idioma)) }, props: { producto } }));
}
