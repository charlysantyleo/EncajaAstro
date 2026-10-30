// Casos de uso de la actividad de la tienda: anotarla (en MongoDB) y avisarla en vivo al panel.
// Anotar nunca frena ni rompe lo que el cliente esta haciendo: no se espera y, si MongoDB falla, solo se avisa en la consola.
import { ErrorDeNegocio } from '../dominio/errores.js';
import { exigirAdmin } from '../dominio/permisos.js';
import { TIPOS_DE_ACTIVIDAD, TIPOS_DESDE_LA_TIENDA, describirActividad } from '../dominio/actividad.js';

/**
 * @param {{ actividad: import('../puertos/salida.js').Actividad, eventos: import('../puertos/salida.js').Eventos,
 *           repos: import('../puertos/salida.js').Repositorios }} puertos
 */
export function crearActividad({ actividad, eventos, repos }) {
  function anotar(datos) {
    if (!actividad.disponible) return;
    const evento = { ...datos, fecha: new Date() };
    actividad
      .registrar(evento)
      .then(() =>
        eventos.actividadNueva({ tipo: evento.tipo, fecha: evento.fecha.toISOString(), descripcion: describirActividad(evento) })
      )
      .catch((error) => console.error(`No se pudo guardar la actividad en MongoDB: ${error.message}`));
  }

  return {
    anotar,

    // Lo que solo sabe el navegador: que pieza se abrio y que se agrego a la nota (la nota vive en el navegador).
    async desdeLaTienda(actor, { tipo, productoId, cantidad }) {
      if (!TIPOS_DESDE_LA_TIENDA.includes(tipo)) throw new ErrorDeNegocio('Esa actividad la anota el servidor, no la tienda');
      const producto = await repos.productos.porId(productoId);
      if (!producto) throw new ErrorDeNegocio(`No existe un producto con id ${productoId}`);
      anotar({
        tipo,
        usuarioId: actor?.id ?? null,
        productoId: producto.id,
        producto: producto.nombre,
        numeroParte: producto.numeroParte,
        ...(tipo === TIPOS_DE_ACTIVIDAD.AGREGAR_A_NOTA ? { cantidad: Math.min(Math.max(Math.trunc(cantidad ?? 1), 1), 999) } : {}),
      });
      return true;
    },

    escuchar(actor) {
      exigirAdmin(actor);
      return eventos.escucharActividad();
    },
  };
}
