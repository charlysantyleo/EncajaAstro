import { useMemo, useState } from 'react';
import { useTienda } from '../store/useTienda';
import ProductoCard from './ProductoCard';
import { Interruptor } from './ui/Movimiento';
import { Cargando, ErrorConReintento } from './EstadoCarga';
import { ChevronsUpDown } from './ui/Iconos';

// Columnas ordenables del indice. "relevancia" es el orden que manda el servidor.
const ORDENES = {
  nombre: { asc: (a, b) => a.nombre.localeCompare(b.nombre, 'es'), desc: (a, b) => b.nombre.localeCompare(a.nombre, 'es') },
  numeroParte: { asc: (a, b) => a.numeroParte.localeCompare(b.numeroParte), desc: (a, b) => b.numeroParte.localeCompare(a.numeroParte) },
  stock: { asc: (a, b) => a.stock - b.stock, desc: (a, b) => b.stock - a.stock },
  precio: { asc: (a, b) => a.precio - b.precio, desc: (a, b) => b.precio - a.precio },
};

function Encabezado({ campo, orden, onOrden, children, className }) {
  const activo = orden.campo === campo;
  const sentido = activo ? (orden.dir === 'asc' ? ', de menor a mayor' : ', de mayor a menor') : '';
  return (
    <button
      type="button"
      className={['indice-col', className, activo ? 'activo' : ''].filter(Boolean).join(' ')}
      onClick={() => onOrden(campo)}
      aria-pressed={activo}
      aria-label={`Ordenar por ${children}${sentido}`}
    >
      {children}
      <ChevronsUpDown size={13} />
    </button>
  );
}

// Indice tipografico de piezas: una fila por pieza alineada a la rejilla, no tarjetas.
// Orden y "solo con existencias" son del lado del cliente; "solo ajuste directo" viaja al backend.
export default function ListaProductos({ productos, cargando, error, recargar, vacio, esqueletos = 8 }) {
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const soloDirectos = useTienda((estado) => estado.soloDirectos);
  const ir = useTienda((estado) => estado.ir);

  const [orden, setOrden] = useState({ campo: null, dir: 'asc' });
  const [soloStock, setSoloStock] = useState(false);
  const [abierta, setAbierta] = useState(null);

  function ordenarPor(campo) {
    setOrden((actual) =>
      actual.campo !== campo
        ? { campo, dir: 'asc' }
        : actual.dir === 'asc'
          ? { campo, dir: 'desc' }
          : { campo: null, dir: 'asc' }
    );
  }

  const visibles = useMemo(() => {
    const lista = soloStock ? productos.filter((p) => p.stock > 0) : [...productos];
    return orden.campo ? lista.sort(ORDENES[orden.campo][orden.dir]) : lista;
  }, [productos, orden, soloStock]);

  return (
    <section className="indice-bloque" aria-live="polite">
      <div className="herramientas">
        <span className="conteo">
          {cargando ? '…' : visibles.length}
          <span> {visibles.length === 1 ? 'pieza' : 'piezas'}</span>
        </span>
        <div className="herramientas-grupo">
          {vehiculoActivo && (
            <Interruptor activo={soloDirectos} onCambio={() => ir('alternarDirectos')}>
              Solo ajuste directo
            </Interruptor>
          )}
          <Interruptor activo={soloStock} onCambio={setSoloStock}>
            Solo con existencias
          </Interruptor>
        </div>
      </div>

      {cargando && <Cargando filas={esqueletos} alto={88} />}
      {error && <ErrorConReintento mensaje="No se pudo cargar el catálogo." onReintentar={recargar} />}

      {!cargando && !error && visibles.length === 0 && <div className="vacio">{vacio}</div>}

      {!cargando && !error && visibles.length > 0 && (
        <div className="indice">
          <div className="indice-cabeza">
            <span className="indice-col col-foto" aria-hidden="true" />
            <Encabezado campo="numeroParte" orden={orden} onOrden={ordenarPor} className="col-np">
              N.º de parte
            </Encabezado>
            <Encabezado campo="nombre" orden={orden} onOrden={ordenarPor} className="col-nombre">
              Pieza
            </Encabezado>
            <span className="indice-col col-ajuste">Ajuste</span>
            <Encabezado campo="stock" orden={orden} onOrden={ordenarPor} className="col-stock">
              Existencias
            </Encabezado>
            <Encabezado campo="precio" orden={orden} onOrden={ordenarPor} className="col-precio">
              Precio
            </Encabezado>
            <span className="indice-col col-accion" aria-hidden="true" />
          </div>
          <ul className="indice-filas" aria-label="Piezas">
            {visibles.map((producto, indice) => (
              <ProductoCard
                key={producto.id}
                producto={producto}
                indice={indice}
                abierta={abierta === producto.id}
                onAlternar={() => setAbierta((actual) => (actual === producto.id ? null : producto.id))}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
