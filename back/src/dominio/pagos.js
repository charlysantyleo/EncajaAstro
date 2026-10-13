// Reglas de cobro que no dependen de ninguna pasarela: que metodos existen, quien los atiende
// y como el estado de un pago mueve el estado de su pedido.
import { ErrorDeNegocio } from './errores.js';

export const METODOS = { TARJETA: 'TARJETA', TIENDA: 'TIENDA', LINK: 'LINK', PICKUP: 'PICKUP' };
export const PROVEEDORES = { MERCADO_PAGO: 'MERCADO_PAGO', PAYPAL: 'PAYPAL' };
export const TIENDAS = { OXXO: 'OXXO', PAYCASH: 'PAYCASH' };
export const STATUS_PAGO = { PENDIENTE: 'PENDIENTE', APROBADO: 'APROBADO', RECHAZADO: 'RECHAZADO', CANCELADO: 'CANCELADO' };
export const STATUS_PEDIDO = { PENDIENTE: 'PENDIENTE', PAGADO: 'PAGADO', CANCELADO: 'CANCELADO' };

// Dias que dura una ficha de tienda o un link antes de vencer (y liberar las piezas apartadas).
export const DIAS_PARA_PAGAR = 3;

// Que pasarela atiende cada metodo; la primera es la de por defecto.
// Pagar al recoger no usa pasarela: se cobra en mostrador.
const PROVEEDORES_DE = {
  [METODOS.TARJETA]: [PROVEEDORES.MERCADO_PAGO],
  [METODOS.TIENDA]: [PROVEEDORES.MERCADO_PAGO],
  [METODOS.LINK]: [PROVEEDORES.MERCADO_PAGO, PROVEEDORES.PAYPAL],
  [METODOS.PICKUP]: [],
};

// Combinaciones que el checkout puede ofrecer, en el orden en que se muestran.
export const COMBINACIONES = Object.entries(PROVEEDORES_DE).flatMap(([metodo, proveedores]) =>
  proveedores.length ? proveedores.map((proveedor) => ({ metodo, proveedor })) : [{ metodo, proveedor: null }]
);

// Convierte lo que pidio el cliente en un plan valido. Sin datos de pago, el pedido se paga al recoger.
export function planDePago(solicitud) {
  const metodo = solicitud?.metodo ?? METODOS.PICKUP;
  const proveedores = PROVEEDORES_DE[metodo];
  if (!proveedores) throw new ErrorDeNegocio(`No existe el método de pago ${metodo}`);

  const proveedor = solicitud?.proveedor ?? proveedores[0] ?? null;
  if (proveedor && !proveedores.includes(proveedor)) {
    throw new ErrorDeNegocio('Ese método de pago no se puede cobrar con ese proveedor');
  }

  if (metodo === METODOS.TARJETA && !(solicitud.tarjeta?.token && solicitud.tarjeta?.metodoId)) {
    throw new ErrorDeNegocio('Faltan los datos de la tarjeta');
  }

  return {
    metodo,
    proveedor,
    tienda: metodo === METODOS.TIENDA ? (solicitud.tienda ?? TIENDAS.OXXO) : null,
    tarjeta: metodo === METODOS.TARJETA ? solicitud.tarjeta : null,
  };
}

export function estaCerrado(statusPago) {
  return statusPago === STATUS_PAGO.RECHAZADO || statusPago === STATUS_PAGO.CANCELADO;
}

export function venceEn(dias, desde = new Date()) {
  return new Date(desde.getTime() + dias * 24 * 60 * 60 * 1000).toISOString();
}

export function yaVencio(vence, ahora = new Date()) {
  return Boolean(vence) && new Date(vence).getTime() < ahora.getTime();
}
