# Facturación en EnCaja: comprobante de compra y CFDI 4.0

Se basa en la investigación *Manejo de XML y estructura del CFDI* (xmlbuilder2 + Anexo 20 del SAT).

## Qué puede hacer la tienda

| Documento | Para quién | Qué es |
|---|---|---|
| **Comprobante de compra** | Cualquier pedido pagado, con o sin RFC | Nota de venta con el IVA desglosado. Se imprime o se guarda en PDF. No es una factura. |
| **Factura (CFDI 4.0)** | Quien da sus datos fiscales | El XML del CFDI 4.0 con Emisor, Receptor, Conceptos, Impuestos y totales; sellado con el CSD de la tienda si está configurado. Se descarga el XML y se imprime su representación. |

Los dos están en `/comprobante?ref=<referencia del pago>`: se llega desde la página del pedido ("Comprobante y factura") y desde **Panel → Pedidos** (detalle del pedido). Funciona igual para invitados, porque la referencia la tiene quien compró.

### Estados de una factura

| Estado | Qué significa |
|---|---|
| `SIN_SELLO` | La tienda tiene datos fiscales, pero no CSD: el XML queda completo salvo el sello. |
| `SELLADA` | Con el sello del CSD de la tienda (cadena original firmada con SHA-256). Falta timbrarla. |
| `TIMBRADA` | Con el timbre de un PAC (UUID): la única con validez fiscal. **Todavía no se implementa** (ver abajo). |

Mientras no esté timbrada, el cliente puede corregir sus datos y la factura se vuelve a generar con el mismo folio.

## Cómo se arma (en el orden de la investigación, sección 2.8)

1. **Datos del receptor** (`dominio/facturacion.js`, `validarReceptor`): RFC con el patrón del XSD (12 caracteres empresa, 13 persona), nombre en mayúsculas, código postal de 5 dígitos, régimen que corresponda al tipo de RFC y uso del CFDI que el SAT permita para ese régimen. Los RFC genéricos (`XAXX010101000`, `XEXX010101000`) no se aceptan: para público en general está el comprobante de compra.
2. **Catálogos** (subconjunto vigente): `c_RegimenFiscal`, `c_UsoCFDI` (G01, G03, S01), `c_FormaPago`, `c_ClaveUnidad` (H87 pieza, E48 servicio). La clave de producto o servicio (`c_ClaveProdServ`) se configura por sistema del catálogo en **Panel → Ajustes**.
3. **Coherencia numérica**: los precios de la tienda incluyen IVA. De cada renglón, la base es `total / 1.16` a centavos y el IVA lo que falta para el total, así que la factura suma exactamente lo cobrado y el IVA de cada renglón queda dentro de la tolerancia del SAT (comprobado con 20 000 precios al azar). El valor unitario lleva hasta 6 decimales para que cantidad × valor = importe. El envío a domicilio es un renglón más (servicio, E48).
4. **Cadena original** (`cadenaOriginal`): valores separados por `|`, entre `||`, en el orden de la hoja de estilo oficial `cadenaoriginal_4_0.xslt` para los nodos que emite la tienda, con `normalize-space`.
5. **Sello** (`adaptadores/salida/cfdi/selloCsd.js`): firma RSA-SHA256 de la cadena con la llave del CSD; el resultado va en `Sello`, el certificado en `Certificado` y su número en `NoCertificado`.
6. **XML** (`adaptadores/salida/cfdi/xmlCfdi.js`): `xmlbuilder2`, namespace `http://www.sat.gob.mx/cfd/4` y `xsi:schemaLocation` del `cfdv40.xsd`.
7. **Timbrado con un PAC**: pendiente. Requiere contratar un PAC (Finkok, SW Sapien, Facturama…), que da credenciales de prueba. Se agregaría como un adaptador más (un puerto `Timbrador`): manda el XML sellado, recibe el `TimbreFiscalDigital` con el UUID, guarda el XML timbrado y pone la factura en `TIMBRADA`.

## Configuración (variables de entorno del backend)

```
CFDI_RFC=            # RFC de la tienda
CFDI_NOMBRE=         # razón social, sin el régimen societario (sin "S.A. DE C.V.")
CFDI_REGIMEN=601     # régimen fiscal de la tienda
CFDI_CP=             # código postal del domicilio fiscal (lugar de expedición)
CFDI_SERIE=A         # serie de las facturas (opcional)
CFDI_CLAVE_ENVIO=78102203   # clave SAT del renglón de envío (opcional; verifícala con tu contador)
CFDI_CSD_CER_BASE64= # el archivo .cer del CSD, en base64
CFDI_CSD_KEY_BASE64= # el archivo .key del CSD, en base64
CFDI_CSD_CLAVE=      # la contraseña del .key
```

- Sin `CFDI_RFC` (y los demás datos fiscales): solo hay comprobante de compra.
- Sin CSD: las facturas se generan `SIN_SELLO`.
- **Panel → Ajustes → Facturación** muestra qué falta (datos, CSD vencido, `.key` que no corresponde al `.cer`, RFC del CSD distinto al de la tienda…).

Para convertir los archivos del CSD a base64 (una línea, sin saltos):

```bash
node -e "console.log(require('fs').readFileSync('certificado.cer').toString('base64'))"
```
```bash
node -e "console.log(require('fs').readFileSync('llave.key').toString('base64'))"
```

En Render, pega cada resultado en su variable (Environment). No subas los archivos del CSD ni su contraseña al repositorio.

### Para probar sin datos reales

El SAT publica datos de prueba: el contribuyente `EKU9003173C9` (ESCUELA KEMPER URGATE, régimen 601, C.P. 42501) y receptores como `XIA190128J61` (XENON INDUSTRIAL ARTICLES, régimen 601, C.P. 76343). Sus CSD de prueba se descargan del portal del SAT o del sandbox de cualquier PAC.

## Lo que falta antes de facturar de verdad

- **Timbrar con un PAC** (paso 7): sin eso ninguna factura tiene validez fiscal, y la tienda lo dice en cada una.
- **Claves SAT**: solo se confirmaron `25171700` (Sistemas de frenado y componentes) y `25173900` (Componentes eléctricos). Los demás sistemas empiezan con `01010101`; búscalas en el [catálogo del SAT](http://pys.sat.gob.mx/PyS/catPyS.aspx) y cámbialas en el panel. La clave del envío (`78102203`) también conviene confirmarla.
- **Forma de pago**: tarjeta y link de pago se facturan con `31` (intermediario de pagos), porque la tienda no sabe si fue crédito o débito; mostrador y tienda de conveniencia con `01` (efectivo). Ajústalo con tu contador si cobras con terminal en mostrador.
- **Validación contra el XSD**: el XML se arma con la estructura del Anexo 20, pero no se valida contra `cfdv40.xsd` dentro de la tienda (como dice la investigación, xmlbuilder2 no valida esquemas). El PAC lo valida al timbrar.
- **Factura global** (ventas a público en general del día o del mes, con `InformacionGlobal`) y **cancelación** ante el SAT: no están.
