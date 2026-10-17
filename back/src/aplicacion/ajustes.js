// Casos de uso de los ajustes de la tienda (costo de envio, descuento de taller).
import { exigirAdmin } from '../dominio/permisos.js';
import { AJUSTES_POR_DEFECTO, validarAjustes } from '../dominio/ajustes.js';

/**
 * @param {{ repos: import('../puertos/salida.js').Repositorios }} puertos
 */
export function crearAjustes({ repos }) {
  // Se leen muchas veces (cada precio del catalogo) y cambian rara vez: se guardan en memoria
  // y se vuelven a leer de la base solo cuando el admin los cambia.
  let enMemoria = null;

  function actuales() {
    enMemoria ??= repos.ajustes.todos().then((guardados) => ({ ...AJUSTES_POR_DEFECTO, ...guardados }));
    // Si la base fallo, el siguiente intento vuelve a preguntar en vez de quedarse con el error.
    enMemoria.catch(() => (enMemoria = null));
    return enMemoria;
  }

  return {
    actuales,

    async actualizar(actor, cambios) {
      exigirAdmin(actor);
      const limpios = validarAjustes(cambios);
      for (const [clave, valor] of Object.entries(limpios)) await repos.ajustes.guardar(clave, valor);
      enMemoria = null;
      return actuales();
    },
  };
}
