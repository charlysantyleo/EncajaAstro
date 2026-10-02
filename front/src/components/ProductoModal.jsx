import { useState } from 'react';
import { CircleCheck, CircleAlert, Plus } from 'lucide-react';
import { useTienda } from '../store/useTienda';
import { useProducto } from '../hooks/useCatalogo';
import { imagenDe } from '../imagenes';
import { pesos } from '../lib/formato';
import Capa from './ui/Capa';
import { Cantidad, NumeroGiro, Sello } from './ui/Movimiento';
import { Cargando, ErrorConReintento } from './EstadoCarga';

// Detalle de la pieza como cajon lateral (patron Drawer de beUI).
export default function ProductoModal() {
  const productoId = useTienda((estado) => estado.productoId);
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const ir = useTienda((estado) => estado.ir);

  const { producto, cargando, error, recargar } = useProducto(productoId);
  const imagen = imagenDe(producto);
  const [cantidad, setCantidad] = useState(1);

  const ajusteActivo = producto?.compatibilidades.find(
    (compatibilidad) => compatibilidad.vehiculo.id === vehiculoActivo?.id
  );

  function manejarAgregar(evento) {
    evento.preventDefault();
    ir('agregarAlCarrito', { producto, cantidad });
  }

  return (
    <Capa lado="derecha" titulo={producto?.nombre ?? 'Detalle de la pieza'} onCerrar={() => ir('cerrarModal')}>
      {cargando && <Cargando filas={3} alto={56} />}
      {error && <ErrorConReintento mensaje="No se pudo cargar la pieza." onReintentar={recargar} />}

      {producto && (
        <>
          <div className="capa-foto">
            {imagen ? <img src={imagen} alt={producto.nombre} /> : producto.nombre.slice(0, 2).toUpperCase()}
            {ajusteActivo && (
              <Sello
                texto={ajusteActivo.tipo === 'DIRECTO' ? 'Embona' : 'Equivalente'}
                tono={ajusteActivo.tipo === 'DIRECTO' ? 'amarillo' : 'azul'}
                retraso={0.3}
              />
            )}
          </div>

          <h3>{producto.nombre}</h3>
          <p className="folio apagado" style={{ margin: 0 }}>
            {producto.categoria?.nombre ? `${producto.categoria.nombre} · ` : ''}
            {producto.marca ? `${producto.marca} · ` : ''}N.P. {producto.numeroParte}
          </p>

          {producto.descripcion && <p style={{ margin: 0 }}>{producto.descripcion}</p>}

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
            <span className="capa-precio">{pesos(producto.precio)}</span>
            <span className={producto.stock > 0 ? 'pieza-existencias' : 'pieza-existencias cero'}>
              <span className="punto" aria-hidden="true" />
              {producto.stock > 0 ? (
                <>
                  <NumeroGiro valor={producto.stock} /> disponibles
                </>
              ) : (
                'Agotado'
              )}
            </span>
          </div>

          {vehiculoActivo && (
            <p
              style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: 0, fontWeight: 600, fontSize: 14 }}
              className={ajusteActivo ? '' : 'error'}
            >
              {ajusteActivo ? <CircleCheck size={18} color="var(--azul)" style={{ flex: 'none', marginTop: 2 }} /> : <CircleAlert size={18} style={{ flex: 'none', marginTop: 2 }} />}
              <span>
                {ajusteActivo
                  ? `Embona en tu ${vehiculoActivo.modelo} ${vehiculoActivo.anio} (${ajusteActivo.tipo === 'DIRECTO' ? 'ajuste directo' : 'equivalencia'})`
                  : `No está registrada como compatible con tu ${vehiculoActivo.modelo} ${vehiculoActivo.anio}.`}
              </span>
            </p>
          )}

          <div>
            <h5 style={{ marginBottom: 4, marginTop: 8 }}>Compatible con</h5>
            <ul className="ajustes">
              {producto.compatibilidades.map((compatibilidad, indice) => (
                <li
                  key={indice}
                  className={compatibilidad.vehiculo.id === vehiculoActivo?.id ? 'ajuste mio' : 'ajuste'}
                >
                  <span>
                    {compatibilidad.vehiculo.marca} {compatibilidad.vehiculo.modelo} {compatibilidad.vehiculo.anio}
                    {compatibilidad.vehiculo.motor ? ` (${compatibilidad.vehiculo.motor})` : ''}
                  </span>
                  <span className={compatibilidad.tipo === 'DIRECTO' ? 'etiqueta sello-azul' : 'etiqueta rojo'}>
                    {compatibilidad.tipo === 'DIRECTO' ? 'Directo' : 'Equivalencia'}
                  </span>
                  {compatibilidad.nota && <span className="ajuste-nota">{compatibilidad.nota}</span>}
                </li>
              ))}
            </ul>
          </div>

          <form className="agregar-fila" onSubmit={manejarAgregar} style={{ marginTop: 'auto', paddingTop: 12 }}>
            <Cantidad valor={cantidad} min={1} max={Math.max(1, producto.stock)} onCambio={setCantidad} />
            <button className="btn btn-primario btn-isla" type="submit" disabled={producto.stock === 0}>
              Agregar a la nota
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
