import { useMemo, useState } from 'react';
import { useTienda } from '../store/useTienda';
import ProductoCard from './ProductoCard';
import { Interruptor } from './ui/Movimiento';
import { Cargando, ErrorConReintento } from './EstadoCarga';
import { ChevronsUpDown } from './ui/Iconos';
import { anotarActividad } from '../lib/actividad';
import { useDelNavegador } from '../hooks/useEnNavegador';
import { esSinConexion } from '../lib/offline';
import { useIdioma, useT } from '../i18n/react';
import { locale } from '../i18n';

// Columnas ordenables del indice. "relevancia" es el orden que manda el servidor. El nombre se ordena con las
// reglas del idioma de la pagina.
const ordenes = (locale) => ({
  nombre: { asc: (a, b) => a.nombre.localeCompare(b.nombre, locale), desc: (a, b) => b.nombre.localeCompare(a.nombre, locale) },
  numeroParte: { asc: (a, b) => a.numeroParte.localeCompare(b.numeroParte), desc: (a, b) => b.numeroParte.localeCompare(a.numeroParte) },
  stock: { asc: (a, b) => a.stock - b.stock, desc: (a, b) => b.stock - a.stock },
  precio: { asc: (a, b) => a.precio - b.precio, desc: (a, b) => b.precio - a.precio },
});

function Encabezado({ campo, orden, onOrden, children, className }) {
  const t = useT();
  const activo = orden.campo === campo;
  const sentido = activo ? (orden.dir === 'asc' ? t('catalogo.ordenAsc') : t('catalogo.ordenDesc')) : '';
  return (
    <button
      type="button"
      className={['indice-col', className, activo ? 'activo' : ''].filter(Boolean).join(' ')}
      onClick={() => onOrden(campo)}
      aria-pressed={activo}
      aria-label={`${t('catalogo.ordenarPor', { columna: children })}${sentido}`}
    >
      {children}
      <ChevronsUpDown size={13} />
    </button>
  );
}

// Indice tipografico de piezas: una fila por pieza alineada a la rejilla, no tarjetas.
// Orden y "solo con existencias" son del lado del cliente; "solo ajuste directo" viaja al backend.
export default function ListaProductos({ productos, cargando, error, recargar, vacio, esqueletos = 8 }) {
  const vehiculoActivo = useDelNavegador(useTienda((estado) => estado.vehiculoActivo), null);
  const soloDirectos = useDelNavegador(useTienda((estado) => estado.soloDirectos), false);
  const ir = useTienda((estado) => estado.ir);
  const t = useT();
  const idioma = useIdioma();

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
    return orden.campo ? lista.sort(ordenes(locale(idioma))[orden.campo][orden.dir]) : lista;
  }, [productos, orden, soloStock, idioma]);

  return (
    <section className="indice-bloque" aria-live="polite">
      <div className="herramientas">
        <span className="conteo">
          {cargando ? '…' : visibles.length}
          <span> {visibles.length === 1 ? t('comun.pieza') : t('comun.piezas')}</span>
        </span>
        <div className="herramientas-grupo">
          {vehiculoActivo && (
            <Interruptor activo={soloDirectos} onCambio={() => ir('alternarDirectos')}>
              {t('catalogo.soloAjusteDirecto')}
            </Interruptor>
          )}
          <Interruptor activo={soloStock} onCambio={setSoloStock}>
            {t('catalogo.soloExistencias')}
          </Interruptor>
        </div>
      </div>

      {cargando && <Cargando filas={esqueletos} alto={88} />}
      {error && <ErrorConReintento mensaje={esSinConexion(error) ? t.mensaje(error) : t('catalogo.errorCatalogo')} onReintentar={recargar} />}

      {!cargando && !error && visibles.length === 0 && <div className="vacio">{vacio}</div>}

      {!cargando && !error && visibles.length > 0 && (
        <div className="indice">
          <div className="indice-cabeza">
            <span className="indice-col col-foto" aria-hidden="true" />
            <Encabezado campo="numeroParte" orden={orden} onOrden={ordenarPor} className="col-np">
              {t('catalogo.numeroParte')}
            </Encabezado>
            <Encabezado campo="nombre" orden={orden} onOrden={ordenarPor} className="col-nombre">
              {t('catalogo.pieza')}
            </Encabezado>
            <span className="indice-col col-ajuste">{t('catalogo.ajuste')}</span>
            <Encabezado campo="stock" orden={orden} onOrden={ordenarPor} className="col-stock">
              {t('catalogo.existencias')}
            </Encabezado>
            <Encabezado campo="precio" orden={orden} onOrden={ordenarPor} className="col-precio">
              {t('catalogo.precio')}
            </Encabezado>
            <span className="indice-col col-accion" aria-hidden="true" />
          </div>
          <ul className="indice-filas" aria-label={t('catalogo.piezas')}>
            {visibles.map((producto, indice) => (
              <ProductoCard
                key={producto.id}
                producto={producto}
                indice={indice}
                abierta={abierta === producto.id}
                onAlternar={() => {
                  // Abrir la ficha cuenta como "pieza vista" en el panel; cerrarla no.
                  if (abierta !== producto.id) anotarActividad('VISTA_PRODUCTO', producto.id);
                  setAbierta((actual) => (actual === producto.id ? null : producto.id));
                }}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
