// Casos de uso de compra: registrar pedidos y consultarlos.
import { ErrorDeNegocio } from '../dominio/errores.js';
import { ROLES, esDuenoOAdmin, exigirDueno, usuarioParaFiltrar } from '../dominio/permisos.js';
import { costoDeEnvio, planDeEntrega } from '../dominio/entregas.js';
import { STATUS_INICIAL_PEDIDO, armarLinea, hoy, totalDe, validarItemsDelPedido } from '../dominio/reglas.js';
import { vehiculoPropio } from './comun.js';

/**
 * @param {{ repos: import('../puertos/salida.js').Repositorios, transaccion: import('../puertos/salida.js').Transaccion,
 *           eventos: import('../puertos/salida.js').Eventos, pagos: ReturnType<typeof import('./pagos.js').crearPagos>,
 *           direcciones: ReturnType<typeof import('./direcciones.js').crearDirecciones> }} puertos
 */
export function crearPedidos({ repos, transaccion, eventos, pagos, direcciones }) {
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

    // A un pedido tambien se llega con la referencia de su pago, y ese link lo puede abrir quien paga por
    // otra persona. La direccion hace falta para confirmar el envio; el telefono solo lo ve el dueño o el admin.
    async entregaDe(actor, pedido) {
      const entrega = await repos.entregas.dePedido(pedido.id);
      if (!entrega || esDuenoOAdmin(actor, pedido.usuarioId)) return entrega;
      return { ...entrega, telefono: null };
    },

    // Valida stock y compatibilidad, calcula el total, descuenta existencias y crea el pedido, todo o nada.
    // Despues inicia el cobro con el metodo elegido (sin metodo, el pedido se paga al recoger).
    // Se puede comprar como invitado; ligar el pedido a un vehiculo exige que el vehiculo sea tuyo.
    async registrarPedido(actor, { cliente, vehiculoId, items, pago, entrega }) {
      validarItemsDelPedido(items);
      const plan = pagos.planear(pago);
      // A domicilio o en tienda, con telefono y direccion ya revisados (sin datos, se recoge en tienda).
      const comoSeEntrega = planDeEntrega(entrega, plan);
      if (vehiculoId) await vehiculoPropio(repos, actor, vehiculoId);
      // Con sesion, el pedido queda a nombre de la cuenta aunque el formulario traiga otro correo.
      const correo = actor?.email ?? cliente.email;

      const { pedido, lineas, envio } = await transaccion(async (tx) => {
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

        // El total del pedido son las piezas mas el envio (gratis en mostrador o desde cierto importe).
        const piezas = totalDe(lineas);
        const envio = costoDeEnvio(comoSeEntrega.tipo, piezas);
        const nuevo = await tx.pedidos.crear({
          usuarioId: usuario.id,
          vehiculoId: vehiculoId ?? null,
          fecha: hoy(),
          total: piezas + envio,
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
        await tx.entregas.crear({
          pedidoId: nuevo.id,
          tipo: comoSeEntrega.tipo,
          telefono: comoSeEntrega.telefono,
          direccion: comoSeEntrega.direccion,
          costo: envio,
        });
        // Las direcciones se guardan en una cuenta: un invitado no tiene donde conservarlas.
        if (comoSeEntrega.guardar && actor) await direcciones.guardar(tx, usuario.id, comoSeEntrega);
        await pagos.registrar(tx, { pedidoId: nuevo.id, plan, monto: nuevo.total });
        return { pedido: nuevo, lineas, envio };
      });

      // Ya guardado: avisamos el stock nuevo a quien este viendo el catalogo.
      for (const item of items) {
        const producto = await repos.productos.porId(item.productoId);
        if (producto) eventos.stockCambio(producto);
      }

      // Con el pedido guardado se cobra. Si el cobro falla, pagos.cobrar cancela el pedido y lanza el motivo.
      await pagos.cobrar(pedido, {
        plan,
        comprador: { nombre: cliente.nombre, email: correo },
        // El envio viaja como un renglon mas para que el desglose del link de pago sume el total.
        lineas: [
          ...lineas.map((linea) => ({ nombre: linea.producto.nombre, cantidad: linea.cantidad, precio: linea.precio })),
          ...(envio > 0 ? [{ nombre: 'Envío a domicilio', cantidad: 1, precio: envio }] : []),
        ],
      });

      return repos.pedidos.porId(pedido.id);
    },
  };
}
