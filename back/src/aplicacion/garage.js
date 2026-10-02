// Casos de uso del garage: vehiculos de cada usuario y su bitacora de servicios.
import { ErrorDeNegocio } from '../dominio/errores.js';
import { esAdmin, esDuenoOAdmin, exigirSesion, usuarioParaFiltrar } from '../dominio/permisos.js';
import { COMBUSTIBLE_POR_DEFECTO, hoy, validarKilometraje } from '../dominio/reglas.js';
import { vehiculoPropio } from './comun.js';

/**
 * @param {{ repos: import('../puertos/salida.js').Repositorios, transaccion: import('../puertos/salida.js').Transaccion }} puertos
 */
export function crearGarage({ repos, transaccion }) {
  return {
    vehiculos(actor, { usuarioId, marca }) {
      return repos.vehiculos.listar({ usuarioId: usuarioParaFiltrar(actor, usuarioId), marca });
    },

    vehiculo: (actor, id) => vehiculoPropio(repos, actor, id),

    // Un vehiculo puede llegar a la respuesta por el catalogo (compatibilidades),
    // asi que su dueño y su bitacora solo se muestran al dueño o al admin.
    duenoDe: (actor, vehiculo) =>
      vehiculo.usuarioId && esDuenoOAdmin(actor, vehiculo.usuarioId) ? repos.usuarios.porId(vehiculo.usuarioId) : null,
    bitacoraDe: (actor, vehiculo) =>
      esDuenoOAdmin(actor, vehiculo.usuarioId) ? repos.mantenimientos.deVehiculo(vehiculo.id) : [],
    compatibilidadesDe: (vehiculo) => repos.compatibilidades.listar({ vehiculoId: vehiculo.id }),
    vehiculoPorId: (id) => repos.vehiculos.porId(id),

    agregarVehiculo(actor, datos) {
      exigirSesion(actor);
      // Queda a nombre de quien inicio sesion (el admin puede asignarlo a otro usuario).
      const usuarioId = esAdmin(actor) && datos.usuarioId ? datos.usuarioId : actor.id;
      return repos.vehiculos.crear({
        usuarioId,
        apodo: datos.apodo ?? null,
        marca: datos.marca,
        modelo: datos.modelo,
        anio: datos.anio,
        motor: datos.motor ?? null,
        tipoCombustible: datos.tipoCombustible ?? COMBUSTIBLE_POR_DEFECTO,
        kilometraje: datos.kilometraje ?? null,
      });
    },

    async actualizarVehiculo(actor, id, datos) {
      const existente = await vehiculoPropio(repos, actor, id);
      return repos.vehiculos.actualizar(id, {
        apodo: datos.apodo ?? existente.apodo,
        marca: datos.marca,
        modelo: datos.modelo,
        anio: datos.anio,
        motor: datos.motor ?? existente.motor,
        tipoCombustible: datos.tipoCombustible ?? existente.tipoCombustible,
        kilometraje: datos.kilometraje ?? existente.kilometraje,
      });
    },

    async eliminarVehiculo(actor, id) {
      await vehiculoPropio(repos, actor, id);
      return repos.vehiculos.eliminar(id);
    },

    async mantenimientos(actor, vehiculoId) {
      await vehiculoPropio(repos, actor, vehiculoId);
      return repos.mantenimientos.deVehiculo(vehiculoId);
    },

    // Valida compatibilidad y kilometraje, guarda el servicio y actualiza el odometro, todo o nada.
    async registrarMantenimiento(actor, { vehiculoId, productoId, pedidoId, fecha, kilometraje, descripcion }) {
      await vehiculoPropio(repos, actor, vehiculoId);

      return transaccion(async (tx) => {
        const vehiculo = await tx.vehiculos.porId(vehiculoId);
        if (!vehiculo) throw new ErrorDeNegocio(`No existe un vehiculo con id ${vehiculoId}`);

        if (productoId) {
          const producto = await tx.productos.porId(productoId);
          if (!producto) throw new ErrorDeNegocio(`No existe un producto con id ${productoId}`);
          if (!(await tx.compatibilidades.buscar(productoId, vehiculoId))) {
            throw new ErrorDeNegocio(`"${producto.nombre}" no esta registrada como compatible con este vehiculo`);
          }
        }

        if (pedidoId) {
          if (!(await tx.pedidos.porId(pedidoId))) throw new ErrorDeNegocio(`No existe un pedido con id ${pedidoId}`);
          if (productoId && !(await tx.pedidos.incluyeProducto(pedidoId, productoId))) {
            throw new ErrorDeNegocio(`El pedido ${pedidoId} no incluye esa pieza`);
          }
        }

        validarKilometraje(kilometraje, vehiculo.kilometraje);

        const mantenimiento = await tx.mantenimientos.crear({
          vehiculoId,
          productoId: productoId ?? null,
          pedidoId: pedidoId ?? null,
          fecha: fecha ?? hoy(),
          kilometraje: kilometraje ?? null,
          descripcion,
        });

        if (kilometraje != null) await tx.vehiculos.actualizarKilometraje(vehiculoId, kilometraje);
        return mantenimiento;
      });
    },
  };
}
