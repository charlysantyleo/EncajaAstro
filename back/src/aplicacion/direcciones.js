// Casos de uso de envio: reglas que el checkout necesita mostrar (costo, cobertura) y las direcciones
// que un usuario guarda en su cuenta para no volver a teclearlas.
import { exigirDueno, exigirSesion } from '../dominio/permisos.js';
import { COSTO_ENVIO, ENVIO_GRATIS_DESDE, ESTADO_DE_COBERTURA, MUNICIPIOS_DE_COBERTURA, esLaMismaDireccion } from '../dominio/entregas.js';

/**
 * @param {{ repos: import('../puertos/salida.js').Repositorios }} puertos
 */
export function crearDirecciones({ repos }) {
  return {
    // Publico: lo que cuesta el envio y a donde llega, para que el checkout no lo tenga copiado.
    reglas: () => ({
      costo: COSTO_ENVIO,
      gratisDesde: ENVIO_GRATIS_DESDE,
      estado: ESTADO_DE_COBERTURA,
      municipios: MUNICIPIOS_DE_COBERTURA,
    }),

    mias(actor) {
      exigirSesion(actor);
      return repos.direcciones.deUsuario(actor.id);
    },

    async eliminar(actor, id) {
      const direccion = await repos.direcciones.porId(id);
      if (!direccion) return false;
      exigirDueno(actor, direccion.usuarioId);
      return repos.direcciones.eliminar(id);
    },

    // Dentro de la transaccion del pedido. Si el usuario ya tenia esa direccion no se duplica:
    // solo se actualizan el telefono y las referencias con lo mas reciente.
    async guardar(tx, usuarioId, { telefono, direccion }) {
      const guardadas = await tx.direcciones.deUsuario(usuarioId);
      const existente = guardadas.find((guardada) => esLaMismaDireccion(guardada, direccion));
      if (existente) return tx.direcciones.actualizarContacto(existente.id, { telefono, referencias: direccion.referencias });
      return tx.direcciones.crear({ usuarioId, telefono, ...direccion });
    },
  };
}
