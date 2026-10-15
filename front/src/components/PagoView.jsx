import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, Copy, ExternalLink, Loader2, NotebookPen, RotateCw } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { graphqlRequest } from '../graphql/client';
import { MUTATION_VERIFICAR_PAGO, QUERY_PEDIDO_POR_REFERENCIA } from '../graphql/queries';
import { leerParametros, rutas } from '../lib/rutas';
import { fechaHora, pesos } from '../lib/formato';
import { METODOS, PROVEEDORES, STATUS_PEDIDO } from '../lib/pagos';
import { ENTREGAS, direccionEnUnaLinea } from '../lib/entrega';
import { Cargando } from './EstadoCarga';
import { Sello } from './ui/Movimiento';
import { comoIsla } from './ui/Isla';

function BotonCopiar({ texto, children }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el texto sigue en pantalla para copiarlo a mano.
    }
  }

  return (
    <button type="button" className="btn btn-secundario" onClick={copiar}>
      {copiado ? <Check size={18} /> : <Copy size={18} />}
      <span aria-live="polite">{copiado ? 'Copiado' : children}</span>
    </button>
  );
}

// Que hacer para pagar, segun el metodo elegido.
function Instrucciones({ pedido }) {
  const { pago } = pedido;
  const vence = pago.vence ? fechaHora(pago.vence) : null;

  if (pago.metodo === 'PICKUP') {
    return (
      <>
        <h3>Paga {pesos(pago.monto)} al recoger</h3>
        <p>Tus piezas quedaron apartadas. Cuando pases por ellas, dicta o muestra este código en mostrador para pagar.</p>
        {pago.codigo ? (
          <>
            <dl className="pago-dato">
              <dt>Código para pagar en mostrador</dt>
              <dd className="pago-codigo">{pago.codigo}</dd>
            </dl>
            <div className="pago-acciones">
              <BotonCopiar texto={pago.codigo}>Copiar código</BotonCopiar>
            </div>
          </>
        ) : (
          // Pedidos anteriores a los codigos: se identifican con su numero.
          <p>
            Da tu número de pedido: <strong className="mono">{pedido.id}</strong>.
          </p>
        )}
        <p className="apagado">En cuanto paguemos en mostrador, esta página muestra tu pedido como pagado.</p>
      </>
    );
  }

  if (pago.metodo === 'TIENDA') {
    return (
      <>
        <h3>Paga {pesos(pago.monto)} en efectivo</h3>
        <p>Dicta o muestra esta referencia en la caja. Tu pedido se confirma en cuanto la tienda nos avisa del pago.</p>
        {pago.codigo && (
          <dl className="pago-dato">
            <dt>Referencia</dt>
            <dd className="pago-codigo">{pago.codigo}</dd>
          </dl>
        )}
        {vence && <p className="apagado">Vence el {vence}. Después de esa fecha el pedido se cancela y las piezas se liberan.</p>}
        <div className="pago-acciones">
          {pago.url && (
            <a className="btn btn-primario" href={pago.url} target="_blank" rel="noopener noreferrer">
              Ver ficha de pago <ExternalLink size={18} />
            </a>
          )}
          {pago.codigo && <BotonCopiar texto={pago.codigo}>Copiar referencia</BotonCopiar>}
        </div>
      </>
    );
  }

  if (pago.metodo === 'LINK') {
    return (
      <>
        <h3>Tu link de pago</h3>
        <p>
          Ábrelo para pagar {pesos(pago.monto)} con {PROVEEDORES[pago.proveedor]}, o compártelo con quien vaya a pagar.
        </p>
        <input className="input mono" readOnly value={pago.url ?? ''} aria-label="Link de pago" onFocus={(evento) => evento.target.select()} />
        {vence && <p className="apagado">Vence el {vence}. Después de esa fecha el pedido se cancela y las piezas se liberan.</p>}
        <div className="pago-acciones">
          <a className="btn btn-primario" href={pago.url} rel="noopener noreferrer">
            Pagar ahora <ExternalLink size={18} />
          </a>
          <BotonCopiar texto={pago.url}>Copiar link</BotonCopiar>
        </div>
      </>
    );
  }

  return (
    <>
      <h3>Tu pago está en revisión</h3>
      <p>{pago.detalle ?? 'Estamos esperando la confirmación del banco.'} No necesitas volver a pagar.</p>
    </>
  );
}

// Pagina a la que llega el comprador despues de confirmar, y a la que regresan Mercado Pago y PayPal.
// La referencia de la URL es la llave: sirve igual con cuenta que como invitado.
function PagoView() {
  const { ref: referencia } = leerParametros();
  const ir = useTienda((estado) => estado.ir);
  const refrescarConfirmado = useTienda((estado) => estado.refrescarPedidoConfirmado);

  const [pedido, setPedido] = useState(null);
  const [cargando, setCargando] = useState(Boolean(referencia));
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState(null);

  const recibir = useCallback(
    (nuevo) => {
      setPedido(nuevo);
      refrescarConfirmado(nuevo);
    },
    [refrescarConfirmado]
  );

  // Pregunta a la pasarela como va el cobro. Es lo que confirma el pago al volver de Mercado Pago o PayPal.
  const verificar = useCallback(async () => {
    setVerificando(true);
    setError(null);
    try {
      recibir((await graphqlRequest(MUTATION_VERIFICAR_PAGO, { referencia })).verificarPago);
    } catch (err) {
      setError(err.message);
    } finally {
      setVerificando(false);
    }
  }, [referencia, recibir]);

  useEffect(() => {
    if (!referencia) return;
    // Las pasarelas regresan con sus propios parametros (payment_id, token...): se deja solo la referencia.
    window.history.replaceState(null, '', rutas.pago(referencia));

    graphqlRequest(QUERY_PEDIDO_POR_REFERENCIA, { referencia })
      .then(({ pedidoPorReferencia: encontrado }) => {
        if (!encontrado) return;
        recibir(encontrado);
        if (encontrado.pago.status === 'PENDIENTE' && encontrado.pago.proveedor) verificar();
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, [referencia, recibir, verificar]);

  if (cargando) {
    return (
      <div className="contenedor" style={{ maxWidth: 1180 }}>
        <Cargando filas={3} alto={72} />
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="contenedor-medio">
        <div className="vacio">
          <h2>No encontramos ese pedido</h2>
          <p className="apagado">{error ?? 'Revisa que el link esté completo. Si acabas de comprar, vuelve a abrirlo desde tu confirmación.'}</p>
          <a className="btn btn-primario" href={rutas.home}>
            Ir al catálogo
          </a>
        </div>
      </div>
    );
  }

  const { pago } = pedido;
  const pagado = pago.status === 'APROBADO';
  const cancelado = pedido.status === 'CANCELADO';
  const pendiente = !pagado && !cancelado;

  return (
    <div className="contenedor" style={{ maxWidth: 1180 }}>
      <a className="enlace-volver" href={rutas.home}>
        <ArrowLeft size={18} /> Seguir comprando
      </a>

      <div className="encabezado-pagina">
        <h1>
          Pedido N.º <span className="mono">{pedido.id}</span>
        </h1>
        <Sello texto={STATUS_PEDIDO[pedido.status]} enLinea tono={cancelado ? 'rojo' : pagado ? 'verde' : 'azul'} />
      </div>

      <div className="carrito">
        <section className="hoja pago" aria-live="polite">
          {pagado && (
            <>
              <h3>Pago recibido</h3>
              <p>
                Recibimos {pesos(pago.monto)}{' '}
                {pago.metodo === 'PICKUP' ? 'en mostrador' : `con ${METODOS[pago.metodo].titulo.toLowerCase()}`}. Tu pedido quedó
                confirmado.
              </p>
            </>
          )}

          {cancelado && (
            <>
              <h3>Este pedido se canceló</h3>
              <p>{pago.detalle ?? 'No se completó el pago.'} Las piezas volvieron al inventario.</p>
              <div className="pago-acciones">
                <a className="btn btn-primario" href={rutas.home}>
                  Volver al catálogo
                </a>
              </div>
            </>
          )}

          {pendiente && <Instrucciones pedido={pedido} />}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          {(pendiente || pagado) && (
            <div className="pago-acciones">
              {pendiente && pago.proveedor && (
                <button type="button" className="btn btn-secundario" onClick={verificar} disabled={verificando}>
                  {verificando ? <Loader2 size={18} className="girar" /> : <RotateCw size={18} />}
                  {verificando ? 'Consultando el pago…' : 'Ya pagué, verificar'}
                </button>
              )}
              {pedido.vehiculo && (
                <button type="button" className="btn btn-texto" onClick={() => ir('abrirMantenimiento')}>
                  <NotebookPen size={16} /> Anotar en la bitácora
                </button>
              )}
            </div>
          )}
        </section>

        <aside className="nota" aria-label="Resumen del pedido">
          <div className="nota-cab">
            <h4>Resumen</h4>
            <span className="folio apagado">{pedido.fecha}</span>
          </div>
          <ul className="nota-lineas">
            {pedido.detalles.map((detalle) => (
              <li key={detalle.producto.id} className="nota-linea">
                <span className="nota-linea-cant">{detalle.cantidad}×</span>
                <span className="nota-linea-nombre">{detalle.producto.nombre}</span>
                <span className="nota-linea-importe">{pesos(detalle.importe)}</span>
              </li>
            ))}
          </ul>
          {pedido.entrega?.tipo === 'DOMICILIO' && (
            <div className="nota-cargo">
              <span>Envío</span>
              <span>{pedido.entrega.costo > 0 ? pesos(pedido.entrega.costo) : 'Gratis'}</span>
            </div>
          )}
          <div className="nota-total">
            <span>Total</span>
            <strong>{pesos(pedido.total)}</strong>
          </div>
          <p className="apagado" style={{ marginTop: 12 }}>
            {METODOS[pago.metodo].titulo}
            {pago.proveedor ? ` · ${PROVEEDORES[pago.proveedor]}` : ''}
          </p>

          {pedido.entrega && (
            <div className="nota-entrega">
              <h5>Entrega</h5>
              <p>{ENTREGAS[pedido.entrega.tipo].titulo}</p>
              {pedido.entrega.direccion && (
                <>
                  <p className="apagado">{direccionEnUnaLinea(pedido.entrega.direccion)}</p>
                  {pedido.entrega.direccion.referencias && <p className="apagado">{pedido.entrega.direccion.referencias}</p>}
                </>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default comoIsla(PagoView);
