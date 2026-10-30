import { useCallback, useEffect, useRef, useState } from 'react';
import { graphqlRequest } from '../../graphql/client';
import { QUERY_TABLERO, SUSCRIPCION_ACTIVIDAD, SUSCRIPCION_PEDIDOS, SUSCRIPCION_STOCK_PANEL } from '../../graphql/queries';
import { useSuscripcion } from '../../hooks/useSuscripcion';
import { pesos } from '../../lib/formato';
import { rutas } from '../../lib/rutas';
import { STATUS_PEDIDO } from '../../lib/pagos';
import { ErrorConReintento } from '../EstadoCarga';
import Skeleton from '../Skeleton';
import { comoIsla } from '../ui/Isla';
import EnVivo from './EnVivo';
import Grafica, { BarrasHorizontales, Columnas, GraficaLinea } from './Grafica';

const PERIODOS = [7, 30, 90];
// Varios avisos seguidos (una compra mueve el stock de varias piezas) se juntan en una sola recarga.
const ESPERA_PARA_RECARGAR = 800;
const EVENTOS_EN_VIVO = 8;

const numero = new Intl.NumberFormat('es-MX');
const enteros = (n) => numero.format(n);
const diaCorto = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const diaLargo = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const hora = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const fechaDe = (dia, largo = false) => (largo ? diaLargo : diaCorto).format(new Date(`${dia}T12:00:00Z`));
const estado = (clave) => (clave === 'PENDIENTE' ? 'Sin pagar' : STATUS_PEDIDO[clave] ?? clave);

const sinDatos = (puntos) => puntos.every((p) => p.valor === 0);
const tablaDe = (puntos, columnas, formato, etiqueta = (e) => e) => ({
  columnas,
  filas: puntos.map((p) => [etiqueta(p.etiqueta), formato(p.valor)]),
});

// Tablero del panel (solo ADMIN): ventas de PostgreSQL y actividad de MongoDB. Se actualiza solo: escucha los
// pedidos, las existencias y la actividad por WebSocket y vuelve a pedir los numeros cuando algo cambia.
function TableroAdmin() {
  const [dias, setDias] = useState(30);
  const [tablero, setTablero] = useState(null);
  const [errorActividad, setErrorActividad] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [recientes, setRecientes] = useState([]);
  const pendiente = useRef(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { datos, errores } = await graphqlRequest(QUERY_TABLERO, { dias }, { parcial: true });
      setTablero(datos.tablero);
      setErrorActividad(errores.find((e) => e.path?.includes('actividad'))?.message ?? null);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [dias]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const recargarPronto = useCallback(() => {
    clearTimeout(pendiente.current);
    pendiente.current = setTimeout(cargar, ESPERA_PARA_RECARGAR);
  }, [cargar]);
  useEffect(() => () => clearTimeout(pendiente.current), []);

  const conexion = useSuscripcion(SUSCRIPCION_PEDIDOS, recargarPronto);
  useSuscripcion(SUSCRIPCION_STOCK_PANEL, recargarPronto);
  useSuscripcion(SUSCRIPCION_ACTIVIDAD, (datos) => {
    setRecientes((anteriores) => [datos.actividadRegistrada, ...anteriores].slice(0, EVENTOS_EN_VIVO));
    recargarPronto();
  });

  if (!tablero) {
    if (error) return <ErrorConReintento mensaje="No se pudo cargar el tablero." onReintentar={cargar} />;
    return (
      <div className="tablero">
        <Skeleton height={96} />
        <Skeleton height={280} />
      </div>
    );
  }

  const t = tablero;
  const a = t.actividad;
  const unidades = (n) => `${enteros(n)} ${n === 1 ? 'pieza' : 'piezas'}`;
  const veces = (n) => `${enteros(n)} ${n === 1 ? 'vez' : 'veces'}`;

  return (
    // Al cambiar de periodo se queda lo anterior, atenuado, mientras llegan los numeros: sin saltos ni esqueletos.
    // Las recargas en vivo no atenuan nada, para que el tablero no parpadee con cada venta.
    <div className={cargando && t.dias !== dias ? 'tablero recargando' : 'tablero'} aria-busy={cargando}>
      <div className="tablero-filtros">
        <div className="filtros" style={{ marginBottom: 0 }} role="group" aria-label="Periodo">
          {PERIODOS.map((n) => (
            <button key={n} type="button" className={dias === n ? 'chip activo' : 'chip'} aria-pressed={dias === n} onClick={() => setDias(n)}>
              Últimos {n} días
            </button>
          ))}
        </div>
        <EnVivo estado={conexion} />
      </div>
      {error && <p className="error">No se pudieron actualizar los números: {error}</p>}

      <section aria-labelledby="tablero-ventas">
        <div className="encabezado-pagina">
          <h4 id="tablero-ventas">Ventas</h4>
          <span className="apagado">Desde el {fechaDe(t.desde, true)}</span>
        </div>
        <dl className="indicadores">
          <div className="indicador">
            <dt>Ventas</dt>
            <dd>{pesos(t.ventas)}</dd>
            <span className="indicador-nota">Pedidos pagados, enviados o entregados</span>
          </div>
          <div className="indicador">
            <dt>Pedidos pagados</dt>
            <dd>{enteros(t.pedidosPagados)}</dd>
            <span className="indicador-nota">En el periodo</span>
          </div>
          <div className="indicador">
            <dt>Ticket promedio</dt>
            <dd>{pesos(t.ticketPromedio)}</dd>
            <span className="indicador-nota">Venta entre pedidos pagados</span>
          </div>
          <div className="indicador">
            <dt>Piezas por agotarse</dt>
            <dd>{enteros(t.piezasPorAgotarse)}</dd>
            <a className="indicador-nota" href={rutas.adminProductos}>
              Con {t.pocasExistencias} o menos en existencia
            </a>
          </div>
        </dl>

        <div className="graficas">
          <Grafica
            titulo="Ventas por día"
            descripcion="Importe de los pedidos pagados"
            ancho="ancha"
            vacia={sinDatos(t.ventasPorDia)}
            tabla={tablaDe(t.ventasPorDia, ['Día', 'Ventas'], pesos, (d) => fechaDe(d))}
          >
            <GraficaLinea puntos={t.ventasPorDia} formato={pesos} formatoEtiqueta={fechaDe} nombre="Ventas por día" />
          </Grafica>
          <Grafica
            titulo="Pedidos por estado"
            descripcion="Pedidos hechos en el periodo"
            ancho="angosta"
            vacia={sinDatos(t.pedidosPorEstado)}
            tabla={tablaDe(t.pedidosPorEstado, ['Estado', 'Pedidos'], enteros, estado)}
          >
            <Columnas puntos={t.pedidosPorEstado} formato={enteros} etiqueta={estado} />
          </Grafica>
          <Grafica
            titulo="Formas de pago"
            descripcion="Pedidos pagados por método"
            ancho="angosta"
            vacia={sinDatos(t.formasDePago)}
            tabla={tablaDe(t.formasDePago, ['Método', 'Pedidos'], enteros)}
          >
            <BarrasHorizontales puntos={t.formasDePago} formato={enteros} />
          </Grafica>
          <Grafica
            titulo="Piezas más vendidas"
            descripcion="Unidades en pedidos pagados"
            ancho="ancha"
            vacia={sinDatos(t.piezasMasVendidas)}
            tabla={tablaDe(t.piezasMasVendidas, ['Pieza', 'Unidades'], enteros)}
          >
            <BarrasHorizontales puntos={t.piezasMasVendidas} formato={unidades} />
          </Grafica>
        </div>
      </section>

      <section aria-labelledby="tablero-actividad" className="tablero-actividad">
        <div className="encabezado-pagina">
          <h4 id="tablero-actividad">Actividad de la tienda</h4>
          <span className="etiqueta">MongoDB</span>
        </div>

        {errorActividad ? (
          <p className="error">No se pudo leer la actividad de MongoDB: {errorActividad}</p>
        ) : !a?.disponible ? (
          <p className="aviso-panel">
            La actividad no se está guardando: falta configurar <code>MONGODB_URI</code> en el servidor. Las ventas de arriba
            sí están al día.
          </p>
        ) : (
          <div className="graficas">
            <Grafica
              titulo="Del interés a la compra"
              descripcion="Búsquedas, piezas abiertas, agregadas a la nota y pedidos"
              ancho="angosta"
              vacia={sinDatos(a.embudo)}
              tabla={tablaDe(a.embudo, ['Paso', 'Veces'], enteros)}
            >
              <BarrasHorizontales puntos={a.embudo} formato={enteros} />
            </Grafica>
            <Grafica
              titulo="Actividad por día"
              descripcion="Todo lo que hicieron los visitantes"
              ancho="ancha"
              vacia={sinDatos(a.actividadPorDia)}
              tabla={tablaDe(a.actividadPorDia, ['Día', 'Eventos'], enteros, (d) => fechaDe(d))}
            >
              <GraficaLinea puntos={a.actividadPorDia} formato={(n) => `${enteros(n)} eventos`} formatoEtiqueta={fechaDe} enteros nombre="Actividad por día" />
            </Grafica>
            <Grafica titulo="Lo más buscado" vacia={!a.masBuscado.length} tabla={tablaDe(a.masBuscado, ['Búsqueda', 'Veces'], enteros)}>
              <BarrasHorizontales puntos={a.masBuscado} formato={veces} />
            </Grafica>
            <Grafica
              titulo="Búsquedas sin resultados"
              descripcion="Piezas que te piden y no tienes (o que están escritas distinto)"
              vacia={!a.busquedasSinResultados.length}
              tabla={tablaDe(a.busquedasSinResultados, ['Búsqueda', 'Veces'], enteros)}
            >
              <BarrasHorizontales puntos={a.busquedasSinResultados} formato={veces} />
            </Grafica>
            <Grafica
              titulo="Vehículos de los clientes"
              descripcion="Agregados al garage: qué compatibilidades registrar primero"
              vacia={!a.vehiculosMasComunes.length}
              tabla={tablaDe(a.vehiculosMasComunes, ['Vehículo', 'Garages'], enteros)}
            >
              <BarrasHorizontales puntos={a.vehiculosMasComunes} formato={enteros} />
            </Grafica>
            <Grafica titulo="Piezas más vistas" vacia={!a.piezasMasVistas.length} tabla={tablaDe(a.piezasMasVistas, ['Pieza', 'Veces'], enteros)}>
              <BarrasHorizontales puntos={a.piezasMasVistas} formato={veces} />
            </Grafica>
            <figure className="grafica ancha">
              <figcaption>
                <h4>Actividad en vivo</h4>
                <p className="apagado">Lo último que pasó en la tienda, conforme sucede</p>
              </figcaption>
              {recientes.length === 0 ? (
                <p className="apagado en-vivo-vacio">Esperando actividad…</p>
              ) : (
                <ol className="en-vivo-lista" aria-live="polite">
                  {recientes.map((evento) => (
                    <li key={`${evento.fecha}-${evento.descripcion}`}>
                      <time className="mono" dateTime={evento.fecha}>
                        {hora.format(new Date(evento.fecha))}
                      </time>
                      <span>{evento.descripcion}</span>
                    </li>
                  ))}
                </ol>
              )}
            </figure>
          </div>
        )}
      </section>
    </div>
  );
}

export default comoIsla(TableroAdmin);
