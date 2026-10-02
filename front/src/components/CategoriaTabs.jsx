import { useState } from 'react';
import { motion } from 'motion/react';
import { useTienda } from '../store/useTienda';
import { leerParametros, rutaActual } from '../lib/rutas';
import { useCategorias } from '../hooks/useCatalogo';

// Tabs con indicador compartido (layoutId) y pastilla que sigue al cursor, como en beUI.
export default function CategoriaTabs() {
  const ir = useTienda((estado) => estado.ir);
  const { categorias, cargando } = useCategorias();
  const [sobre, setSobre] = useState(null);

  const { id: categoriaId, q } = leerParametros();
  const enHome = rutaActual() === '/';
  const activa = enHome ? 'todo' : q ? null : (categoriaId ?? 'todo');

  const opciones = [{ id: 'todo', nombre: 'Todo el catálogo' }, ...categorias];

  function elegir(opcion) {
    if (opcion.id === 'todo') return ir('irAHome');
    return ir('elegirCategoria', { categoriaId: opcion.id, nombre: opcion.nombre });
  }

  return (
    <nav className="tabs-cat" aria-label="Categorías">
      <div className="tabs-cat-fila" onMouseLeave={() => setSobre(null)}>
        {opciones.map((opcion) => (
          <button
            key={opcion.id}
            className={opcion.id === activa ? 'tab activo' : 'tab'}
            aria-current={opcion.id === activa ? 'page' : undefined}
            onMouseEnter={() => setSobre(opcion.id)}
            onFocus={() => setSobre(opcion.id)}
            onBlur={() => setSobre(null)}
            onClick={() => elegir(opcion)}
          >
            {sobre === opcion.id && (
              <motion.span
                layoutId="tab-sobre"
                className="tab-hover"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="tab-texto">{opcion.nombre}</span>
            {opcion.id === activa && (
              <motion.span
                layoutId="tab-activo"
                className="tab-indicador"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
          </button>
        ))}
        {cargando && categorias.length === 0 && <span className="tab apagado">Cargando categorías…</span>}
      </div>
    </nav>
  );
}
