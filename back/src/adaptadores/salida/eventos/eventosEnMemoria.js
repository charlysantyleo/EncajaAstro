// Adaptador de salida: implementa el puerto Eventos con un PubSub en memoria (graphql-subscriptions).
// Sirve para un solo servidor; con varios servidores se cambiaria por Redis sin tocar los casos de uso.
import { PubSub } from 'graphql-subscriptions';

const STOCK_ACTUALIZADO = 'STOCK_ACTUALIZADO';
const PEDIDO_ACTUALIZADO = 'PEDIDO_ACTUALIZADO';
const ACTIVIDAD_REGISTRADA = 'ACTIVIDAD_REGISTRADA';

/** @returns {import('../../../puertos/salida.js').Eventos} */
export function crearEventosEnMemoria() {
  const pubsub = new PubSub();
  return {
    stockCambio: (producto) => pubsub.publish(STOCK_ACTUALIZADO, { stockActualizado: producto }),
    escucharStock: () => pubsub.asyncIterableIterator([STOCK_ACTUALIZADO]),
    // Pedido nuevo, pagado, cancelado, enviado o entregado: el panel lo pinta sin recargar.
    pedidoCambio: (pedido) => pubsub.publish(PEDIDO_ACTUALIZADO, { pedidoActualizado: pedido }),
    escucharPedidos: () => pubsub.asyncIterableIterator([PEDIDO_ACTUALIZADO]),
    // Cada evento que se guarda en MongoDB: el tablero se actualiza y lo muestra en "Actividad en vivo".
    actividadNueva: (actividad) => pubsub.publish(ACTIVIDAD_REGISTRADA, { actividadRegistrada: actividad }),
    escucharActividad: () => pubsub.asyncIterableIterator([ACTIVIDAD_REGISTRADA]),
  };
}
