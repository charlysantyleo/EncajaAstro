import { useState } from 'react';
import { ArrowUpRight, CircleCheck, CircleAlert, Plus } from './ui/Iconos';
import { enNota, useTienda } from '../store/useTienda';
import { useProducto } from '../hooks/useCatalogo';
import { imagenDe } from '../imagenes';
import { ajusteDe, cubre, describir } from '../lib/compat';
import { useRutas, useT } from '../i18n/react';
import Capa from './ui/Capa';
import { Cantidad, NumeroGiro, Sello } from './ui/Movimiento';
import Precio from './ui/Precio';
import { Cargando, ErrorConReintento } from './EstadoCarga';

// Detalle de la pieza como cajon lateral (patron Drawer de beUI).
export default function ProductoModal() {
  const productoId = useTienda((estado) => estado.productoId);
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const ir = useTienda((estado) => estado.ir);
  const t = useT();
  const rutas = useRutas();

  const { producto, cargando, error, recargar } = useProducto(productoId);
  const imagen = imagenDe(producto);
  const [elegida, setCantidad] = useState(1);
  // Lo que todavia se puede agregar: existencias menos lo que ya esta en la nota.
  const yaEnNota = useTienda(enNota(productoId));
  const caben = Math.max(0, (producto?.stock ?? 0) - yaEnNota);
  const cantidad = Math.min(elegida, Math.max(1, caben));

  const ajusteActivo = ajusteDe(producto, vehiculoActivo);

  function manejarAgregar(evento) {
    evento.preventDefault();
    ir('agregarAlCarrito', { producto, cantidad });
  }

  return (
    <Capa lado="derecha" titulo={producto?.nombre ?? t('ficha.detallePieza')} onCerrar={() => ir('cerrarModal')}>
      {cargando && <Cargando filas={3} alto={56} />}
      {error && <ErrorConReintento mensaje={t('ficha.errorPieza')} onReintentar={recargar} />}

      {producto && (
        <>
          <div className="capa-foto">
            {imagen ? <img src={imagen} alt={producto.nombre} /> : producto.nombre.slice(0, 2).toUpperCase()}
            {ajusteActivo && (
              <Sello
                texto={ajusteActivo.tipo === 'DIRECTO' ? t('comun.embona') : t('comun.equivalente')}
                tono={ajusteActivo.tipo === 'DIRECTO' ? 'amarillo' : 'azul'}
                retraso={0.3}
              />
            )}
          </div>

          <h3>{producto.nombre}</h3>
          <p className="folio apagado" style={{ margin: 0 }}>
            {producto.categoria?.nombre ? `${producto.categoria.nombre} · ` : ''}
            {producto.marca ? `${producto.marca} · ` : ''}{t('ficha.np')} {producto.numeroParte}
          </p>

          {producto.descripcion && <p style={{ margin: 0 }}>{producto.descripcion}</p>}

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <Precio producto={producto} className="capa-precio" />
            <span className={producto.stock > 0 ? 'pieza-existencias' : 'pieza-existencias cero'}>
              <span className="punto" aria-hidden="true" />
              {producto.stock > 0 ? (
                <>
                  <NumeroGiro valor={producto.stock} /> {t('ficha.disponibles')}
                </>
              ) : (
                t('comun.agotado')
              )}
            </span>
          </div>

          {vehiculoActivo && (
            <p
              style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: 0, fontWeight: 600, fontSize: 14 }}
              className={ajusteActivo ? '' : 'error'}
            >
              {ajusteActivo ? <CircleCheck size={18} color="var(--rojo)" style={{ flex: 'none', marginTop: 2 }} /> : <CircleAlert size={18} style={{ flex: 'none', marginTop: 2 }} />}
              <span>
                {ajusteActivo
                  ? t('ficha.embonaEnTu', { auto: `${vehiculoActivo.modelo} ${vehiculoActivo.anio}`, tipo: ajusteActivo.tipo === 'DIRECTO' ? t('ficha.ajusteDirecto') : t('ficha.equivalencia') })
                  : t('ficha.noCompatible', { auto: `${vehiculoActivo.modelo} ${vehiculoActivo.anio}` })}
              </span>
            </p>
          )}

          <div>
            <a className="btn btn-texto" href={rutas.producto(producto)} style={{ alignSelf: 'flex-start' }}>
              {t('comun.verFichaCompleta')} <ArrowUpRight size={16} />
            </a>
            <h4 style={{ marginBottom: 4, marginTop: 8, fontSize: 'var(--t-meta)' }}>{t('comun.compatibleCon')}</h4>
            <ul className="ajustes">
              {producto.compatibilidades.map((compatibilidad, indice) => (
                <li
                  key={indice}
                  className={vehiculoActivo && cubre(compatibilidad, vehiculoActivo) ? 'ajuste mio' : 'ajuste'}
                >
                  <span>{describir(compatibilidad)}</span>
                  <span className={compatibilidad.tipo === 'DIRECTO' ? 'etiqueta sello-azul' : 'etiqueta rojo'}>
                    {compatibilidad.tipo === 'DIRECTO' ? t('comun.directo') : t('comun.equivalencia')}
                  </span>
                  {compatibilidad.nota && <span className="ajuste-nota">{compatibilidad.nota}</span>}
                </li>
              ))}
            </ul>
          </div>

          {yaEnNota > 0 && (
            <p className="apagado" style={{ margin: 'auto 0 0' }}>
              {caben === 0 ? t('ficha.yaTodasExistencias') : t('comun.yaLlevas', { n: yaEnNota })}
            </p>
          )}
          <form className="agregar-fila" onSubmit={manejarAgregar} style={{ marginTop: yaEnNota > 0 ? 0 : 'auto', paddingTop: 12 }}>
            <Cantidad valor={cantidad} min={1} max={Math.max(1, caben)} onCambio={setCantidad} />
            <button className="btn btn-primario btn-isla" type="submit" disabled={caben === 0}>
              {t('comun.agregarANota')}
              <span className="btn-isla-icono" aria-hidden="true">
                <Plus size={16} />
              </span>
            </button>
          </form>
        </>
      )}
    </Capa>
  );
}
