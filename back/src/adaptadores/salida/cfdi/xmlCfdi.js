// Adaptador de salida: escribe el XML del CFDI 4.0 con xmlbuilder2 a partir del comprobante que arma el dominio
// (dominio/facturacion.js). Solo sabe de XML: namespaces, orden de los nodos y atributos.
import { create } from 'xmlbuilder2';

const CFDI = 'http://www.sat.gob.mx/cfd/4';
const XSI = 'http://www.w3.org/2001/XMLSchema-instance';
const ESQUEMA = 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd';

// Atributos definidos, en el orden en que vienen (los opcionales sin valor no se escriben).
const atributos = (nodo) => Object.fromEntries(Object.entries(nodo).filter(([, v]) => v != null && typeof v !== 'object'));

/** @returns {import('../../../puertos/salida.js').GeneradorCfdi} */
export function crearXmlCfdi() {
  return {
    // sello y certificado (base64) solo si la tienda tiene CSD; sin ellos el XML queda listo pero sin sellar.
    armar(comprobante, { sello = null, certificado = null } = {}) {
      const raiz = create({ version: '1.0', encoding: 'UTF-8' }).ele(CFDI, 'cfdi:Comprobante', {
        'xmlns:xsi': XSI,
        'xsi:schemaLocation': ESQUEMA,
        ...atributos(comprobante),
        ...(sello ? { Sello: sello, Certificado: certificado } : {}),
      });

      raiz.ele(CFDI, 'cfdi:Emisor', atributos(comprobante.emisor));
      raiz.ele(CFDI, 'cfdi:Receptor', atributos(comprobante.receptor));

      const conceptos = raiz.ele(CFDI, 'cfdi:Conceptos');
      for (const c of comprobante.conceptos) {
        const concepto = conceptos.ele(CFDI, 'cfdi:Concepto', atributos(c));
        const traslados = concepto.ele(CFDI, 'cfdi:Impuestos').ele(CFDI, 'cfdi:Traslados');
        for (const t of c.traslados) traslados.ele(CFDI, 'cfdi:Traslado', t);
      }

      const impuestos = raiz.ele(CFDI, 'cfdi:Impuestos', { TotalImpuestosTrasladados: comprobante.impuestos.TotalImpuestosTrasladados });
      const traslados = impuestos.ele(CFDI, 'cfdi:Traslados');
      for (const t of comprobante.impuestos.traslados) traslados.ele(CFDI, 'cfdi:Traslado', t);

      return raiz.end({ prettyPrint: true });
    },

    // Lee un XML ya generado (para mostrar lo que de verdad se guardo); regresa el objeto de xmlbuilder2.
    leer: (xml) => create(xml).end({ format: 'object' }),
  };
}
