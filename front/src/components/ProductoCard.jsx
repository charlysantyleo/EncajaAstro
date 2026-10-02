import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Plus } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { useProducto } from '../hooks/useCatalogo';
import { imagenDe } from '../imagenes';
import { ajusteDe } from '../lib/compat';
import { pesos } from '../lib/formato';
import { Cantidad, NumeroGiro, Sello, useCambio } from './ui/Movimiento';

const SALIDA = [0.23, 1, 0.32, 1];

// Un renglon del indice. Al abrirlo se despliega en su lugar como ficha tecnica de la pieza.
export default function ProductoCard({ producto, indice = 0, abierta = false, onAlternar }) {
  const ir = useTienda((estado) => estado.ir);
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const reducido = useReducedMotion();
  const imagen = imagenDe(producto);
  const ajuste = ajusteDe(producto, vehiculoActivo?.id);
  const agotada = producto.stock <= 0;
  const [cambio, visto] = useCambio(producto.stock);
  const idFicha = `ficha-${producto.id}`;

  return (
    <motion.li
      className={['renglon', agotada ? 'agotada' : '', abierta ? 'abierta' : ''].filter(Boolean).join(' ')}
      initial={reducido ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: SALIDA, delay: Math.min(indice, 12) * 0.03 }}
      onMouseEnter={cambio ? visto : undefined}
      onFocus={cambio ? visto : undefined}
    >
      <div className="renglon-fila">
        <button
          type="button"
          className="renglon-abrir"
          aria-expanded={abierta}
          aria-controls={idFicha}
          onClick={onAlternar}
        >
          <span className="col-foto renglon-foto">
            {imagen ? <img src={imagen} alt="" loading="lazy" width="96" height="72" /> : null}
          </span>
          <span className="col-np renglon-np">{producto.numeroParte}</span>
          <span className="col-nombre renglon-nombre">
            <span className="renglon-titulo">{producto.nombre}</span>
            {producto.marca && <span className="renglon-marca">{producto.marca}</span>}
          </span>
          <span className="col-ajuste">
            {agotada ? (
              <Sello texto="Agotado" tono="rojo" />
            ) : ajuste ? (
              <Sello
                texto={ajuste.tipo === 'DIRECTO' ? 'Embona' : 'Equivalente'}
                tono={ajuste.tipo === 'DIRECTO' ? 'amarillo' : 'azul'}
                retraso={0.15 + Math.min(indice, 12) * 0.03}
              />
            ) : vehiculoActivo ? (
              <span className="renglon-sin-ajuste">Sin registro</span>
            ) : null}
          </span>
          <span className={['col-stock', 'renglon-stock', agotada ? 'cero' : '', cambio ? 'cambio' : ''].filter(Boolean).join(' ')}>
            <NumeroGiro valor={producto.stock} />
            <span className="renglon-stock-txt"> {agotada ? 'sin existencias' : 'en stock'}</span>
          </span>
          <span className="col-precio renglon-precio">{pesos(producto.precio)}</span>
        </button>
        <button
          type="button"
          className="col-accion renglon-agregar"
          disabled={agotada}
          aria-label={`Agregar ${producto.nombre} a la nota`}
          title="Agregar a la nota"
          onClick={() => ir('agregarAlCarrito', { producto, cantidad: 1 })}
        >
          <Plus size={20} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div
            id={idFicha}
            className="ficha-contenedor"
            initial={reducido ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reducido ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reducido ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.77, 0, 0.175, 1] }}
          >
            <Ficha productoId={producto.id} imagen={imagen} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

// Ficha tecnica dentro del renglon: descripcion, en que vehiculos entra y cuantas agregar.
function Ficha({ productoId, imagen }) {
  const ir = useTienda((estado) => estado.ir);
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const { producto, cargando, error } = useProducto(productoId);
  const [cantidad, setCantidad] = useState(1);

  return (
    <div className="ficha">
      <div className="ficha-foto">{imagen && <img src={imagen} alt={producto?.nombre ?? ''} />}</div>

      <div className="ficha-cuerpo">
        {cargando && <p className="apagado">Cargando ficha…</p>}
        {error && <p className="error">No se pudo cargar la ficha.</p>}
        {producto && (
          <>
            <dl className="ficha-datos">
              <div>
                <dt>N.º de parte</dt>
                <dd className="mono">{producto.numeroParte}</dd>
              </div>
              {producto.marca && (
                <div>
                  <dt>Marca</dt>
                  <dd>{producto.marca}</dd>
                </div>
              )}
              {producto.categoria?.nombre && (
                <div>
                  <dt>Sistema</dt>
                  <dd>{producto.categoria.nombre}</dd>
                </div>
              )}
            </dl>

            {producto.descripcion && <p className="ficha-descripcion">{producto.descripcion}</p>}

            <div className="ficha-compat">
              <h5>Compatible con</h5>
              <ul>
                {producto.compatibilidades.map((compatibilidad, i) => {
                  const mio = compatibilidad.vehiculo.id === vehiculoActivo?.id;
                  return (
                    <li key={i} className={mio ? 'mio' : undefined}>
                      <span>
                        {compatibilidad.vehiculo.marca} {compatibilidad.vehiculo.modelo} {compatibilidad.vehiculo.anio}
                        {compatibilidad.vehiculo.motor ? ` · ${compatibilidad.vehiculo.motor}` : ''}
                      </span>
                      <span className="ficha-tipo">{compatibilidad.tipo === 'DIRECTO' ? 'Directo' : 'Equivalencia'}</span>
                      {compatibilidad.nota && <span className="ficha-nota">{compatibilidad.nota}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>

            <form
              className="ficha-comprar"
              onSubmit={(evento) => {
                evento.preventDefault();
                ir('agregarAlCarrito', { producto, cantidad });
              }}
            >
              <Cantidad valor={cantidad} min={1} max={Math.max(1, producto.stock)} onCambio={setCantidad} />
              <button className="btn btn-primario" type="submit" disabled={producto.stock === 0}>
                Agregar a la nota · {pesos(producto.precio * cantidad)}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
