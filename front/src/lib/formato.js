const dinero = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export function pesos(valor) {
  return dinero.format(valor ?? 0);
}

export function kilometros(valor) {
  return valor == null ? null : `${valor.toLocaleString('es-MX')} km`;
}

const momento = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeStyle: 'short' });

// "10 de octubre de 2026, 4:30 p.m." a partir de una fecha ISO.
export function fechaHora(iso) {
  return momento.format(new Date(iso));
}

export const ENVIO_GRATIS = 999;
