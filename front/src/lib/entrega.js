// Datos de entrega del checkout: textos, estados y formato de la direccion.

export const ENTREGAS = {
  DOMICILIO: {
    titulo: 'Envío a domicilio',
    descripcion: 'Lo enviamos a tu dirección dentro de la zona metropolitana de Guadalajara.',
  },
  TIENDA: {
    titulo: 'Recoger en mostrador',
    descripcion: 'Pasas por tu pedido a EnCaja. Es la única entrega que admite pagar al recoger.',
  },
};

// El costo del envio, el importe para que salga gratis y los municipios con cobertura NO estan aqui:
// los manda el servidor (reglasDeEnvio), que es quien cobra. Asi el checkout nunca muestra otro total.

export const DIRECCION_VACIA = {
  calle: '',
  numeroExterior: '',
  numeroInterior: '',
  colonia: '',
  codigoPostal: '',
  ciudad: '',
  referencias: '',
};

// Una direccion guardada en la cuenta, lista para el formulario (sin id ni telefono, sin nulos).
export function direccionDeGuardada(guardada) {
  return Object.fromEntries(Object.keys(DIRECCION_VACIA).map((campo) => [campo, guardada[campo] ?? '']));
}

// Lo que el servidor va a sumar al pedido por el envio.
export function costoDeEnvio(reglas, tipo, importeDePiezas) {
  return reglas && tipo === 'DOMICILIO' && importeDePiezas < reglas.gratisDesde ? reglas.costo : 0;
}

// Misma regla que el servidor: 10 digitos, con o sin la lada de pais (+52).
export function telefonoValido(telefono) {
  let digitos = telefono.replace(/\D/g, '');
  if (digitos.length === 12 && digitos.startsWith('52')) digitos = digitos.slice(2);
  return digitos.length === 10;
}

// Lo que se manda en PedidoInput.entrega. La direccion solo viaja en envios a domicilio.
// `guardar` pide conservarla en la cuenta (el servidor lo ignora si no hay sesion).
export function entregaParaEnviar(tipo, telefono, direccion, { estado, guardar = false } = {}) {
  if (tipo !== 'DOMICILIO') return { tipo, telefono };
  return {
    tipo,
    telefono,
    guardar,
    direccion: { ...direccion, estado, numeroInterior: direccion.numeroInterior || null, referencias: direccion.referencias || null },
  };
}

// "Av. Vallarta 1234 int. B, Col. Americana, 44160 Guadalajara, Jalisco"
export function direccionEnUnaLinea(direccion) {
  const interior = direccion.numeroInterior ? ` int. ${direccion.numeroInterior}` : '';
  return `${direccion.calle} ${direccion.numeroExterior}${interior}, Col. ${direccion.colonia}, ${direccion.codigoPostal} ${direccion.ciudad}, ${direccion.estado}`;
}
