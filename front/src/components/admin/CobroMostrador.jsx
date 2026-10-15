import { useState } from 'react';
import { CircleCheck, Loader2, Search } from '../ui/Iconos';
import { useTienda } from '../../store/useTienda';
import { graphqlRequest } from '../../graphql/client';
import { MUTATION_CONFIRMAR_PAGO_MOSTRADOR, QUERY_PEDIDO_POR_CODIGO } from '../../graphql/queries';
import { pesos } from '../../lib/formato';
import { STATUS_PEDIDO } from '../../lib/pagos';
import { comoIsla } from '../ui/Isla';

// Cobro en mostrador: el comprador dicta su codigo, se revisa el pedido y, ya recibido el dinero,
// se confirma el pago. Isla client:only del panel; el servidor vuelve a exigir el rol ADMIN en cada consulta.
function CobroMostrador() {
  const sesion = useTienda((estado) => estado.sesion);
  const [codigo, setCodigo] = useState('');
  const [pedido, setPedido] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [error, setError] = useState(null);

  if (sesion?.usuario.rol !== 'ADMIN') return null;

  async function buscar(evento) {
    evento.preventDefault();
    setBuscando(true);
    setError(null);
    setAviso(null);
    setPedido(null);
    try {
      const { pedidoPorCodigoDeMostrador } = await graphqlRequest(QUERY_PEDIDO_POR_CODIGO, { codigo });
      if (!pedidoPorCodigoDeMostrador) setError('No hay ningún pedido para pagar en mostrador con ese código.');
      setPedido(pedidoPorCodigoDeMostrador);
    } catch (err) {
      setError(err.message);
    } finally {
      setBuscando(false);
    }
  }

  async function confirmar() {
    setConfirmando(true);
    setError(null);
    try {
      const { confirmarPagoEnMostrador } = await graphqlRequest(MUTATION_CONFIRMAR_PAGO_MOSTRADOR, { codigo: pedido.pago.codigo });
      setPedido(confirmarPagoEnMostrador);
      setAviso(`Pago registrado. El pedido N.º ${confirmarPagoEnMostrador.id} quedó pagado.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmando(false);
    }
  }

  const sePuedeCobrar = pedido && pedido.status === 'PENDIENTE' && pedido.pago.status === 'PENDIENTE';

  return (
    <section className="hoja cobro" aria-labelledby="cobro-titulo">
      <div className="hoja-titulo">
        <h4 id="cobro-titulo">Cobrar en mostrador</h4>
        <span className="apagado">Pedidos con “Pagar al recoger”</span>
      </div>

      <form className="cobro-buscar" onSubmit={buscar}>
        <div className="campo">
          <label htmlFor="cobro-codigo">Código que dicta el comprador</label>
          <input
            id="cobro-codigo"
            className="input mono"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="K7M3-Q9TP"
            maxLength={12}
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value.toUpperCase())}
          />
        </div>
        <button className="btn btn-secundario" type="submit" disabled={buscando}>
          {buscando ? <Loader2 size={18} className="girar" /> : <Search size={18} />} Buscar
        </button>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {pedido && (
        <div className="cobro-pedido" aria-live="polite">
          <dl className="cartel-datos">
            <div>
              <dt>Pedido</dt>
              <dd className="mono">N.º {pedido.id}</dd>
            </div>
            <div>
              <dt>Comprador</dt>
              <dd>{pedido.usuario.nombre}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>{STATUS_PEDIDO[pedido.status]}</dd>
            </div>
            <div>
              <dt>A cobrar</dt>
              <dd className="mono">{pesos(pedido.total)}</dd>
            </div>
          </dl>
          <ul className="nota-lineas cobro-lineas">
            {pedido.detalles.map((detalle) => (
              <li key={detalle.producto.id} className="nota-linea">
                <span className="nota-linea-cant">{detalle.cantidad}×</span>
                <span className="nota-linea-nombre">{detalle.producto.nombre}</span>
                <span className="nota-linea-importe">{pesos(detalle.importe)}</span>
              </li>
            ))}
          </ul>
          {aviso ? (
            <p className="cobro-listo" role="status">
              <CircleCheck size={18} /> {aviso}
            </p>
          ) : sePuedeCobrar ? (
            <button className="btn btn-primario" type="button" onClick={confirmar} disabled={confirmando}>
              {confirmando && <Loader2 size={18} className="girar" />}
              Recibí {pesos(pedido.total)}, confirmar pago
            </button>
          ) : (
            <p className="apagado">Este pedido ya no está pendiente de pago.</p>
          )}
        </div>
      )}
    </section>
  );
}

export default comoIsla(CobroMostrador);
