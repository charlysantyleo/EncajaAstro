// Casos de uso del tablero del panel (solo ADMIN): ventas desde PostgreSQL y actividad desde MongoDB.
import { exigirAdmin } from '../dominio/permisos.js';
import { TIPOS_DE_ACTIVIDAD, periodo, serieDiaria } from '../dominio/actividad.js';
import { METODOS, PROVEEDORES } from '../dominio/pagos.js';
import { ZONA_HORARIA } from '../dominio/reglas.js';

// Una pieza con estas existencias o menos cuenta como "por agotarse".
export const POCAS_EXISTENCIAS = 5;
const RENGLONES = 8;
const ESTADOS = ['PENDIENTE', 'PAGADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'];
const VENDIDOS = ['PAGADO', 'ENVIADO', 'ENTREGADO'];
const NOMBRE_DE_METODO = {
  [METODOS.TARJETA]: 'Tarjeta',
  [METODOS.TIENDA]: 'Efectivo en tienda',
  [METODOS.LINK]: 'Link de pago',
  [METODOS.PICKUP]: 'Al recoger',
};
const EMBUDO = [
  [TIPOS_DE_ACTIVIDAD.BUSQUEDA, 'Búsquedas'],
  [TIPOS_DE_ACTIVIDAD.VISTA_PRODUCTO, 'Piezas vistas'],
  [TIPOS_DE_ACTIVIDAD.AGREGAR_A_NOTA, 'Agregadas a la nota'],
  [TIPOS_DE_ACTIVIDAD.PEDIDO, 'Pedidos'],
];
const centavos = (n) => Math.round(n * 100) / 100;

/**
 * @param {{ repos: import('../puertos/salida.js').Repositorios, actividad: import('../puertos/salida.js').Actividad }} puertos
 */
export function crearTablero({ repos, actividad }) {
  return {
    async ventas(actor, dias = 30) {
      exigirAdmin(actor);
      const rango = periodo(dias);
      const v = await repos.tablero.ventas({ desde: rango.desde, limite: RENGLONES, pocasExistencias: POCAS_EXISTENCIAS });
      const importe = v.porDia.reduce((suma, p) => suma + p.valor, 0);
      const pagados = VENDIDOS.reduce((suma, estado) => suma + (v.porEstado[estado] ?? 0), 0);
      return {
        dias,
        desde: rango.desde,
        ventas: centavos(importe),
        pedidosPagados: pagados,
        ticketPromedio: pagados ? centavos(importe / pagados) : 0,
        piezasPorAgotarse: v.piezasPorAgotarse,
        pocasExistencias: POCAS_EXISTENCIAS,
        ventasPorDia: serieDiaria(rango.dias, v.porDia),
        pedidosPorEstado: ESTADOS.map((estado) => ({ etiqueta: estado, valor: v.porEstado[estado] ?? 0 })),
        formasDePago: v.formasDePago
          .map((f) => ({
            etiqueta: `${NOMBRE_DE_METODO[f.metodo] ?? f.metodo}${f.proveedor === PROVEEDORES.PAYPAL ? ' (PayPal)' : ''}`,
            valor: f.pedidos,
          }))
          .sort((a, b) => b.valor - a.valor),
        piezasMasVendidas: v.masVendidas,
      };
    },

    // Si MongoDB no esta configurado, disponible = false y las listas van vacias.
    async actividad(actor, dias = 30) {
      exigirAdmin(actor);
      const rango = periodo(dias);
      const r = await actividad.resumen({ inicio: rango.inicio, zonaHoraria: ZONA_HORARIA, limite: RENGLONES });
      return {
        disponible: actividad.disponible,
        embudo: EMBUDO.map(([tipo, etiqueta]) => ({ etiqueta, valor: r.porTipo[tipo] ?? 0 })),
        actividadPorDia: serieDiaria(rango.dias, r.porDia),
        masBuscado: r.masBuscado,
        busquedasSinResultados: r.sinResultados,
        vehiculosMasComunes: r.vehiculos,
        piezasMasVistas: r.piezasMasVistas,
      };
    },
  };
}
