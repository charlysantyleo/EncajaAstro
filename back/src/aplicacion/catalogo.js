// Casos de uso del catalogo: categorias, productos y compatibilidades.
import { ErrorDeNegocio } from '../dominio/errores.js';
import { exigirAdmin } from '../dominio/permisos.js';
import { COMPATIBILIDAD_POR_DEFECTO, paginar } from '../dominio/reglas.js';

/**
 * @param {{ repos: import('../puertos/salida.js').Repositorios, eventos: import('../puertos/salida.js').Eventos }} puertos
 */
export function crearCatalogo({ repos, eventos }) {
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

    async buscarProductos({ limite, desde, ...filtros }) {
      return paginar(await repos.productos.buscar(filtros), { limite, desde });
    },

    async productosCompatibles({ vehiculoId, categoriaId, soloDirectos }) {
      await exigirVehiculo(vehiculoId);
      return repos.productos.buscar({ vehiculoId, categoriaId, soloDirectos });
    },

    async vehiculosCompatibles(productoId) {
      await exigirProducto(productoId);
      return repos.vehiculos.compatiblesCon(productoId);
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

    eliminarProducto(actor, id) {
      exigirAdmin(actor);
      return repos.productos.eliminar(id);
    },

    async registrarCompatibilidad(actor, { productoId, vehiculoId, tipo, nota }) {
      exigirAdmin(actor);
      await exigirProducto(productoId);
      await exigirVehiculo(vehiculoId);
      if (await repos.compatibilidades.buscar(productoId, vehiculoId)) {
        throw new ErrorDeNegocio('Esa pieza ya esta registrada como compatible con ese vehiculo');
      }
      return repos.compatibilidades.crear({
        productoId,
        vehiculoId,
        tipo: tipo ?? COMPATIBILIDAD_POR_DEFECTO,
        nota: nota ?? null,
      });
    },
  };
}

function datosDeProducto(datos) {
  return {
    nombre: datos.nombre,
    descripcion: datos.descripcion ?? null,
    numeroParte: datos.numeroParte,
    marca: datos.marca ?? null,
    precio: datos.precio,
    imagen: datos.imagen ?? null,
    stock: datos.stock,
    categoriaId: datos.categoriaId ?? null,
  };
}
