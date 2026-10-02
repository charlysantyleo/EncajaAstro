// Casos de uso de compra: registrar pedidos y consultarlos.
import { ErrorDeNegocio } from '../dominio/errores.js';
import { ROLES, exigirDueno, usuarioParaFiltrar } from '../dominio/permisos.js';
import { STATUS_INICIAL_PEDIDO, armarLinea, hoy, totalDe, validarItemsDelPedido } from '../dominio/reglas.js';
import { vehiculoPropio } from './comun.js';

/**
 * @param {{ repos: import('../puertos/salida.js').Repositorios, transaccion: import('../puertos/salida.js').Transaccion,
 *           eventos: import('../puertos/salida.js').Eventos }} puertos
 */
export function crearPedidos({ repos, transaccion, eventos }) {
  return {
    pedidos(actor, { usuarioId, status }) {
      return repos.pedidos.listar({ usuarioId: usuarioParaFiltrar(actor, usuarioId), status });
    },

    async pedido(actor, id) {
      const pedido = await repos.pedidos.porId(id);
      if (pedido) exigirDueno(actor, pedido.usuarioId);
      return pedido;
    },

    pedidoPorId: (id) => repos.pedidos.porId(id),
    detallesDe: (pedido) => repos.pedidos.detallesDe(pedido.id),

    // Valida stock y compatibilidad, calcula el total, descuenta existencias y crea el pedido, todo o nada.
    // Se puede comprar como invitado; ligar el pedido a un vehiculo exige que el vehiculo sea tuyo.
    async registrarPedido(actor, { cliente, vehiculoId, items }) {
      validarItemsDelPedido(items);
      if (vehiculoId) await vehiculoPropio(repos, actor, vehiculoId);
      // Con sesion, el pedido queda a nombre de la cuenta aunque el formulario traiga otro correo.
      const correo = actor?.email ?? cliente.email;

      const pedido = await transaccion(async (tx) => {
        const usuario =
          (await tx.usuarios.porEmail(correo)) ??
          (await tx.usuarios.crear({ nombre: cliente.nombre, email: correo, passwordHash: null, rol: ROLES.CLIENTE }));

        if (vehiculoId && !(await tx.vehiculos.porId(vehiculoId))) {
          throw new ErrorDeNegocio(`No existe un vehiculo con id ${vehiculoId}`);
        }

        const lineas = [];
        for (const item of items) {
          const producto = await tx.productos.porId(item.productoId);
          if (!producto) throw new ErrorDeNegocio(`No existe un producto con id ${item.productoId}`);
          const linea = armarLinea(producto, item.cantidad);
          if (vehiculoId && !(await tx.compatibilidades.buscar(item.productoId, vehiculoId))) {
            throw new ErrorDeNegocio(`"${producto.nombre}" no es compatible con el vehiculo seleccionado`);
          }
          lineas.push(linea);
        }

        const nuevo = await tx.pedidos.crear({
          usuarioId: usuario.id,
          vehiculoId: vehiculoId ?? null,
          fecha: hoy(),
          total: totalDe(lineas),
          status: STATUS_INICIAL_PEDIDO,
        });

        for (const linea of lineas) {
          await tx.pedidos.agregarDetalle({
            pedidoId: nuevo.id,
            productoId: linea.producto.id,
            cantidad: linea.cantidad,
            precioUnitario: linea.precio,
            importe: linea.importe,
          });
          await tx.productos.descontarStock(linea.producto.id, linea.cantidad);
        }
        return nuevo;
      });

      // Ya guardado: avisamos el stock nuevo a quien este viendo el catalogo.
      for (const item of items) {
        const producto = await repos.productos.porId(item.productoId);
        if (producto) eventos.stockCambio(producto);
      }

      return repos.pedidos.porId(pedido.id);
    },
  };
}
