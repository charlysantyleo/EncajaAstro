// Reglas de la actividad de la tienda (se guarda en MongoDB) y del periodo que muestran las graficas del panel.
import { ErrorDeNegocio } from './errores.js';
import { hoy } from './reglas.js';

export const TIPOS_DE_ACTIVIDAD = {
  BUSQUEDA: 'BUSQUEDA',
  VISTA_PRODUCTO: 'VISTA_PRODUCTO',
  AGREGAR_A_NOTA: 'AGREGAR_A_NOTA',
  VEHICULO_AGREGADO: 'VEHICULO_AGREGADO',
  PEDIDO: 'PEDIDO',
};
// Lo unico que el navegador puede anotar por su cuenta; lo demas lo anota el servidor al hacerlo.
export const TIPOS_DESDE_LA_TIENDA = [TIPOS_DE_ACTIVIDAD.VISTA_PRODUCTO, TIPOS_DE_ACTIVIDAD.AGREGAR_A_NOTA];

// "  Balatas   VERSA " y "balatas versa" son la misma busqueda.
export const normalizarBusqueda = (texto) => texto.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, 80);

const pesos = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

// Lo que se lee en el panel, en "Actividad en vivo".
export function describirActividad(e) {
  switch (e.tipo) {
    case TIPOS_DE_ACTIVIDAD.BUSQUEDA:
      return `Buscó “${e.texto}” (${e.resultados === 0 ? 'sin resultados' : e.resultados === 1 ? '1 resultado' : `${e.resultados} resultados`})`;
    case TIPOS_DE_ACTIVIDAD.VISTA_PRODUCTO:
      return `Vio ${e.producto}`;
    case TIPOS_DE_ACTIVIDAD.AGREGAR_A_NOTA:
      return `Agregó a su nota ${e.cantidad} × ${e.producto}`;
    case TIPOS_DE_ACTIVIDAD.VEHICULO_AGREGADO:
      return `Agregó a su garage un ${e.marca} ${e.modelo} ${e.anio}`;
    case TIPOS_DE_ACTIVIDAD.PEDIDO:
      return `Hizo el pedido N.º ${e.pedidoId} por ${pesos(e.total)}`;
    default:
      return e.tipo;
  }
}

export const PERIODOS = [7, 30, 90];
const UN_DIA = 24 * 60 * 60 * 1000;

// Los ultimos `dias` dias contando hoy: el primer dia (YYYY-MM-DD), el instante en que empieza
// (medianoche de Guadalajara, que no cambia de horario desde 2022) y la lista de dias para rellenar huecos.
export function periodo(dias) {
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) throw new ErrorDeNegocio('El periodo debe ser de 1 a 365 días');
  const ahora = Date.now();
  const lista = Array.from({ length: dias }, (_, i) => hoy(new Date(ahora - (dias - 1 - i) * UN_DIA)));
  return { desde: lista[0], inicio: new Date(`${lista[0]}T00:00:00-06:00`), dias: lista };
}

// Una serie por dia sin huecos: los dias sin ventas o sin actividad valen 0 (si no, la linea los saltaria).
export function serieDiaria(dias, puntos) {
  const valores = new Map(puntos.map((p) => [p.etiqueta, p.valor]));
  return dias.map((dia) => ({ etiqueta: dia, valor: valores.get(dia) ?? 0 }));
}
