// Casos de uso de la facturacion: el comprobante de compra (desglose con IVA) de cualquier pedido, y la factura
// CFDI 4.0 que pide el cliente con sus datos fiscales. El XML lo escribe el adaptador (xmlbuilder2) y lo sella el
// CSD de la tienda si esta configurado. Timbrarlo (validez fiscal) requiere un PAC: queda como siguiente paso.
import { ErrorDeNegocio } from '../dominio/errores.js';
import { esAdmin, esDuenoOAdmin, esPersonal, exigirAdmin } from '../dominio/permisos.js';
import {
  ESTADOS_FACTURA,
  ESTADOS_FACTURABLES,
  FORMAS_DE_PAGO,
  REGIMENES,
  USOS_CFDI,
  armarComprobante,
  cadenaOriginal,
  desglosar,
  esClaveProdServ,
  fechaDelComprobante,
  formaDePagoDe,
  revisarEmisor,
  validarReceptor,
} from '../dominio/facturacion.js';

const nombreDe = (lista, clave) => lista.find((x) => x.clave === clave)?.nombre ?? clave;

/**
 * @param {{ repos: import('../puertos/salida.js').Repositorios, sellador: import('../puertos/salida.js').SelladorCfdi,
 *           xml: import('../puertos/salida.js').GeneradorCfdi,
 *           facturacion: { emisor: { rfc, nombre, regimenFiscal, codigoPostal }, serie: string, claveEnvio: string } }} puertos
 */
export function crearFacturacion({ repos, sellador, xml, facturacion }) {
  const { emisor, serie, claveEnvio } = facturacion;
  const faltaEmisor = revisarEmisor(emisor);

  // Renglones del pedido con lo que necesita el CFDI: descripcion, numero de parte y clave SAT de su sistema.
  async function desgloseDe(pedido) {
    const [detalles, entrega] = await Promise.all([repos.pedidos.detallesDe(pedido.id), repos.entregas.dePedido(pedido.id)]);
    const claves = new Map((await repos.categorias.listar()).map((c) => [c.id, c.claveSat]));
    const lineas = await Promise.all(
      detalles.map(async (d) => {
        const producto = await repos.productos.porId(d.productoId);
        return {
          descripcion: [producto?.nombre ?? `Pieza ${d.productoId}`, producto?.marca].filter(Boolean).join(' '),
          numeroParte: producto?.numeroParte ?? null,
          cantidad: d.cantidad,
          precio: d.precioUnitario,
          claveProdServ: claves.get(producto?.categoriaId),
        };
      })
    );
    return desglosar({ lineas, envio: entrega?.costo ?? 0, claveEnvio });
  }

  async function pedidoDeReferencia(referencia) {
    const pago = await repos.pagos.porReferencia(referencia);
    if (!pago) throw new ErrorDeNegocio('No encontramos ese pedido. Revisa que el enlace esté completo.');
    return { pago, pedido: await repos.pedidos.porId(pago.pedidoId) };
  }

  // Lo que se muestra de una factura (en pantalla e impresa), a partir de lo que se guardo al generarla.
  function paraMostrar(factura) {
    if (!factura) return null;
    const { comprobante: c, cadenaOriginal: cadena, sello } = factura.datos;
    return {
      id: factura.id,
      serie: factura.serie,
      folio: factura.folio,
      estado: factura.estado,
      uuid: factura.uuid,
      fecha: c.Fecha,
      emisor: {
        rfc: c.emisor.Rfc,
        nombre: c.emisor.Nombre,
        regimenFiscal: c.emisor.RegimenFiscal,
        regimenFiscalNombre: nombreDe(REGIMENES, c.emisor.RegimenFiscal),
        codigoPostal: c.LugarExpedicion,
      },
      receptor: {
        rfc: c.receptor.Rfc,
        nombre: c.receptor.Nombre,
        regimenFiscal: c.receptor.RegimenFiscalReceptor,
        regimenFiscalNombre: nombreDe(REGIMENES, c.receptor.RegimenFiscalReceptor),
        codigoPostal: c.receptor.DomicilioFiscalReceptor,
      },
      usoCfdi: c.receptor.UsoCFDI,
      usoCfdiNombre: nombreDe(USOS_CFDI, c.receptor.UsoCFDI),
      formaPago: c.FormaPago,
      formaPagoNombre: FORMAS_DE_PAGO[c.FormaPago] ?? c.FormaPago,
      metodoPago: c.MetodoPago,
      conceptos: c.conceptos.map((k) => ({
        descripcion: k.Descripcion,
        numeroParte: k.NoIdentificacion ?? null,
        cantidad: Number(k.Cantidad),
        claveProdServ: k.ClaveProdServ,
        claveUnidad: k.ClaveUnidad,
        unidad: k.Unidad,
        valorUnitario: Number(k.ValorUnitario),
        importe: Number(k.Importe),
        iva: Number(k.traslados[0].Importe),
      })),
      subtotal: Number(c.SubTotal),
      iva: Number(c.impuestos.TotalImpuestosTrasladados),
      total: Number(c.Total),
      noCertificado: c.NoCertificado ?? null,
      sello: sello ?? null,
      cadenaOriginal: cadena,
      xml: factura.xml,
    };
  }

  return {
    // Lo que necesita el formulario de factura (catalogos) y, para el admin, por que no se puede facturar o sellar.
    configuracion(actor) {
      const admin = esAdmin(actor);
      return {
        disponible: !faltaEmisor,
        emisor: faltaEmisor
          ? null
          : { ...emisor, regimenFiscalNombre: nombreDe(REGIMENES, emisor.regimenFiscal) },
        sellado: !faltaEmisor && sellador.disponible,
        motivo: admin ? (faltaEmisor ?? sellador.motivo ?? null) : null,
        noCertificado: admin && sellador.disponible ? sellador.noCertificado : null,
        venceCsd: admin && sellador.disponible ? sellador.vence : null,
        regimenes: REGIMENES,
        usos: USOS_CFDI,
      };
    },

    // Comprobante de compra: el desglose del pedido con la unidad del SAT de cada renglon.
    async desgloseParaMostrar(pedido) {
      const d = await desgloseDe(pedido);
      return { ...d, conceptos: d.conceptos.map((c) => ({ ...c, claveUnidad: c.unidad.clave, unidad: c.unidad.nombre })) };
    },

    async facturaPorReferencia(referencia) {
      const { pedido } = await pedidoDeReferencia(referencia);
      return paraMostrar(await repos.facturas.dePedido(pedido.id));
    },

    // Para el panel y "mis pedidos": solo el dueño del pedido y el personal ven si ya tiene factura.
    async facturaDe(actor, pedido) {
      if (!esPersonal(actor) && !esDuenoOAdmin(actor, pedido.usuarioId)) return null;
      return paraMostrar(await repos.facturas.dePedido(pedido.id));
    },

    // La pide quien tiene el enlace del pedido (el comprador, aunque sea invitado) o el personal desde el panel.
    async solicitar(referencia, datos) {
      if (faltaEmisor) throw new ErrorDeNegocio('La tienda todavía no emite facturas en línea. Puedes descargar tu comprobante de compra.');
      const { pago, pedido } = await pedidoDeReferencia(referencia);
      if (!ESTADOS_FACTURABLES.includes(pedido.status)) {
        throw new ErrorDeNegocio('La factura se puede pedir cuando el pedido ya está pagado.');
      }
      const receptor = validarReceptor(datos);
      const anterior = await repos.facturas.dePedido(pedido.id);
      if (anterior?.estado === ESTADOS_FACTURA.TIMBRADA) {
        throw new ErrorDeNegocio('Este pedido ya tiene una factura timbrada: para cambiarla hay que cancelarla ante el SAT.');
      }

      const comprobante = armarComprobante({
        emisor,
        receptor,
        desglose: await desgloseDe(pedido),
        serie,
        folio: anterior?.folio ?? (await repos.facturas.siguienteFolio()),
        fecha: fechaDelComprobante(),
        formaPago: formaDePagoDe(pago.metodo),
        noCertificado: sellador.disponible ? sellador.noCertificado : null,
      });
      const cadena = cadenaOriginal(comprobante);
      const sello = sellador.disponible ? sellador.sellar(cadena) : null;

      const factura = await repos.facturas.guardar({
        pedidoId: pedido.id,
        serie: comprobante.Serie,
        folio: Number(comprobante.Folio),
        estado: sello ? ESTADOS_FACTURA.SELLADA : ESTADOS_FACTURA.SIN_SELLO,
        rfcReceptor: receptor.rfc,
        datos: { comprobante, cadenaOriginal: cadena, sello },
        xml: xml.armar(comprobante, { sello, certificado: sello ? sellador.certificado : null }),
      });
      return paraMostrar(factura);
    },

    // Clave SAT con la que se facturan las piezas de un sistema del catalogo.
    async cambiarClaveSat(actor, categoriaId, claveSat) {
      exigirAdmin(actor);
      const clave = (claveSat ?? '').trim();
      if (!esClaveProdServ(clave)) throw new ErrorDeNegocio('La clave de producto o servicio del SAT tiene 8 dígitos.');
      const categoria = await repos.categorias.cambiarClaveSat(categoriaId, clave);
      if (!categoria) throw new ErrorDeNegocio(`No existe el sistema ${categoriaId}`);
      return categoria;
    },
  };
}
