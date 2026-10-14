// Reglas de entrega que no dependen de la base ni de GraphQL: como llega el pedido al comprador
// y que datos hacen falta para llevarselo.
import { ErrorDeNegocio } from './errores.js';
import { METODOS } from './pagos.js';

export const TIPOS_ENTREGA = { DOMICILIO: 'DOMICILIO', TIENDA: 'TIENDA' };

// Envio a domicilio: cuota fija, gratis a partir de cierto importe en piezas.
export const COSTO_ENVIO = 199;
export const ENVIO_GRATIS_DESDE = 999;

// Cobertura: la zona metropolitana de Guadalajara. Acatlan de Juarez aparece en unas listas oficiales
// y en otras no; se incluye para no dejar fuera a nadie de la zona.
export const ESTADO_DE_COBERTURA = 'Jalisco';
export const MUNICIPIOS_DE_COBERTURA = [
  'Guadalajara',
  'Zapopan',
  'San Pedro Tlaquepaque',
  'Tonalá',
  'Tlajomulco de Zúñiga',
  'El Salto',
  'Ixtlahuacán de los Membrillos',
  'Juanacatlán',
  'Zapotlanejo',
  'Acatlán de Juárez',
];
// Nombres con los que la gente tambien escribe un municipio.
const ALIAS_DE_MUNICIPIO = { tlaquepaque: 'San Pedro Tlaquepaque', tlajomulco: 'Tlajomulco de Zúñiga', ixtlahuacan: 'Ixtlahuacán de los Membrillos' };

// Sin acentos ni mayusculas, para comparar lo que escribe la gente.
const plano = (valor) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();

export function costoDeEnvio(tipo, importeDePiezas) {
  return tipo === TIPOS_ENTREGA.DOMICILIO && importeDePiezas < ENVIO_GRATIS_DESDE ? COSTO_ENVIO : 0;
}

// Regresa el nombre oficial del municipio si esta en cobertura; si no, lanza el motivo.
function municipioCubierto(ciudad, estado) {
  const municipio =
    MUNICIPIOS_DE_COBERTURA.find((nombre) => plano(nombre) === plano(ciudad)) ?? ALIAS_DE_MUNICIPIO[plano(ciudad)];
  if (!municipio || plano(estado) !== plano(ESTADO_DE_COBERTURA)) {
    throw new ErrorDeNegocio(
      'Por ahora solo enviamos a la zona metropolitana de Guadalajara. Si estás fuera, puedes recoger tu pedido en mostrador.'
    );
  }
  return municipio;
}

// Dos direcciones son la misma si coinciden en todo lo que ubica el domicilio (no en telefono ni referencias).
export function esLaMismaDireccion(a, b) {
  return ['calle', 'numeroExterior', 'numeroInterior', 'colonia', 'codigoPostal', 'ciudad'].every(
    (campo) => plano(a[campo]) === plano(b[campo])
  );
}

const LARGO_MAXIMO = 120;
const LARGO_REFERENCIAS = 300;

// Un celular o fijo de Mexico son 10 digitos. Se aceptan espacios, guiones, parentesis y la lada de pais (+52).
export function normalizarTelefono(telefono) {
  let digitos = String(telefono ?? '').replace(/\D/g, '');
  if (digitos.length === 12 && digitos.startsWith('52')) digitos = digitos.slice(2);
  if (digitos.length !== 10) throw new ErrorDeNegocio('El teléfono debe tener 10 dígitos');
  return digitos;
}

function texto(valor, nombre, { obligatorio = true, maximo = LARGO_MAXIMO } = {}) {
  const limpio = String(valor ?? '').trim().replace(/\s+/g, ' ');
  if (!limpio) {
    if (obligatorio) throw new ErrorDeNegocio(`Falta ${nombre} en la dirección de envío`);
    return null;
  }
  if (limpio.length > maximo) throw new ErrorDeNegocio(`Acorta ${nombre} de la dirección (máximo ${maximo} caracteres)`);
  return limpio;
}

function direccionValida(direccion) {
  if (!direccion) throw new ErrorDeNegocio('Falta la dirección de envío');
  const codigoPostal = String(direccion.codigoPostal ?? '').trim();
  if (!/^\d{5}$/.test(codigoPostal)) throw new ErrorDeNegocio('El código postal debe tener 5 dígitos');
  return {
    calle: texto(direccion.calle, 'la calle'),
    numeroExterior: texto(direccion.numeroExterior, 'el número exterior', { maximo: 20 }),
    numeroInterior: texto(direccion.numeroInterior, 'el número interior', { obligatorio: false, maximo: 20 }),
    colonia: texto(direccion.colonia, 'la colonia'),
    codigoPostal,
    ciudad: municipioCubierto(texto(direccion.ciudad, 'el municipio'), direccion.estado),
    estado: ESTADO_DE_COBERTURA,
    referencias: texto(direccion.referencias, 'las referencias', { obligatorio: false, maximo: LARGO_REFERENCIAS }),
  };
}

// Convierte lo que pidio el cliente en una entrega valida para el pago elegido.
// Sin datos de entrega (clientes anteriores a este campo), el pedido se recoge en tienda.
export function planDeEntrega(solicitud, planDePago) {
  if (!solicitud) return { tipo: TIPOS_ENTREGA.TIENDA, telefono: null, direccion: null, guardar: false };

  if (!TIPOS_ENTREGA[solicitud.tipo]) throw new ErrorDeNegocio(`No existe el tipo de entrega ${solicitud.tipo}`);
  const aDomicilio = solicitud.tipo === TIPOS_ENTREGA.DOMICILIO;

  // "Pagar al recoger" se cobra en mostrador: no hay quien cobre en la puerta del comprador.
  if (aDomicilio && planDePago.metodo === METODOS.PICKUP) {
    throw new ErrorDeNegocio('Pagar al recoger solo aplica si recoges tu pedido en mostrador. Para envío a domicilio elige otra forma de pago.');
  }

  return {
    tipo: solicitud.tipo,
    // El telefono se pide siempre: para coordinar la entrega o avisar que el pedido ya se puede recoger.
    telefono: normalizarTelefono(solicitud.telefono),
    direccion: aDomicilio ? direccionValida(solicitud.direccion) : null,
    // El comprador pidio conservar esta direccion en su cuenta para la proxima compra.
    guardar: aDomicilio && Boolean(solicitud.guardar),
  };
}
