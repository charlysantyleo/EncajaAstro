const dinero = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export function pesos(valor) {
  return dinero.format(valor ?? 0);
}

export function kilometros(valor) {
  return valor == null ? null : `${valor.toLocaleString('es-MX')} km`;
}

export const ENVIO_GRATIS = 999;
