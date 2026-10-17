import { Fragment, useMemo, useState } from 'react';
import { Loader2 } from '../ui/Iconos';
import { graphqlRequest } from '../../graphql/client';
import { MUTATION_CAMBIAR_STATUS_PEDIDO, QUERY_PEDIDOS_PANEL } from '../../graphql/queries';
import { useGraphQLQuery } from '../../hooks/useGraphQLQuery';
import { pesos } from '../../lib/formato';
import { METODOS, STATUS_PEDIDO } from '../../lib/pagos';
import { direccionEnUnaLinea } from '../../lib/entrega';
import { Cargando, ErrorConReintento } from '../EstadoCarga';
import { comoIsla } from '../ui/Isla';

const FILTROS = [
  ['ATENDER', 'Por atender', (p) => p.status === 'PAGADO' || p.status === 'ENVIADO'],
  ['PENDIENTE', 'Sin pagar', (p) => p.status === 'PENDIENTE'],
  ['ENTREGADO', 'Entregados', (p) => p.status === 'ENTREGADO'],
  ['CANCELADO', 'Cancelados', (p) => p.status === 'CANCELADO'],
  ['TODOS', 'Todos', () => true],
];

// Lo que se puede hacer con cada pedido (el servidor aplica la misma regla).
function acciones(pedido) {
  const aDomicilio = pedido.entrega?.tipo === 'DOMICILIO';
  if (pedido.status === 'PAGADO') return aDomicilio ? ['ENVIADO', 'ENTREGADO'] : ['ENTREGADO'];
  if (pedido.status === 'ENVIADO') return ['ENTREGADO'];
  return [];
}
const ETIQUETA_ACCION = { ENVIADO: 'Marcar enviado', ENTREGADO: 'Marcar entregado' };

// Pedidos de todas las cuentas para el personal: quien compro, como se entrega y como va el pago.
// Desde aqui se marcan como enviados (a domicilio) o entregados.
function PedidosAdmin() {
  const { datos, cargando, error, recargar } = useGraphQLQuery(QUERY_PEDIDOS_PANEL);
  const [cambios, setCambios] = useState({});
  const [filtro, setFiltro] = useState('ATENDER');
  const [abierto, setAbierto] = useState(null);
  const [trabajando, setTrabajando] = useState(null);
  const [aviso, setAviso] = useState(null);

  // Lo que regresa cada cambio de estado reemplaza al pedido de la lista, sin volver a pedirla toda.
  const pedidos = useMemo(() => (datos?.pedidos ?? []).map((pedido) => cambios[pedido.id] ?? pedido), [datos, cambios]);
  const visibles = pedidos.filter(FILTROS.find(([clave]) => clave === filtro)[2]);

  async function cambiarStatus(pedido, status) {
    setTrabajando(`${pedido.id}-${status}`);
    setAviso(null);
    try {
      const { cambiarStatusDePedido } = await graphqlRequest(MUTATION_CAMBIAR_STATUS_PEDIDO, { id: pedido.id, status });
      setCambios((anteriores) => ({ ...anteriores, [pedido.id]: cambiarStatusDePedido }));
      setAviso({ tipo: 'listo', texto: `Pedido N.º ${pedido.id}: ${STATUS_PEDIDO[status].toLowerCase()}.` });
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message });
    } finally {
      setTrabajando(null);
    }
  }

  if (cargando) return <Cargando filas={5} alto={56} />;
  if (error) return <ErrorConReintento mensaje="No se pudieron cargar los pedidos." onReintentar={recargar} />;

  return (
    <section className="hoja admin-seccion" aria-label="Pedidos">
      <div className="hoja-titulo">
        <div className="filtros" style={{ marginBottom: 0 }} role="group" aria-label="Filtrar pedidos">
          {FILTROS.map(([clave, nombre, cumple]) => (
            <button key={clave} type="button" className={filtro === clave ? 'chip activo' : 'chip'} aria-pressed={filtro === clave} onClick={() => setFiltro(clave)}>
              {nombre} <span className="mono">{pedidos.filter(cumple).length}</span>
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-texto btn-chico" onClick={recargar}>
          Actualizar
        </button>
      </div>

      {aviso && (
        <p className={aviso.tipo === 'error' ? 'error' : 'admin-listo'} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
          {aviso.texto}
        </p>
      )}

      {visibles.length === 0 ? (
        <p className="apagado">No hay pedidos en esta lista.</p>
      ) : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Entrega</th>
                <th>Pago</th>
                <th className="num">Total</th>
                <th>Estado</th>
                <th>
                  <span className="solo-lectores">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((pedido) => (
                <Fragment key={pedido.id}>
                  <tr>
                    <td>
                      <button
                        type="button"
                        className="btn-texto tabla-abrir"
                        aria-expanded={abierto === pedido.id}
                        onClick={() => setAbierto((actual) => (actual === pedido.id ? null : pedido.id))}
                      >
                        N.º {pedido.id}
                      </button>
                      <div className="apagado mono">{pedido.fecha}</div>
                    </td>
                    <td>
                      {pedido.usuario.nombre}
                      <div className="apagado">{pedido.usuario.email}</div>
                    </td>
                    <td>
                      {pedido.entrega?.tipo === 'DOMICILIO' ? 'A domicilio' : 'Mostrador'}
                      {pedido.entrega?.direccion && <div className="apagado">{pedido.entrega.direccion.ciudad}</div>}
                    </td>
                    <td>
                      {pedido.pago ? METODOS[pedido.pago.metodo].titulo : '—'}
                      {pedido.pago?.codigo && pedido.pago.metodo === 'PICKUP' && <div className="apagado mono">{pedido.pago.codigo}</div>}
                    </td>
                    <td className="num">{pesos(pedido.total)}</td>
                    <td>
                      <span className={`estado-pedido ${pedido.status.toLowerCase()}`}>{STATUS_PEDIDO[pedido.status]}</span>
                    </td>
                    <td className="tabla-acciones">
                      {acciones(pedido).map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={status === 'ENTREGADO' ? 'btn btn-primario btn-chico' : 'btn btn-secundario btn-chico'}
                          disabled={trabajando !== null}
                          onClick={() => cambiarStatus(pedido, status)}
                        >
                          {trabajando === `${pedido.id}-${status}` && <Loader2 size={14} className="girar" />}
                          {ETIQUETA_ACCION[status]}
                        </button>
                      ))}
                    </td>
                  </tr>
                  {abierto === pedido.id && (
                    <tr className="tabla-detalle">
                      <td colSpan={7}>
                        <div className="detalle-pedido">
                          <ul className="nota-lineas cobro-lineas">
                            {pedido.detalles.map((detalle) => (
                              <li key={detalle.producto.id} className="nota-linea">
                                <span className="nota-linea-cant">{detalle.cantidad}×</span>
                                <span className="nota-linea-nombre">
                                  {detalle.producto.nombre} <span className="apagado mono">{detalle.producto.numeroParte}</span>
                                </span>
                                <span className="nota-linea-importe">{pesos(detalle.importe)}</span>
                              </li>
                            ))}
                            {pedido.entrega?.costo > 0 && (
                              <li className="nota-linea">
                                <span className="nota-linea-cant" />
                                <span className="nota-linea-nombre">Envío</span>
                                <span className="nota-linea-importe">{pesos(pedido.entrega.costo)}</span>
                              </li>
                            )}
                          </ul>
                          <dl className="detalle-datos">
                            <div>
                              <dt>Teléfono</dt>
                              <dd className="mono">{pedido.entrega?.telefono ?? 'Sin dato'}</dd>
                            </div>
                            {pedido.entrega?.direccion && (
                              <div>
                                <dt>Dirección</dt>
                                <dd>
                                  {direccionEnUnaLinea(pedido.entrega.direccion)}
                                  {pedido.entrega.direccion.referencias && <div className="apagado">{pedido.entrega.direccion.referencias}</div>}
                                </dd>
                              </div>
                            )}
                            {pedido.pago && (
                              <div>
                                <dt>Estado del pago</dt>
                                <dd>{pedido.pago.status.toLowerCase()}</dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default comoIsla(PedidosAdmin);
