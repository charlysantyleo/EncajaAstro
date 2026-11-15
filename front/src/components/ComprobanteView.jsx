import { useState } from 'react';
import { ArrowLeft, Download, Loader2, Printer } from './ui/Iconos';
import { graphqlRequest } from '../graphql/client';
import { MUTATION_SOLICITAR_FACTURA, QUERY_COMPROBANTE } from '../graphql/queries';
import { useGraphQLQuery } from '../hooks/useGraphQLQuery';
import { pesos } from '../lib/formato';
import { METODOS } from '../lib/pagos';
import { leerParametros, rutas } from '../lib/rutas';
import { Cargando } from './EstadoCarga';
import { comoIsla } from './ui/Isla';

const FACTURABLES = ['PAGADO', 'ENVIADO', 'ENTREGADO'];
const ESTADO_FACTURA = {
  SIN_SELLO: 'Sin sellar',
  SELLADA: 'Sellada, sin timbrar',
  TIMBRADA: 'Timbrada',
};
const VACIO = { rfc: '', nombre: '', codigoPostal: '', regimenFiscal: '', usoCfdi: '' };
// En la factura el valor unitario lleva los decimales del XML (hasta 6): cantidad × valor = importe, exacto.
const exacto = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 6 });

function descargarXml(factura) {
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob([factura.xml], { type: 'application/xml' }));
  enlace.download = `${factura.emisor.rfc}_${factura.serie}${factura.folio}.xml`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

// Renglones con precio sin IVA, importe e IVA. Lo usan el comprobante de compra y la factura.
function Conceptos({ conceptos, conClaves = false }) {
  return (
    <table className="comprobante-tabla">
      <thead>
        <tr>
          {conClaves && <th>Clave SAT</th>}
          <th className="num">Cant.</th>
          {conClaves && <th>Unidad</th>}
          <th>Descripción</th>
          <th className="num">Valor unitario</th>
          <th className="num">Importe</th>
          <th className="num">IVA 16 %</th>
        </tr>
      </thead>
      <tbody>
        {conceptos.map((c, i) => (
          <tr key={i}>
            {conClaves && <td className="mono">{c.claveProdServ}</td>}
            <td className="num">{c.cantidad}</td>
            {conClaves && (
              <td className="mono">
                {c.claveUnidad} {c.unidad}
              </td>
            )}
            <td>
              {c.descripcion}
              {c.numeroParte && <span className="mono apagado"> · {c.numeroParte}</span>}
            </td>
            <td className="num">{conClaves ? exacto.format(c.valorUnitario) : pesos(c.valorUnitario)}</td>
            <td className="num">{pesos(c.importe)}</td>
            <td className="num">{pesos(c.iva)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Totales({ subtotal, iva, total }) {
  return (
    <dl className="comprobante-totales">
      <div>
        <dt>Subtotal</dt>
        <dd>{pesos(subtotal)}</dd>
      </div>
      <div>
        <dt>IVA 16 %</dt>
        <dd>{pesos(iva)}</dd>
      </div>
      <div className="comprobante-total">
        <dt>Total</dt>
        <dd>{pesos(total)}</dd>
      </div>
    </dl>
  );
}

// Nota de venta de cualquier pedido pagado: no es una factura, pero desglosa el IVA.
function ComprobanteDeCompra({ pedido, emisor }) {
  return (
    <>
      <header className="comprobante-cabeza">
        <div>
          <h2>Comprobante de compra</h2>
          <p className="apagado">Pedido N.º {pedido.id} · {pedido.fecha}</p>
        </div>
        <div className="comprobante-emisor">
          <strong>EnCaja Autopartes</strong>
          {emisor && (
            <span>
              {emisor.nombre} · RFC {emisor.rfc}
            </span>
          )}
          <span>Guadalajara, Jalisco</span>
        </div>
      </header>
      <dl className="comprobante-datos">
        <div>
          <dt>Cliente</dt>
          <dd>{pedido.usuario.nombre}</dd>
        </div>
        <div>
          <dt>Forma de pago</dt>
          <dd>{pedido.pago ? METODOS[pedido.pago.metodo].titulo : '—'}</dd>
        </div>
        <div>
          <dt>Entrega</dt>
          <dd>{pedido.entrega?.tipo === 'DOMICILIO' ? 'A domicilio' : 'Recoger en mostrador'}</dd>
        </div>
      </dl>
      <Conceptos conceptos={pedido.desglose.conceptos} />
      <Totales {...pedido.desglose} />
      <p className="comprobante-leyenda">Este comprobante no es una factura (CFDI). Los precios incluyen IVA.</p>
    </>
  );
}

// Representacion impresa del CFDI 4.0, con los datos que pide el Anexo 20.
function FacturaImpresa({ factura: f }) {
  const timbrada = f.estado === 'TIMBRADA';
  return (
    <>
      <header className="comprobante-cabeza">
        <div>
          <h2>
            Factura{' '}
            <span className="mono">
              {f.serie}-{f.folio}
            </span>
          </h2>
          <p className="apagado">CFDI 4.0 · Ingreso · {f.fecha.replace('T', ' ')}</p>
          <span className={`etiqueta ${timbrada ? 'relleno' : ''}`}>{ESTADO_FACTURA[f.estado]}</span>
        </div>
        <div className="comprobante-emisor">
          <strong>{f.emisor.nombre}</strong>
          <span>RFC {f.emisor.rfc}</span>
          <span>
            Régimen {f.emisor.regimenFiscal} · {f.emisor.regimenFiscalNombre}
          </span>
          <span>Lugar de expedición: C.P. {f.emisor.codigoPostal}</span>
        </div>
      </header>
      {!timbrada && (
        <p className="comprobante-aviso" role="note">
          Este comprobante todavía no está timbrado por un PAC: no tiene validez fiscal ni folio fiscal (UUID).
        </p>
      )}
      <dl className="comprobante-datos">
        <div>
          <dt>Receptor</dt>
          <dd>
            {f.receptor.nombre}
            <br />
            RFC {f.receptor.rfc} · C.P. {f.receptor.codigoPostal}
          </dd>
        </div>
        <div>
          <dt>Régimen del receptor</dt>
          <dd>
            {f.receptor.regimenFiscal} · {f.receptor.regimenFiscalNombre}
          </dd>
        </div>
        <div>
          <dt>Uso del CFDI</dt>
          <dd>
            {f.usoCfdi} · {f.usoCfdiNombre}
          </dd>
        </div>
        <div>
          <dt>Forma y método de pago</dt>
          <dd>
            {f.formaPago} · {f.formaPagoNombre}
            <br />
            {f.metodoPago} · Pago en una sola exhibición
          </dd>
        </div>
        {f.uuid && (
          <div>
            <dt>Folio fiscal (UUID)</dt>
            <dd className="mono">{f.uuid}</dd>
          </div>
        )}
      </dl>
      <Conceptos conceptos={f.conceptos} conClaves />
      <Totales subtotal={f.subtotal} iva={f.iva} total={f.total} />
      <section className="comprobante-sellos">
        <p>
          <strong>No. de certificado del emisor:</strong> <span className="mono">{f.noCertificado ?? 'sin CSD'}</span> · Moneda MXN ·
          Exportación 01 (no aplica)
        </p>
        {f.sello && (
          <p>
            <strong>Sello digital del emisor</strong>
            <span className="mono">{f.sello}</span>
          </p>
        )}
        <p>
          <strong>Cadena original del comprobante</strong>
          <span className="mono">{f.cadenaOriginal}</span>
        </p>
      </section>
      <p className="comprobante-leyenda">
        {timbrada ? 'Este documento es una representación impresa de un CFDI.' : 'Representación de un CFDI generado, sin timbrar.'}
      </p>
    </>
  );
}

// Datos fiscales del cliente. El regimen se filtra por el tipo de RFC (12 = empresa, 13 = persona) y el uso por el regimen.
function FormularioFactura({ referencia, configuracion, inicial, onFactura, onCancelar }) {
  const [datos, setDatos] = useState(inicial ?? VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const persona = datos.rfc.length === 12 ? 'M' : datos.rfc.length === 13 ? 'F' : null;
  const regimenes = configuracion.regimenes.filter((r) => !persona || r.persona.includes(persona));
  const usos = configuracion.usos.filter((u) => !datos.regimenFiscal || u.regimenes.includes(datos.regimenFiscal));

  function cambiar(campo, valor) {
    setDatos((anterior) => {
      const nuevo = { ...anterior, [campo]: valor };
      if (campo === 'rfc' && nuevo.regimenFiscal) {
        const p = valor.length === 12 ? 'M' : valor.length === 13 ? 'F' : null;
        const regimen = configuracion.regimenes.find((r) => r.clave === nuevo.regimenFiscal);
        if (p && !regimen.persona.includes(p)) Object.assign(nuevo, { regimenFiscal: '', usoCfdi: '' });
      }
      if (campo === 'regimenFiscal' && nuevo.usoCfdi && !configuracion.usos.find((u) => u.clave === nuevo.usoCfdi).regimenes.includes(valor)) {
        nuevo.usoCfdi = '';
      }
      return nuevo;
    });
  }

  async function enviar(evento) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const { solicitarFactura } = await graphqlRequest(MUTATION_SOLICITAR_FACTURA, { referencia, datos });
      onFactura(solicitarFactura);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="formulario hoja factura-formulario" onSubmit={enviar}>
      <div>
        <h3>{inicial ? 'Corregir los datos de la factura' : '¿Necesitas factura?'}</h3>
        <p className="apagado" style={{ margin: 0 }}>
          Escribe tus datos exactamente como aparecen en tu Constancia de Situación Fiscal: el SAT los compara.
        </p>
      </div>
      <div className="campos-2">
        <div className="campo">
          <label htmlFor="factura-rfc">RFC</label>
          <input
            id="factura-rfc"
            className="input mono"
            required
            maxLength={13}
            autoComplete="off"
            value={datos.rfc}
            onChange={(e) => cambiar('rfc', e.target.value.toUpperCase().replace(/\s/g, ''))}
          />
        </div>
        <div className="campo">
          <label htmlFor="factura-cp">Código postal del domicilio fiscal</label>
          <input
            id="factura-cp"
            className="input mono"
            required
            inputMode="numeric"
            maxLength={5}
            value={datos.codigoPostal}
            onChange={(e) => cambiar('codigoPostal', e.target.value.replace(/\D/g, '').slice(0, 5))}
          />
        </div>
      </div>
      <div className="campo">
        <label htmlFor="factura-nombre">Nombre o razón social</label>
        <input id="factura-nombre" className="input" required maxLength={254} value={datos.nombre} onChange={(e) => cambiar('nombre', e.target.value)} />
        <span className="apagado">Sin el régimen societario: “EMPRESA EJEMPLO”, no “EMPRESA EJEMPLO S.A. DE C.V.”.</span>
      </div>
      <div className="campos-2">
        <div className="campo">
          <label htmlFor="factura-regimen">Régimen fiscal</label>
          <select id="factura-regimen" className="input" required value={datos.regimenFiscal} onChange={(e) => cambiar('regimenFiscal', e.target.value)}>
            <option value="">Elige…</option>
            {regimenes.map((r) => (
              <option key={r.clave} value={r.clave}>
                {r.clave} · {r.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="factura-uso">Uso del CFDI</label>
          <select id="factura-uso" className="input" required value={datos.usoCfdi} onChange={(e) => cambiar('usoCfdi', e.target.value)}>
            <option value="">Elige…</option>
            {usos.map((u) => (
              <option key={u.clave} value={u.clave}>
                {u.clave} · {u.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="pago-acciones">
        <button className="btn btn-primario" type="submit" disabled={enviando}>
          {enviando && <Loader2 size={18} className="girar" />}
          {inicial ? 'Volver a generar la factura' : 'Generar factura'}
        </button>
        {onCancelar && (
          <button className="btn btn-texto" type="button" onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

// Comprobante de compra de un pedido y, si el cliente la pide, su factura CFDI 4.0. Se llega con la referencia del
// pago (?ref=), igual que a la pagina del pedido: sirve para invitados y para el personal desde el panel.
function ComprobanteView() {
  const { ref: referencia } = leerParametros();
  const { datos, cargando, error } = useGraphQLQuery(QUERY_COMPROBANTE, { referencia }, { skip: !referencia });
  const [nueva, setNueva] = useState(null);
  const [corrigiendo, setCorrigiendo] = useState(false);

  if (cargando) {
    return (
      <div className="contenedor" style={{ maxWidth: 1000 }}>
        <Cargando filas={3} alto={72} />
      </div>
    );
  }
  const pedido = datos?.pedidoPorReferencia;
  if (!pedido) {
    return (
      <div className="contenedor-medio">
        <div className="vacio">
          <h2>No encontramos ese pedido</h2>
          <p className="apagado">{error ?? 'Revisa que el enlace esté completo.'}</p>
          <a className="btn btn-primario" href={rutas.home}>
            Ir al catálogo
          </a>
        </div>
      </div>
    );
  }

  const configuracion = datos.facturacion;
  const factura = nueva ?? datos.facturaPorReferencia;
  const pagado = FACTURABLES.includes(pedido.status);
  const puedeFacturar = pagado && configuracion.disponible && factura?.estado !== 'TIMBRADA';
  const inicialDeFactura = factura && {
    rfc: factura.receptor.rfc,
    nombre: factura.receptor.nombre,
    codigoPostal: factura.receptor.codigoPostal,
    regimenFiscal: factura.receptor.regimenFiscal,
    usoCfdi: factura.usoCfdi,
  };

  return (
    <div className="contenedor comprobante-pagina" style={{ maxWidth: 1000 }}>
      <a className="enlace-volver" href={rutas.pago(referencia)}>
        <ArrowLeft size={18} /> Volver al pedido
      </a>
      <div className="encabezado-pagina">
        <h1>{factura ? 'Tu factura' : 'Tu comprobante'}</h1>
        {pagado && (
          <div className="pago-acciones" style={{ margin: 0 }}>
            <button type="button" className="btn btn-secundario" onClick={() => window.print()}>
              <Printer size={18} /> Imprimir o guardar PDF
            </button>
            {factura && (
              <button type="button" className="btn btn-primario" onClick={() => descargarXml(factura)}>
                <Download size={18} /> Descargar XML
              </button>
            )}
          </div>
        )}
      </div>

      {!pagado ? (
        <p className="hoja">
          {pedido.status === 'CANCELADO'
            ? 'Este pedido se canceló: no tiene comprobante ni factura.'
            : 'El comprobante y la factura estarán disponibles cuando se confirme el pago de tu pedido.'}
        </p>
      ) : (
        <>
          <article className="comprobante-hoja" aria-label={factura ? 'Factura' : 'Comprobante de compra'}>
            {factura ? <FacturaImpresa factura={factura} /> : <ComprobanteDeCompra pedido={pedido} emisor={configuracion.emisor} />}
          </article>

          {nueva && (
            <p className="admin-listo" role="status">
              Factura {nueva.serie}-{nueva.folio} generada. Descarga el XML o guárdala en PDF.
            </p>
          )}

          {puedeFacturar && (!factura || corrigiendo) && (
            <FormularioFactura
              key={factura?.folio ?? 'nueva'}
              referencia={referencia}
              configuracion={configuracion}
              inicial={corrigiendo ? inicialDeFactura : null}
              onCancelar={corrigiendo ? () => setCorrigiendo(false) : null}
              onFactura={(f) => {
                setNueva(f);
                setCorrigiendo(false);
              }}
            />
          )}
          {puedeFacturar && factura && !corrigiendo && (
            <button type="button" className="btn btn-texto comprobante-corregir" onClick={() => setCorrigiendo(true)}>
              ¿Algún dato está mal? Corregir la factura
            </button>
          )}
          {!configuracion.disponible && (
            <p className="apagado comprobante-corregir">
              La tienda todavía no emite facturas en línea. Tu comprobante de compra sirve como nota de venta.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default comoIsla(ComprobanteView);
