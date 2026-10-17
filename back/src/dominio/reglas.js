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
// `precio` es el que le toca a quien compra (precio de lista, o de mayoreo si es taller).
export function armarLinea(producto, cantidad, precio = producto.precio) {
  if (cantidad < 1) throw new ErrorDeNegocio(`La cantidad de "${producto.nombre}" debe ser al menos 1`);
  if (producto.stock < cantidad) {
    throw new ErrorDeNegocio(`Sin stock suficiente de "${producto.nombre}" (disponible: ${producto.stock})`);
  }
  return { producto, cantidad, precio, importe: Math.round(precio * cantidad * 100) / 100 };
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

// ---------- estado de un pedido ----------

// Lo que el personal puede hacer con un pedido ya pagado: enviarlo (si es a domicilio) y entregarlo.
const SIGUIENTES = { PAGADO: ['ENVIADO', 'ENTREGADO'], ENVIADO: ['ENTREGADO'] };

export function validarCambioDeStatus(pedido, tipoDeEntrega, nuevo) {
  if (!(SIGUIENTES[pedido.status] ?? []).includes(nuevo)) {
    const motivo = pedido.status === 'PENDIENTE' ? 'todavía no está pagado' : `está ${pedido.status.toLowerCase()}`;
    throw new ErrorDeNegocio(`El pedido N.º ${pedido.id} no se puede marcar como ${nuevo.toLowerCase()}: ${motivo}`);
  }
  if (nuevo === 'ENVIADO' && tipoDeEntrega !== 'DOMICILIO') {
    throw new ErrorDeNegocio(`El pedido N.º ${pedido.id} se recoge en mostrador: márcalo como entregado`);
  }
}
