// Paginas publicas que se generan en el build, una vez por cada idioma de astro.config.mjs (practica P3-4).
// Las rutas viven en src/pages/[...idioma]/: el parametro `idioma` va vacio en el idioma base (/categoria/frenos/) y
// con el codigo en los demas (/en/category/brakes/). El contenido esta en src/vistas/ y recibe el idioma.
import { catalogoDeBuild } from './datosDeBuild';
import { slugDeCategoria, slugDeProducto } from './slug';
import { rutasPara } from './rutas';
import { IDIOMAS, IDIOMA_BASE, datos } from '../i18n';
import { traducirCategoria, traducirProducto } from '../i18n/catalogo';

const parametro = (idioma) => (idioma === IDIOMA_BASE ? undefined : idioma);

export const rutaDeCategoria = (categoria, idioma) => rutasPara(idioma).categoria(categoria.id, categoria.nombre);
export const rutaDeProducto = (producto, idioma) => rutasPara(idioma).producto(producto);

/** La misma pagina en cada idioma ({ es: '/categoria/frenos/', en: '/en/category/brakes/' }): hreflang y selector. */
export const alternos = (rutaEn) => Object.fromEntries(IDIOMAS.map((idioma) => [idioma, rutaEn(idioma)]));

// src/pages/[...idioma]/index.astro: /, /en/
export function rutasDeInicio() {
  return IDIOMAS.map((idioma) => ({ params: { idioma: parametro(idioma) }, props: { idioma } }));
}

// src/pages/[...idioma]/[seccion]/[slug].astro: cada sistema y cada pieza, con el slug en su idioma.
export async function rutasDeSecciones() {
  const { categorias, productos } = await catalogoDeBuild();
  return IDIOMAS.flatMap((idioma) => {
    const seccion = datos(idioma).rutas;
    return [
      ...categorias.map((categoria) => ({
        params: { idioma: parametro(idioma), seccion: seccion.categoria, slug: slugDeCategoria(traducirCategoria(categoria, idioma)) },
        props: { tipo: 'categoria', idioma, categoria, categorias, productos: productos.filter((p) => p.categoria?.id === categoria.id) },
      })),
      ...productos.map((producto) => ({
        params: { idioma: parametro(idioma), seccion: seccion.producto, slug: slugDeProducto(traducirProducto(producto, idioma)) },
        props: { tipo: 'producto', idioma, producto },
      })),
    ];
  });
}

// src/pages/[...idioma]/[pagina].astro: la nota, la busqueda y el respaldo de piezas nuevas (?slug=).
export function rutasDePaginas() {
  return IDIOMAS.flatMap((idioma) => {
    const seccion = datos(idioma).rutas;
    return [
      { params: { idioma: parametro(idioma), pagina: seccion.carrito }, props: { tipo: 'carrito', idioma } },
      { params: { idioma: parametro(idioma), pagina: seccion.busqueda }, props: { tipo: 'busqueda', idioma } },
      { params: { idioma: parametro(idioma), pagina: seccion.producto }, props: { tipo: 'respaldo', idioma } },
    ];
  });
}

// src/pages/[...idioma]/manifest.webmanifest.js: el manifiesto traducido de cada idioma que no es el base (el del
// idioma base lo genera @vite-pwa/astro).
export function rutasDeManifiestos() {
  return IDIOMAS.filter((idioma) => idioma !== IDIOMA_BASE).map((idioma) => ({ params: { idioma }, props: { idioma } }));
}
