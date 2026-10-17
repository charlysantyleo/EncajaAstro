// Casos de uso del catalogo: categorias, productos y compatibilidades.
import { ErrorDeNegocio } from '../dominio/errores.js';
import { exigirAdmin } from '../dominio/permisos.js';
import { COMPATIBILIDAD_POR_DEFECTO, paginar } from '../dominio/reglas.js';
import { precioPara } from '../dominio/ajustes.js';
import { seEnciman, validarCompatibilidad } from '../dominio/vehiculos.js';

// Fotos que el panel puede subir y su tamaño maximo (el panel las comprime antes a WebP).
const TIPOS_DE_IMAGEN = ['image/webp', 'image/jpeg', 'image/png'];
const BYTES_MAXIMOS_DE_IMAGEN = 1.5 * 1024 * 1024;

/**
 * @param {{ repos: import('../puertos/salida.js').Repositorios, eventos: import('../puertos/salida.js').Eventos,
 *           ajustes: ReturnType<typeof import('./ajustes.js').crearAjustes> }} puertos
 */
export function crearCatalogo({ repos, eventos, ajustes }) {
  async function avisarStock(productoId) {
    const producto = await repos.productos.porId(productoId);
    if (producto) eventos.stockCambio(producto);
  }

  async function exigirProducto(productoId) {
    const producto = await repos.productos.porId(productoId);
    if (!producto) throw new ErrorDeNegocio(`No existe un producto con id ${productoId}`);
    return producto;
  }

  async function exigirVehiculo(vehiculoId) {
    const vehiculo = await repos.vehiculos.porId(vehiculoId);
    if (!vehiculo) throw new ErrorDeNegocio(`No existe un vehiculo con id ${vehiculoId}`);
    return vehiculo;
  }

  return {
    avisarStock,

    // ---------- consultas (publicas) ----------
    categorias: () => repos.categorias.listar(),
    categoria: (id) => repos.categorias.porId(id),
    categoriaDe: (producto) => (producto.categoriaId ? repos.categorias.porId(producto.categoriaId) : null),
    productosDeCategoria: (categoria) => repos.productos.deCategoria(categoria.id),

    producto: (id) => repos.productos.porId(id),

    // Lo que paga quien consulta: precio de lista, o de mayoreo si su cuenta es de taller.
    precioPara: async (actor, producto) => precioPara(producto, actor, await ajustes.actuales()),

    imagen: (id) => repos.imagenes.porId(id),

    async buscarProductos({ limite, desde, ...filtros }) {
      return paginar(await repos.productos.buscar(filtros), { limite, desde });
    },

    async productosCompatibles({ vehiculoId, categoriaId, soloDirectos }) {
      await exigirVehiculo(vehiculoId);
      return repos.productos.buscar({ vehiculoId, categoriaId, soloDirectos });
    },

    // En cuales de mis coches embona una pieza (sin sesion no hay garage).
    async vehiculosCompatibles(actor, productoId) {
      await exigirProducto(productoId);
      return actor ? repos.vehiculos.compatiblesCon(productoId, actor.id) : [];
    },

    compatibilidades: (filtros) => repos.compatibilidades.listar(filtros),

    // ---------- administracion (solo ADMIN) ----------
    crearCategoria(actor, datos) {
      exigirAdmin(actor);
      return repos.categorias.crear({ nombre: datos.nombre, descripcion: datos.descripcion ?? null });
    },

    crearProducto(actor, datos) {
      exigirAdmin(actor);
      return repos.productos.crear(datosDeProducto(datos));
    },

    async actualizarProducto(actor, id, datos) {
      exigirAdmin(actor);
      if (!(await repos.productos.porId(id))) return null;
      const producto = await repos.productos.actualizar(id, datosDeProducto(datos));
      await avisarStock(id);
      return producto;
    },

    // Suma (o resta, con negativo) piezas a las existencias. Avisa el stock nuevo en vivo.
    async ajustarStock(actor, id, cantidad) {
      exigirAdmin(actor);
      const producto = await exigirProducto(id);
      if (!Number.isInteger(cantidad) || cantidad === 0) throw new ErrorDeNegocio('Indica cuántas piezas sumar o restar');
      if (producto.stock + cantidad < 0) {
        throw new ErrorDeNegocio(`No puedes restar ${-cantidad}: solo hay ${producto.stock} en existencia`);
      }
      if (cantidad > 0) await repos.productos.reponerStock(id, cantidad);
      else await repos.productos.descontarStock(id, -cantidad);
      await avisarStock(id);
      return repos.productos.porId(id);
    },

    // Guarda una foto y regresa su direccion para ponerla en un producto.
    async subirImagen(actor, { tipo, base64 }) {
      exigirAdmin(actor);
      if (!TIPOS_DE_IMAGEN.includes(tipo)) throw new ErrorDeNegocio('La foto debe ser WebP, JPG o PNG');
      if ((base64?.length ?? 0) * 0.75 > BYTES_MAXIMOS_DE_IMAGEN) throw new ErrorDeNegocio('La foto pesa demasiado (máximo 1.5 MB)');
      const imagen = await repos.imagenes.crear({ tipo, base64 });
      return `/imagenes/${imagen.id}`;
    },

    eliminarCompatibilidad(actor, id) {
      exigirAdmin(actor);
      return repos.compatibilidades.eliminar(id);
    },

    eliminarProducto(actor, id) {
      exigirAdmin(actor);
      return repos.productos.eliminar(id);
    },

    // "Esta pieza embona en Nissan Versa 2012–2019" (y opcionalmente "solo con el motor 1.6L 4 cil.").
    async registrarCompatibilidad(actor, { productoId, tipo, nota, ...vehiculos }) {
      exigirAdmin(actor);
      await exigirProducto(productoId);
      const nueva = validarCompatibilidad(vehiculos);
      // Con los nombres del catalogo, para que coincida con los coches de los clientes.
      const [anioReferencia] = await repos.catalogoVehiculos.anios(nueva.marca, nueva.modelo);
      if (anioReferencia) {
        const delCatalogo = await repos.catalogoVehiculos.buscarUno(nueva.marca, nueva.modelo, anioReferencia);
        nueva.marca = delCatalogo.marca;
        nueva.modelo = delCatalogo.modelo;
      }
      const encimada = (await repos.compatibilidades.deModelo(productoId, nueva)).find((otra) => seEnciman(otra, nueva));
      if (encimada) {
        throw new ErrorDeNegocio(
          `Esa pieza ya está registrada para ${encimada.marca} ${encimada.modelo} ${encimada.anioDesde}–${encimada.anioHasta}` +
            `${encimada.motor ? ` con motor ${encimada.motor}` : ''}: quítala o ajusta los años`
        );
      }
      return repos.compatibilidades.crear({
        productoId,
        ...nueva,
        tipo: tipo ?? COMPATIBILIDAD_POR_DEFECTO,
        nota: nota?.trim() || null,
      });
    },
  };
}

// Lo minimo para que una pieza se pueda vender: nombre, numero de parte, precio positivo, existencias enteras.
function datosDeProducto(datos) {
  if (!datos.nombre?.trim()) throw new ErrorDeNegocio('El producto necesita un nombre');
  if (!datos.numeroParte?.trim()) throw new ErrorDeNegocio('El producto necesita un número de parte');
  if (!(datos.precio > 0)) throw new ErrorDeNegocio('El precio debe ser mayor a 0');
  if (datos.stock != null && !(Number.isInteger(datos.stock) && datos.stock >= 0)) {
    throw new ErrorDeNegocio('Las existencias deben ser un número entero de 0 o más');
  }
  return {
    nombre: datos.nombre.trim(),
    descripcion: datos.descripcion ?? null,
    numeroParte: datos.numeroParte.trim(),
    marca: datos.marca ?? null,
    precio: datos.precio,
    imagen: datos.imagen ?? null,
    // Sin stock al editar: se conservan las existencias actuales (las compras no se pisan).
    stock: datos.stock ?? null,
    categoriaId: datos.categoriaId ?? null,
  };
}
