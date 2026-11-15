// Adaptador de salida: sella la cadena original con el Certificado de Sello Digital (CSD) de la tienda.
// El CSD son dos archivos que da el SAT: el .cer (certificado X.509 en DER) y el .key (llave privada PKCS#8 en DER,
// cifrada con la contraseña del CSD). Se pasan en base64 por variables de entorno para no subirlos al repositorio.
// El sello es la firma RSA con SHA-256 de la cadena original, en base64 (Anexo 20).
import crypto from 'node:crypto';

// El numero de certificado (NoCertificado) es el numero de serie del .cer: el SAT lo emite como texto de 20 digitos
// guardado en hexadecimal ("3330303031..." → "30001...").
function numeroDeCertificado(x509) {
  const hex = x509.serialNumber.length % 2 ? `0${x509.serialNumber}` : x509.serialNumber;
  const texto = Buffer.from(hex, 'hex').toString('latin1');
  return /^\d+$/.test(texto) ? texto : x509.serialNumber;
}

// El RFC del titular viene en el sujeto del certificado (x500UniqueIdentifier, "RFC / CURP").
const rfcDelCertificado = (x509) => x509.subject.match(/[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}/)?.[0] ?? null;

/** @returns {import('../../../puertos/salida.js').SelladorCfdi} */
export function crearSelloCsd({ cer, key, clave }, rfcEmisor) {
  const sinSello = (motivo) => ({ disponible: false, motivo, sellar: () => null });
  if (!cer || !key) return sinSello('La tienda no tiene CSD configurado (CFDI_CSD_CER_BASE64 y CFDI_CSD_KEY_BASE64): las facturas se generan sin sello.');

  let x509;
  let llave;
  try {
    x509 = new crypto.X509Certificate(Buffer.from(cer, 'base64'));
  } catch {
    return sinSello('El certificado del CSD (CFDI_CSD_CER_BASE64) no se pudo leer: debe ser el archivo .cer en base64.');
  }
  try {
    llave = crypto.createPrivateKey({ key: Buffer.from(key, 'base64'), format: 'der', type: 'pkcs8', passphrase: clave ?? '' });
  } catch {
    return sinSello('La llave del CSD no abre: revisa el archivo .key (CFDI_CSD_KEY_BASE64) y su contraseña (CFDI_CSD_CLAVE).');
  }

  const publicaDelCertificado = x509.publicKey.export({ type: 'spki', format: 'der' });
  const publicaDeLaLlave = crypto.createPublicKey(llave).export({ type: 'spki', format: 'der' });
  if (!publicaDelCertificado.equals(publicaDeLaLlave)) return sinSello('El .key no corresponde al .cer del CSD.');

  const rfc = rfcDelCertificado(x509);
  if (rfc && rfcEmisor && rfc !== rfcEmisor) return sinSello(`El CSD es del RFC ${rfc} y la tienda está configurada con ${rfcEmisor} (CFDI_RFC).`);
  const vence = new Date(x509.validTo);
  if (vence < new Date()) return sinSello(`El CSD venció el ${vence.toISOString().slice(0, 10)}.`);

  return {
    disponible: true,
    motivo: null,
    noCertificado: numeroDeCertificado(x509),
    certificado: Buffer.from(cer, 'base64').toString('base64'),
    vence: vence.toISOString().slice(0, 10),
    sellar: (cadena) => crypto.sign('RSA-SHA256', Buffer.from(cadena, 'utf8'), llave).toString('base64'),
  };
}
