// Adaptador de salida: implementa el puerto Eventos con un PubSub en memoria (graphql-subscriptions).
// Sirve para un solo servidor; con varios servidores se cambiaria por Redis sin tocar los casos de uso.
import { PubSub } from 'graphql-subscriptions';

const STOCK_ACTUALIZADO = 'STOCK_ACTUALIZADO';

/** @returns {import('../../../puertos/salida.js').Eventos} */
export function crearEventosEnMemoria() {
  const pubsub = new PubSub();
  return {
    stockCambio: (producto) => pubsub.publish(STOCK_ACTUALIZADO, { stockActualizado: producto }),
    escucharStock: () => pubsub.asyncIterableIterator([STOCK_ACTUALIZADO]),
  };
}
