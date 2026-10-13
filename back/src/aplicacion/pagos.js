// Casos de uso de cobro: que metodos se ofrecen, iniciar el cobro de un pedido y mantener
// el pedido al dia con lo que diga la pasarela (aprobado, rechazado, vencido).
import { ErrorDeNegocio } from '../dominio/errores.js';
import {
  COMBINACIONES,
  DIAS_PARA_PAGAR,
  METODOS,
  PROVEEDORES,
  STATUS_PAGO,
  STATUS_PEDIDO,
  estaCerrado,
  planDePago,
  venceEn,
} from '../dominio/pagos.js';

const NOMBRE = { [PROVEEDORES.MERCADO_PAGO]: 'Mercado Pago', [PROVEEDORES.PAYPAL]: 'PayPal' };

/**
 * @param {{ repos: import('../puertos/salida.js').Repositorios, transaccion: import('../puertos/salida.js').Transaccion,
 *           eventos: import('../puertos/salida.js').Eventos,
 *           pasarelas: Record<string, import('../puertos/salida.js').Pasarela>,
 *           urls: { front: string, publica: string|null } }} puertos
 */
export function crearPagos({ repos, transaccion, eventos, pasarelas, urls }) {
  function opcion({ metodo, proveedor }) {
    const pasarela = proveedor ? pasarelas[proveedor] : null;
    const disponible = !pasarela || (metodo === METODOS.TARJETA ? pasarela.cobraTarjetas : pasarela.configurada);
    return {
      metodo,
      proveedor,
      disponible,
      motivo: disponible ? null : `Falta configurar ${NOMBRE[proveedor]} en el servidor`,
      // La llave publica es la unica credencial que puede llegar al navegador: con ella se tokeniza la tarjeta.
      llavePublica: disponible && metodo === METODOS.TARJETA ? pasarela.llavePublica : null,
    };
  }

  async function avisarStock(pedidoId) {
    for (const detalle of await repos.pedidos.detallesDe(pedidoId)) {
      const producto = await repos.productos.porId(detalle.productoId);
      if (producto) eventos.stockCambio(producto);
    }
  }

  // Lleva el pago y su pedido al estado que reporta la pasarela. Se puede llamar varias veces con el
  // mismo resultado (aviso + consulta al mismo tiempo): el pedido se bloquea y solo cambia una vez.
  async function aplicar(pago, { status, detalle = null }) {
    const cambio = await transaccion(async (tx) => {
      const pedido = await tx.pedidos.bloquear(pago.pedidoId);
      const actual = await tx.pagos.porId(pago.id);
      if (actual.status === status || actual.status === STATUS_PAGO.APROBADO) return false;

      if (status === STATUS_PAGO.APROBADO) {
        // Pago que llega despues de haber cancelado el pedido: las piezas se vuelven a apartar.
        if (pedido.status === STATUS_PEDIDO.CANCELADO) {
          for (const linea of await tx.pedidos.detallesDe(pedido.id)) await tx.productos.descontarStock(linea.productoId, linea.cantidad);
        }
        if (pedido.status === STATUS_PEDIDO.PENDIENTE || pedido.status === STATUS_PEDIDO.CANCELADO) {
          await tx.pedidos.cambiarStatus(pedido.id, STATUS_PEDIDO.PAGADO);
        }
      } else if (estaCerrado(status) && pedido.status === STATUS_PEDIDO.PENDIENTE) {
        // Sin pago no hay venta: se cancela el pedido y sus piezas vuelven al inventario.
        for (const linea of await tx.pedidos.detallesDe(pedido.id)) await tx.productos.reponerStock(linea.productoId, linea.cantidad);
        await tx.pedidos.cambiarStatus(pedido.id, STATUS_PEDIDO.CANCELADO);
      }

      await tx.pagos.actualizar(pago.id, { status, detalle });
      return true;
    });
    if (cambio && status !== STATUS_PAGO.PENDIENTE) await avisarStock(pago.pedidoId);
  }

  function iniciarEnPasarela(plan, cobro) {
    const pasarela = pasarelas[plan.proveedor];
    if (plan.metodo === METODOS.TARJETA) return pasarela.cobrarTarjeta(cobro);
    if (plan.metodo === METODOS.TIENDA) return pasarela.crearFichaTienda(cobro);
    return pasarela.crearLink(cobro);
  }

  async function verificar(referencia) {
    const pago = await repos.pagos.porReferencia(referencia);
    if (!pago) throw new ErrorDeNegocio('No encontramos ese pago');

    if (pago.status === STATUS_PAGO.PENDIENTE && pago.proveedor && pago.idExterno) {
      let resultado;
      try {
        resultado = await pasarelas[pago.proveedor].consultar(pago);
      } catch (error) {
        console.error(`[pagos] No se pudo consultar el pago ${referencia}:`, error.message);
        throw new ErrorDeNegocio(`No pudimos consultar el pago con ${NOMBRE[pago.proveedor]}. Intenta de nuevo en un momento.`);
      }
      await aplicar(pago, resultado);
    }
    return repos.pedidos.porId(pago.pedidoId);
  }

  return {
    // ---------- consultas (publicas) ----------
    opciones: () => COMBINACIONES.map(opcion),
    pagoDe: (pedido) => repos.pagos.dePedido(pedido.id),

    // La referencia es larga y aleatoria: quien la tiene (el comprador, aunque sea invitado) puede ver su pedido.
    async pedidoPorReferencia(referencia) {
      const pago = await repos.pagos.porReferencia(referencia);
      return pago ? repos.pedidos.porId(pago.pedidoId) : null;
    },

    // ---------- cobro de un pedido (lo usa registrarPedido) ----------

    // Paso 1, antes de tocar la base: el metodo existe, trae lo necesario y su pasarela esta configurada.
    planear(solicitud) {
      const plan = planDePago(solicitud);
      const { disponible, motivo } = opcion(plan);
      if (!disponible) throw new ErrorDeNegocio(`Ese método de pago no está disponible. ${motivo}.`);
      return plan;
    },

    // Paso 2, dentro de la transaccion del pedido: el pago nace pendiente junto con su pedido.
    registrar: (tx, { pedidoId, plan, monto }) =>
      tx.pagos.crear({
        pedidoId,
        referencia: crypto.randomUUID(),
        metodo: plan.metodo,
        proveedor: plan.proveedor,
        status: STATUS_PAGO.PENDIENTE,
        monto,
      }),

    // Paso 3, con el pedido ya guardado: se cobra (tarjeta) o se genera la ficha o el link.
    // Si la pasarela falla o rechaza, el pedido se cancela, las piezas regresan y el comprador ve el motivo.
    async cobrar(pedido, { plan, comprador, lineas }) {
      if (!plan.proveedor) return;
      const pago = await repos.pagos.dePedido(pedido.id);
      const cobro = {
        referencia: pago.referencia,
        monto: pago.monto,
        descripcion: `Pedido ${pedido.id} · EnCaja Autopartes`,
        comprador,
        lineas,
        tarjeta: plan.tarjeta,
        tienda: plan.tienda,
        vence: venceEn(DIAS_PARA_PAGAR),
        urls: {
          retorno: `${urls.front}/pago?ref=${pago.referencia}`,
          notificacion: urls.publica ? `${urls.publica}/webhooks/mercadopago` : null,
        },
      };

      let resultado;
      try {
        resultado = await iniciarEnPasarela(plan, cobro);
      } catch (error) {
        console.error(`[pagos] ${NOMBRE[plan.proveedor]} falló al iniciar el pago del pedido ${pedido.id}:`, error.message);
        await aplicar(pago, { status: STATUS_PAGO.CANCELADO, detalle: 'No se pudo iniciar el pago.' });
        throw new ErrorDeNegocio(
          `No se pudo iniciar el pago con ${NOMBRE[plan.proveedor]}; tu pedido no se registró. Intenta de nuevo o elige otro método.`
        );
      }

      await repos.pagos.actualizar(pago.id, {
        idExterno: resultado.idExterno,
        url: resultado.url,
        codigo: resultado.codigo,
        vence: resultado.vence,
        detalle: resultado.detalle,
      });
      await aplicar(pago, resultado);

      if (estaCerrado(resultado.status)) {
        throw new ErrorDeNegocio(
          `${resultado.detalle ?? 'El pago fue rechazado.'} Tu pedido no se registró; intenta con otra tarjeta u otro método.`
        );
      }
    },

    // ---------- seguimiento ----------

    // Pregunta a la pasarela como va el cobro y actualiza el pedido. Regresa el pedido al dia.
    verificar,

    notificacionValida: (datos) => pasarelas[PROVEEDORES.MERCADO_PAGO].firmaValida(datos),

    // Aviso (webhook) de Mercado Pago: solo trae el id de su pago. No se le cree al aviso:
    // se pregunta a la API a que referencia pertenece y se verifica como cualquier otro pago.
    async notificacionDePago(idPagoExterno) {
      const referencia = await pasarelas[PROVEEDORES.MERCADO_PAGO].referenciaDeNotificacion(idPagoExterno);
      if (referencia && (await repos.pagos.porReferencia(referencia))) await verificar(referencia);
    },
  };
}
