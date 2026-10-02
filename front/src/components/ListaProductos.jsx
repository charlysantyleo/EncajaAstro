import { useMemo, useState } from 'react';
import { useTienda } from '../store/useTienda';
import ProductoCard from './ProductoCard';
import { Interruptor } from './ui/Movimiento';
import { Cargando, ErrorConReintento } from './EstadoCarga';

const ORDENES = {
  relevancia: { etiqueta: 'Relevancia', fn: null },
  precioAsc: { etiqueta: 'Precio: menor a mayor', fn: (a, b) => a.precio - b.precio },
  precioDesc: { etiqueta: 'Precio: mayor a menor', fn: (a, b) => b.precio - a.precio },
  nombre: { etiqueta: 'Nombre A–Z', fn: (a, b) => a.nombre.localeCompare(b.nombre, 'es') },
  existencias: { etiqueta: 'Más existencias', fn: (a, b) => b.stock - a.stock },
};

// Barra de herramientas + rejilla. Orden y "solo con existencias" son del lado del cliente;
// "solo ajuste directo" sigue viajando al backend desde el store.
export default function ListaProductos({ productos, cargando, error, recargar, vacio, esqueletos = 8 }) {
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const soloDirectos = useTienda((estado) => estado.soloDirectos);
  const ir = useTienda((estado) => estado.ir);

  const [orden, setOrden] = useState('relevancia');
  const [soloStock, setSoloStock] = useState(false);

  const visibles = useMemo(() => {
    const lista = soloStock ? productos.filter((p) => p.stock > 0) : [...productos];
    const fn = ORDENES[orden].fn;
    return fn ? lista.sort(fn) : lista;
  }, [productos, orden, soloStock]);

  return (
    <section className="catalogo-col" aria-live="polite">
      <div className="herramientas">
        <div className="herramientas-grupo">
          <span className="conteo">
            {cargando ? '…' : `${visibles.length} ${visibles.length === 1 ? 'pieza' : 'piezas'}`}
          </span>
          {vehiculoActivo && (
            <Interruptor activo={soloDirectos} onCambio={() => ir('alternarDirectos')}>
              Solo ajuste directo
            </Interruptor>
          )}
          <Interruptor activo={soloStock} onCambio={setSoloStock}>
            Solo con existencias
          </Interruptor>
        </div>
        <div className="campo" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <label htmlFor="orden">Ordenar</label>
          <select id="orden" className="input" value={orden} onChange={(evento) => setOrden(evento.target.value)}>
            {Object.entries(ORDENES).map(([clave, { etiqueta }]) => (
              <option key={clave} value={clave}>
                {etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>

      {cargando && <Cargando filas={esqueletos} alto={330} columnas />}
      {error && <ErrorConReintento mensaje="No se pudo cargar el catálogo." onReintentar={recargar} />}

      {!cargando && !error && visibles.length === 0 && <div className="vacio">{vacio}</div>}

      {!cargando && !error && visibles.length > 0 && (
        <div className="grid-piezas">
          {visibles.map((producto, indice) => (
            <ProductoCard key={producto.id} producto={producto} indice={indice} />
          ))}
        </div>
      )}
    </section>
  );
}
