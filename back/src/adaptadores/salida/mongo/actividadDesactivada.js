// Adaptador de salida para cuando no hay MONGODB_URI: la tienda funciona igual, solo no se guarda la actividad
// y el panel avisa que las graficas de actividad necesitan MongoDB.

/** @returns {import('../../../puertos/salida.js').Actividad} */
export function crearActividadDesactivada() {
  return {
    disponible: false,
    registrar: async () => {},
    resumen: async () => ({ porTipo: {}, porDia: [], masBuscado: [], sinResultados: [], vehiculos: [], piezasMasVistas: [] }),
    cerrar: async () => {},
  };
}
