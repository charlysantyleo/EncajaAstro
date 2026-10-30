// Adaptador de salida: implementa el puerto Actividad con MongoDB. Cada busqueda, pieza vista, pieza agregada
// a la nota, coche agregado al garage y pedido es un documento de la coleccion "actividad"; las graficas
// del panel salen de una sola agregacion ($facet). Los documentos se borran solos a los 180 dias (indice TTL).
import { MongoClient } from 'mongodb';

const DIAS_QUE_SE_GUARDA = 180;
const COLECCION = 'actividad';

/** @returns {import('../../../puertos/salida.js').Actividad} */
export function crearActividadMongo({ uri, baseDeDatos }) {
  // Si MongoDB no responde en 5 s se da por caido: la tienda sigue y solo se pierde ese evento.
  const cliente = new MongoClient(uri, { serverSelectionTimeoutMS: 5000, appName: 'encaja-back' });
  let lista = null;

  // Conecta y crea los indices la primera vez que se usa; si falla, el siguiente uso lo vuelve a intentar.
  function coleccion() {
    lista ??= (async () => {
      const actividad = cliente.db(baseDeDatos).collection(COLECCION);
      await actividad.createIndexes([
        { key: { fecha: 1 }, name: 'caduca', expireAfterSeconds: DIAS_QUE_SE_GUARDA * 24 * 60 * 60 },
        { key: { tipo: 1, fecha: -1 }, name: 'tipo_fecha' },
      ]);
      return actividad;
    })().catch((error) => {
      lista = null;
      throw error;
    });
    return lista;
  }

  const masFrecuentes = (filtro, agrupar, limite, extra = {}) => [
    { $match: filtro },
    { $group: { _id: agrupar, valor: { $sum: 1 }, ...extra } },
    { $sort: { valor: -1, _id: 1 } },
    { $limit: limite },
  ];

  return {
    disponible: true,

    async registrar(evento) {
      await (await coleccion()).insertOne({ ...evento });
    },

    async resumen({ inicio, zonaHoraria, limite }) {
      const [r] = await (await coleccion())
        .aggregate([
          { $match: { fecha: { $gte: inicio } } },
          {
            $facet: {
              porTipo: [{ $group: { _id: '$tipo', valor: { $sum: 1 } } }],
              porDia: [
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$fecha', timezone: zonaHoraria } }, valor: { $sum: 1 } } },
                { $sort: { _id: 1 } },
              ],
              masBuscado: masFrecuentes({ tipo: 'BUSQUEDA' }, '$texto', limite),
              sinResultados: masFrecuentes({ tipo: 'BUSQUEDA', resultados: 0 }, '$texto', limite),
              vehiculos: masFrecuentes({ tipo: 'VEHICULO_AGREGADO' }, { $concat: ['$marca', ' ', '$modelo'] }, limite),
              piezasMasVistas: masFrecuentes({ tipo: 'VISTA_PRODUCTO' }, '$productoId', limite, { nombre: { $last: '$producto' } }),
            },
          },
        ])
        .toArray();
      const serie = (filas) => filas.map((f) => ({ etiqueta: f.nombre ?? String(f._id), valor: f.valor }));
      return {
        porTipo: Object.fromEntries(r.porTipo.map((f) => [f._id, f.valor])),
        porDia: serie(r.porDia),
        masBuscado: serie(r.masBuscado),
        sinResultados: serie(r.sinResultados),
        vehiculos: serie(r.vehiculos),
        piezasMasVistas: serie(r.piezasMasVistas),
      };
    },

    cerrar: () => cliente.close(),
  };
}
