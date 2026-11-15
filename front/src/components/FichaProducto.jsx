import { useState } from 'react';
import { CircleAlert, CircleCheck } from './ui/Iconos';
import { enNota, useTienda } from '../store/useTienda';
import { useProducto, useProductos } from '../hooks/useCatalogo';
import { useDelNavegador } from '../hooks/useEnNavegador';
import { imagenDe } from '../imagenes';
import { ajusteDe, cubre, describir } from '../lib/compat';
import { pesos } from '../lib/formato';
import { leerParametros, rutas } from '../lib/rutas';
import { slugDeProducto } from '../lib/slug';
import { Cargando } from './EstadoCarga';
import { Cantidad } from './ui/Movimiento';
import Precio from './ui/Precio';
import { comoIsla } from './ui/Isla';

// Pagina de una pieza (/producto/<numero-de-parte>-<nombre>). Con `producto` (pages/producto/[slug].astro) el HTML
// del build ya trae todo y aqui solo se ponen al dia las existencias, el precio de taller y el boton de la nota.
// Sin `producto` (pages/producto.astro, una pieza agregada despues del build) se busca por el ?slug= de la URL.
function FichaProducto({ producto: delBuild = null }) {
  const slugBuscado = delBuild ? null : leerParametros().slug;
  // Solo la pagina de respaldo necesita la lista para encontrar la pieza por su slug.
  const { productos: todos } = useProductos({ omitir: !slugBuscado });
  const encontrado = slugBuscado ? todos.find((p) => slugDeProducto(p) === slugBuscado) : null;
  const id = delBuild?.id ?? encontrado?.id ?? null;
  const { producto: fresco, cargando } = useProducto(id);
  const producto = fresco ? { ...delBuild, ...fresco, categoria: fresco.categoria ?? delBuild?.categoria } : delBuild;

  const ir = useTienda((estado) => estado.ir);
  const vehiculoActivo = useDelNavegador(useTienda((estado) => estado.vehiculoActivo), null);
  const yaEnNota = useDelNavegador(useTienda(enNota(id)), 0);
  const [elegida, setCantidad] = useState(1);

  if (!producto) {
    return (
      <div className="contenedor">
        {slugBuscado && !cargando && todos.length > 0 && !encontrado ? (
          <div className="vacio">
            <h1>No encontramos esa pieza</h1>
            <a className="btn btn-primario" href={rutas.home}>
              Ver el catálogo
            </a>
          </div>
        ) : (
          <Cargando filas={3} alto={80} />
        )}
      </div>
    );
  }

  const imagen = imagenDe(producto);
  const agotada = producto.stock <= 0;
  const caben = Math.max(0, producto.stock - yaEnNota);
  const cantidad = Math.min(elegida, Math.max(1, caben));
  const ajuste = ajusteDe(producto, vehiculoActivo);

  return (
    <div className="contenedor ficha-pagina">
      <nav aria-label="Ruta de navegación" className="migas">
        <ol>
          <li>
            <a href={rutas.home}>Inicio</a>
          </li>
          {producto.categoria && (
            <li>
              <a href={rutas.categoria(producto.categoria.id, producto.categoria.nombre)}>{producto.categoria.nombre}</a>
            </li>
          )}
          <li aria-current="page">{producto.nombre}</li>
        </ol>
      </nav>

      <div className="ficha-producto">
        <div className="ficha-producto-foto">
          {/* Es la imagen principal de la pagina: se pide con prioridad, con su espacio reservado (960×720). */}
          {imagen ? (
            <img src={imagen} alt={`${producto.nombre} ${producto.marca ?? ''}`.trim()} width="960" height="720" fetchPriority="high" decoding="async" />
          ) : (
            <span aria-hidden="true">{producto.nombre.slice(0, 2).toUpperCase()}</span>
          )}
        </div>

        <div className="ficha-producto-info">
          <p className="titulo-chico">
            {[producto.marca, `N.º de parte ${producto.numeroParte}`].filter(Boolean).join(' · ')}
          </p>
          <h1>{producto.nombre}</h1>
          <p className="ficha-producto-precio">
            <Precio producto={producto} />
            <span className="apagado"> IVA incluido</span>
          </p>
          <p className={agotada ? 'error' : 'apagado'} aria-live="polite">
            {agotada ? 'Agotado por ahora' : `${producto.stock} en existencia`}
          </p>

          {vehiculoActivo && (
            <p className={ajuste ? 'ficha-ajuste' : 'ficha-ajuste error'}>
              {ajuste ? <CircleCheck size={18} /> : <CircleAlert size={18} />}
              {ajuste
                ? `Embona en tu ${vehiculoActivo.modelo} ${vehiculoActivo.anio} (${ajuste.tipo === 'DIRECTO' ? 'ajuste directo' : 'equivalencia'})`
                : `No está registrada como compatible con tu ${vehiculoActivo.modelo} ${vehiculoActivo.anio}.`}
            </p>
          )}

          <form
            className="ficha-comprar"
            onSubmit={(evento) => {
              evento.preventDefault();
              ir('agregarAlCarrito', { producto, cantidad });
            }}
          >
            <Cantidad valor={cantidad} min={1} max={Math.max(1, caben)} onCambio={setCantidad} etiqueta={`Cantidad de ${producto.nombre}`} />
            <button className="btn btn-primario" type="submit" disabled={agotada || caben === 0}>
              Agregar a la nota · {pesos((producto.precioParaTi ?? producto.precio) * cantidad)}
            </button>
          </form>
          {yaEnNota > 0 && (
            <p className="apagado">{caben === 0 ? 'Tu nota ya lleva todas las existencias.' : `Ya llevas ${yaEnNota} en tu nota.`}</p>
          )}
        </div>
      </div>

      {producto.descripcion && (
        <section className="ficha-seccion" aria-labelledby="ficha-descripcion">
          <h2 id="ficha-descripcion" className="titulo-seccion">
            Descripción
          </h2>
          <p>{producto.descripcion}</p>
        </section>
      )}

      <section className="ficha-seccion" aria-labelledby="ficha-compatible">
        <h2 id="ficha-compatible" className="titulo-seccion">
          Compatible con
        </h2>
        {producto.compatibilidades?.length ? (
          <ul className="ajustes">
            {producto.compatibilidades.map((c, i) => (
              <li key={i} className={vehiculoActivo && cubre(c, vehiculoActivo) ? 'ajuste mio' : 'ajuste'}>
                <span>{describir(c)}</span>
                <span className={c.tipo === 'DIRECTO' ? 'etiqueta sello-azul' : 'etiqueta rojo'}>{c.tipo === 'DIRECTO' ? 'Directo' : 'Equivalencia'}</span>
                {c.nota && <span className="ajuste-nota">{c.nota}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="apagado">Todavía no registramos en qué vehículos embona. Pregúntanos por tu modelo.</p>
        )}
      </section>
    </div>
  );
}

export default comoIsla(FichaProducto);
