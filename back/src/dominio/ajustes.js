// Ajustes de la tienda que el administrador cambia desde el panel, y el precio que le toca a cada cuenta.
import { ErrorDeNegocio } from './errores.js';
import { ROLES } from './permisos.js';

// Lo que valen mientras nadie los haya cambiado.
export const AJUSTES_POR_DEFECTO = {
  // Envio a domicilio: cuota fija, gratis a partir de cierto importe en piezas.
  costoEnvio: 199,
  envioGratisDesde: 999,
  // Precio de mayoreo de las cuentas TALLER, en porcentaje de descuento sobre el precio de lista.
  descuentoTaller: 10,
};

const LIMITES = {
  costoEnvio: { minimo: 0, maximo: 5000, nombre: 'El costo de envío' },
  envioGratisDesde: { minimo: 0, maximo: 1000000, nombre: 'El importe para el envío gratis' },
  descuentoTaller: { minimo: 0, maximo: 50, nombre: 'El descuento de taller' },
};

// Solo pasan los ajustes conocidos, como numero y dentro de su rango.
export function validarAjustes(cambios) {
  const limpios = {};
  for (const [clave, valor] of Object.entries(cambios ?? {})) {
    if (valor == null) continue;
    const limite = LIMITES[clave];
    if (!limite) throw new ErrorDeNegocio(`No existe el ajuste ${clave}`);
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < limite.minimo || numero > limite.maximo) {
      throw new ErrorDeNegocio(`${limite.nombre} debe estar entre ${limite.minimo} y ${limite.maximo}`);
    }
    limpios[clave] = Math.round(numero * 100) / 100;
  }
  return limpios;
}

// Precio con un descuento en porcentaje, redondeado a centavos.
export function precioConDescuento(precio, porcentaje) {
  return Math.round(precio * (100 - porcentaje)) / 100;
}

// Lo que paga esta cuenta por la pieza: los talleres tienen precio de mayoreo; los demas, precio de lista.
export function precioPara(producto, actor, ajustes) {
  return actor?.rol === ROLES.TALLER && ajustes.descuentoTaller > 0
    ? precioConDescuento(producto.precio, ajustes.descuentoTaller)
    : producto.precio;
}
