// Reglas del negocio que no dependen de la base de datos: se pueden probar solas.
import { ErrorDeNegocio } from './errores.js';

export const PASSWORD_MINIMA = 8;

export function validarPasswordNueva(password) {
  if (password.length < PASSWORD_MINIMA) {
    throw new ErrorDeNegocio(`La contraseña debe tener al menos ${PASSWORD_MINIMA} caracteres`);
  }
}

// ---------- pedidos ----------

export function validarItemsDelPedido(items) {
  if (!items.length) throw new ErrorDeNegocio('El pedido necesita al menos un producto');
}

// Valida un renglon del carrito contra el producto real y calcula su importe.
export function armarLinea(producto, cantidad) {
  if (cantidad < 1) throw new ErrorDeNegocio(`La cantidad de "${producto.nombre}" debe ser al menos 1`);
  if (producto.stock < cantidad) {
    throw new ErrorDeNegocio(`Sin stock suficiente de "${producto.nombre}" (disponible: ${producto.stock})`);
  }
  return { producto, cantidad, precio: producto.precio, importe: producto.precio * cantidad };
}

export function totalDe(lineas) {
  return lineas.reduce((suma, linea) => suma + linea.importe, 0);
}

export const STATUS_INICIAL_PEDIDO = 'PENDIENTE';

export function hoy() {
  return new Date().toISOString().slice(0, 10);
}

// ---------- garage ----------

export const COMBUSTIBLE_POR_DEFECTO = 'GASOLINA';

export function validarKilometraje(nuevo, anterior) {
  if (nuevo == null) return;
  if (nuevo < 0) throw new ErrorDeNegocio('El kilometraje no puede ser negativo');
  if (anterior != null && nuevo < anterior) {
    throw new ErrorDeNegocio(`El kilometraje (${nuevo}) no puede ser menor al ultimo registrado (${anterior})`);
  }
}

// ---------- catalogo ----------

export const COMPATIBILIDAD_POR_DEFECTO = 'DIRECTO';

export function paginar(lista, { limite, desde } = {}) {
  let resultado = lista;
  if (desde) resultado = resultado.slice(desde);
  if (limite) resultado = resultado.slice(0, limite);
  return resultado;
}
