// Reglas de la facturacion (CFDI 4.0, Anexo 20 del SAT): catalogos que la tienda usa, validacion de los datos
// fiscales del cliente, desglose del IVA de un pedido, armado del comprobante y su cadena original.
// El XML lo escribe el adaptador (xmlbuilder2) y el sello lo pone el adaptador del CSD; aqui solo hay reglas.
import { ErrorDeNegocio } from './errores.js';
import { METODOS } from './pagos.js';

export const IVA = 0.16;
export const ESTADOS_FACTURA = { SIN_SELLO: 'SIN_SELLO', SELLADA: 'SELLADA', TIMBRADA: 'TIMBRADA' };
// Solo se factura lo que ya se vendio.
export const ESTADOS_FACTURABLES = ['PAGADO', 'ENVIADO', 'ENTREGADO'];

// c_RegimenFiscal (los que puede tener quien compra refacciones). persona: F fisica, M moral.
export const REGIMENES = [
  ['601', 'General de Ley Personas Morales', 'M'],
  ['603', 'Personas Morales con Fines no Lucrativos', 'M'],
  ['605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios', 'F'],
  ['606', 'Arrendamiento', 'F'],
  ['607', 'Régimen de Enajenación o Adquisición de Bienes', 'F'],
  ['608', 'Demás ingresos', 'F'],
  ['611', 'Ingresos por Dividendos (socios y accionistas)', 'F'],
  ['612', 'Personas Físicas con Actividades Empresariales y Profesionales', 'F'],
  ['614', 'Ingresos por intereses', 'F'],
  ['615', 'Régimen de los ingresos por obtención de premios', 'F'],
  ['616', 'Sin obligaciones fiscales', 'F'],
  ['620', 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos', 'M'],
  ['621', 'Incorporación Fiscal', 'F'],
  ['622', 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', 'M'],
  ['623', 'Opcional para Grupos de Sociedades', 'M'],
  ['624', 'Coordinados', 'M'],
  ['625', 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', 'F'],
  ['626', 'Régimen Simplificado de Confianza', 'FM'],
].map(([clave, nombre, persona]) => ({ clave, nombre, persona }));

// c_UsoCFDI que tienen sentido al comprar refacciones, con los regimenes que el SAT permite para cada uso.
const CON_ACTIVIDAD = ['601', '603', '606', '612', '620', '621', '622', '623', '624', '625', '626'];
export const USOS_CFDI = [
  { clave: 'G01', nombre: 'Adquisición de mercancías', regimenes: CON_ACTIVIDAD },
  { clave: 'G03', nombre: 'Gastos en general', regimenes: CON_ACTIVIDAD },
  { clave: 'S01', nombre: 'Sin efectos fiscales', regimenes: REGIMENES.map((r) => r.clave) },
];

// c_FormaPago segun como se cobro. Con tarjeta o link no sabemos si fue credito o debito (lo sabe la pasarela):
// para eso es la clave 31, "Intermediario pagos". Al recoger y en tienda de conveniencia se paga en efectivo.
export const FORMAS_DE_PAGO = { '01': 'Efectivo', '04': 'Tarjeta de crédito', '28': 'Tarjeta de débito', '31': 'Intermediario pagos' };
const FORMA_DE_PAGO_DE = { [METODOS.TARJETA]: '31', [METODOS.LINK]: '31', [METODOS.TIENDA]: '01', [METODOS.PICKUP]: '01' };
export const formaDePagoDe = (metodo) => FORMA_DE_PAGO_DE[metodo] ?? '31';

export const CLAVE_UNIDAD_PIEZA = { clave: 'H87', nombre: 'Pieza' };
export const CLAVE_UNIDAD_SERVICIO = { clave: 'E48', nombre: 'Unidad de servicio' };
// "No existe en el catalogo": la acepta el SAT cuando no hay una clave parecida. Cada sistema del catalogo
// puede tener la suya (Panel → Ajustes).
export const CLAVE_PROD_SERV_GENERICA = '01010101';

// Patron del RFC en el esquema del CFDI 4.0 (tdCFDI.xsd).
const PATRON_RFC = /^[A-ZÑ&]{3,4}[0-9]{2}(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{2}[0-9A]$/;
const RFC_GENERICOS = { XAXX010101000: 'público en general', XEXX010101000: 'extranjeros' };
export const esClaveProdServ = (clave) => /^\d{8}$/.test(clave ?? '');

const centavos = (n) => Math.round(n * 100) / 100;
const dinero = (n) => centavos(n).toFixed(2);

// Los datos del cliente, como deben ir en el CFDI 4.0: el SAT los compara con su Constancia de Situacion Fiscal.
export function validarReceptor(datos) {
  const rfc = (datos.rfc ?? '').trim().toUpperCase();
  const nombre = (datos.nombre ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
  const codigoPostal = (datos.codigoPostal ?? '').trim();
  if (RFC_GENERICOS[rfc]) {
    throw new ErrorDeNegocio(
      `Con el RFC genérico de ${RFC_GENERICOS[rfc]} no se emite una factura a tu nombre: descarga tu comprobante de compra.`
    );
  }
  if (!PATRON_RFC.test(rfc)) throw new ErrorDeNegocio('El RFC no tiene un formato válido (12 caracteres si es empresa, 13 si es persona).');
  if (!nombre) throw new ErrorDeNegocio('Escribe el nombre o la razón social tal como aparece en tu Constancia de Situación Fiscal.');
  if (nombre.length > 254) throw new ErrorDeNegocio('El nombre o la razón social es demasiado largo.');
  if (!/^\d{5}$/.test(codigoPostal)) throw new ErrorDeNegocio('El código postal del domicilio fiscal debe tener 5 dígitos.');

  const persona = rfc.length === 12 ? 'M' : 'F';
  const regimen = REGIMENES.find((r) => r.clave === datos.regimenFiscal);
  if (!regimen) throw new ErrorDeNegocio('Elige tu régimen fiscal.');
  if (!regimen.persona.includes(persona)) {
    throw new ErrorDeNegocio(
      `El régimen ${regimen.clave} es de ${regimen.persona === 'M' ? 'personas morales' : 'personas físicas'} y tu RFC es de ${persona === 'M' ? 'una persona moral' : 'una persona física'}.`
    );
  }
  const uso = USOS_CFDI.find((u) => u.clave === datos.usoCfdi);
  if (!uso) throw new ErrorDeNegocio('Elige el uso que le darás a la factura.');
  if (!uso.regimenes.includes(regimen.clave)) {
    throw new ErrorDeNegocio(`Con el régimen ${regimen.clave} el SAT no permite el uso ${uso.clave} (${uso.nombre}).`);
  }
  return { rfc, nombre, codigoPostal, regimenFiscal: regimen.clave, usoCfdi: uso.clave };
}

// Desglose del IVA de un pedido. Los precios de la tienda ya traen IVA: de cada renglon se saca la base
// (total / 1.16, a centavos) y el IVA es lo que falta para llegar al total, asi la suma da exactamente lo que se
// cobro y el IVA de cada renglon queda dentro de la tolerancia del SAT (base × 0.16, ± medio centavo de la base).
// lineas: [{ descripcion, numeroParte, cantidad, precio (con IVA), claveProdServ }], envio: costo con IVA.
export function desglosar({ lineas, envio, claveEnvio }) {
  const renglones = lineas.map((l) => ({
    descripcion: l.descripcion,
    numeroParte: l.numeroParte ?? null,
    cantidad: l.cantidad,
    claveProdServ: esClaveProdServ(l.claveProdServ) ? l.claveProdServ : CLAVE_PROD_SERV_GENERICA,
    unidad: CLAVE_UNIDAD_PIEZA,
    total: centavos(l.precio * l.cantidad),
  }));
  if (envio > 0) {
    renglones.push({
      descripcion: 'Envío a domicilio',
      numeroParte: null,
      cantidad: 1,
      claveProdServ: esClaveProdServ(claveEnvio) ? claveEnvio : CLAVE_PROD_SERV_GENERICA,
      unidad: CLAVE_UNIDAD_SERVICIO,
      total: centavos(envio),
    });
  }
  const conceptos = renglones.map((r) => {
    const importe = centavos(r.total / (1 + IVA));
    return {
      ...r,
      importe,
      iva: centavos(r.total - importe),
      // Hasta 6 decimales: cantidad × valor unitario reproduce el importe.
      valorUnitario: Math.round((importe / r.cantidad) * 1e6) / 1e6,
    };
  });
  const subtotal = centavos(conceptos.reduce((s, c) => s + c.importe, 0));
  const iva = centavos(conceptos.reduce((s, c) => s + c.iva, 0));
  return { conceptos, subtotal, iva, total: centavos(subtotal + iva) };
}

// El comprobante como objeto, con los nombres de atributo del Anexo 20 y los valores ya como texto.
export function armarComprobante({ emisor, receptor, desglose, serie, folio, fecha, formaPago, noCertificado }) {
  const conceptos = desglose.conceptos.map((c) => ({
    ClaveProdServ: c.claveProdServ,
    NoIdentificacion: c.numeroParte ?? undefined,
    Cantidad: String(c.cantidad),
    ClaveUnidad: c.unidad.clave,
    Unidad: c.unidad.nombre,
    Descripcion: c.descripcion,
    ValorUnitario: c.valorUnitario.toFixed(6).replace(/0{1,4}$/, ''),
    Importe: dinero(c.importe),
    ObjetoImp: '02',
    traslados: [{ Base: dinero(c.importe), Impuesto: '002', TipoFactor: 'Tasa', TasaOCuota: '0.160000', Importe: dinero(c.iva) }],
  }));
  return {
    Version: '4.0',
    Serie: serie,
    Folio: String(folio),
    Fecha: fecha,
    FormaPago: formaPago,
    NoCertificado: noCertificado ?? undefined,
    SubTotal: dinero(desglose.subtotal),
    Moneda: 'MXN',
    Total: dinero(desglose.total),
    TipoDeComprobante: 'I',
    Exportacion: '01',
    MetodoPago: 'PUE',
    LugarExpedicion: emisor.codigoPostal,
    emisor: { Rfc: emisor.rfc, Nombre: emisor.nombre, RegimenFiscal: emisor.regimenFiscal },
    receptor: {
      Rfc: receptor.rfc,
      Nombre: receptor.nombre,
      DomicilioFiscalReceptor: receptor.codigoPostal,
      RegimenFiscalReceptor: receptor.regimenFiscal,
      UsoCFDI: receptor.usoCfdi,
    },
    conceptos,
    impuestos: {
      TotalImpuestosTrasladados: dinero(desglose.iva),
      traslados: [{ Base: dinero(desglose.subtotal), Impuesto: '002', TipoFactor: 'Tasa', TasaOCuota: '0.160000', Importe: dinero(desglose.iva) }],
    },
  };
}

// Cadena original: los valores del comprobante separados por "|", entre "||", en el orden de la hoja de estilo
// oficial (cadenaoriginal_4_0.xslt) para los nodos que emite la tienda. Es lo que se sella con el CSD.
const ORDEN = {
  comprobante: ['Version', 'Serie', 'Folio', 'Fecha', 'FormaPago', 'NoCertificado', 'CondicionesDePago', 'SubTotal', 'Descuento', 'Moneda', 'TipoCambio', 'Total', 'TipoDeComprobante', 'Exportacion', 'MetodoPago', 'LugarExpedicion', 'Confirmacion'],
  emisor: ['Rfc', 'Nombre', 'RegimenFiscal', 'FacAtrAdquirente'],
  receptor: ['Rfc', 'Nombre', 'DomicilioFiscalReceptor', 'ResidenciaFiscal', 'NumRegIdTrib', 'RegimenFiscalReceptor', 'UsoCFDI'],
  concepto: ['ClaveProdServ', 'NoIdentificacion', 'Cantidad', 'ClaveUnidad', 'Unidad', 'Descripcion', 'ValorUnitario', 'Importe', 'Descuento', 'ObjetoImp'],
  traslado: ['Base', 'Impuesto', 'TipoFactor', 'TasaOCuota', 'Importe'],
};
// normalize-space de XSLT: sin espacios al inicio ni al final, y los de en medio de uno en uno.
const normalizar = (valor) => String(valor).replace(/\s+/g, ' ').trim();
const valores = (nodo, orden) => orden.filter((a) => nodo[a] != null).map((a) => normalizar(nodo[a]));

export function cadenaOriginal(c) {
  const partes = [
    ...valores(c, ORDEN.comprobante),
    ...valores(c.emisor, ORDEN.emisor),
    ...valores(c.receptor, ORDEN.receptor),
    ...c.conceptos.flatMap((concepto) => [
      ...valores(concepto, ORDEN.concepto),
      ...concepto.traslados.flatMap((t) => valores(t, ORDEN.traslado)),
    ]),
    ...c.impuestos.traslados.flatMap((t) => valores(t, ORDEN.traslado)),
    normalizar(c.impuestos.TotalImpuestosTrasladados),
  ];
  return `||${partes.join('|')}||`;
}

// Fecha del comprobante: hora de Guadalajara, sin zona (AAAA-MM-DDThh:mm:ss), como la pide el Anexo 20.
const FECHA_LOCAL = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Mexico_City',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});
export const fechaDelComprobante = (fecha = new Date()) => FECHA_LOCAL.format(fecha).replace(' ', 'T');

// Los datos fiscales de la tienda (variables de entorno CFDI_*) deben estar completos y tener forma valida.
export function revisarEmisor(emisor) {
  if (!emisor?.rfc) return 'Faltan los datos fiscales de la tienda (CFDI_RFC, CFDI_NOMBRE, CFDI_REGIMEN y CFDI_CP).';
  if (!PATRON_RFC.test(emisor.rfc)) return `El RFC de la tienda (CFDI_RFC) no tiene un formato válido.`;
  if (!emisor.nombre) return 'Falta la razón social de la tienda (CFDI_NOMBRE).';
  if (!REGIMENES.some((r) => r.clave === emisor.regimenFiscal)) {
    return 'El régimen fiscal de la tienda (CFDI_REGIMEN) no es válido.';
  }
  if (!/^\d{5}$/.test(emisor.codigoPostal ?? '')) return 'El código postal de la tienda (CFDI_CP) debe tener 5 dígitos.';
  return null;
}
