import { useState } from 'react';
import { useTienda } from '../store/useTienda';
import { useCategorias, useProductos } from '../hooks/useCatalogo';
import { pesos } from '../lib/formato';
import { Cargando, ErrorConReintento } from './EstadoCarga';
import { Interruptor } from './ui/Movimiento';

export default function PiezasCompatibles({ vehiculoId }) {
  const ir = useTienda((estado) => estado.ir);
  const [categoriaId, setCategoriaId] = useState(null);
  const [soloDirectos, setSoloDirectos] = useState(false);

  const { categorias } = useCategorias();
  const { productos, cargando, error, recargar } = useProductos({ vehiculoId, categoriaId, soloDirectos });

  return (
    <section className="hoja">
      <div className="hoja-titulo">
        <h4>Piezas que embonan</h4>
        <Interruptor activo={soloDirectos} onCambio={setSoloDirectos}>
          Solo ajuste directo
        </Interruptor>
      </div>

      <div className="filtros">
        <button className={categoriaId === null ? 'chip activo' : 'chip'} onClick={() => setCategoriaId(null)}>
          Todas
        </button>
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            className={categoriaId === categoria.id ? 'chip activo' : 'chip'}
            onClick={() => setCategoriaId(categoria.id)}
          >
            {categoria.nombre}
          </button>
        ))}
      </div>

      {cargando && <Cargando filas={4} alto={56} />}
      {error && <ErrorConReintento mensaje="No se pudieron cargar las piezas." onReintentar={recargar} />}

      {!cargando && !error && productos.length === 0 && <p className="apagado">No hay piezas que embonen con este filtro.</p>}

      {!cargando && !error && productos.length > 0 && (
        <ul className="lista-piezas">
          {productos.map((producto) => (
            <li key={producto.id}>
              <button className="pieza-fila" onClick={() => ir('verProducto', { productoId: producto.id })}>
                <span className="pieza-fila-nombre">{producto.nombre}</span>
                <span className="pieza-fila-meta">
                  {producto.categoria?.nombre} · {producto.numeroParte}
                </span>
                <span className="pieza-fila-precio">{pesos(producto.precio)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
