import { motion } from 'motion/react';
import { useTienda } from '../store/useTienda';
import { leerParametros, rutaActual } from '../lib/rutas';
import { useCategorias } from '../hooks/useCatalogo';

// Indice de sistemas: columna izquierda fija en escritorio, fila deslizable en movil.
// El cuadro rojo marca el sistema activo y viaja entre renglones (layoutId).
export default function CategoriaTabs() {
  const ir = useTienda((estado) => estado.ir);
  const { categorias, cargando } = useCategorias();

  const { id: categoriaId, q } = leerParametros();
  const enHome = rutaActual() === '/';
  const activa = enHome ? 'todo' : q ? null : (categoriaId ?? 'todo');

  const opciones = [{ id: 'todo', nombre: 'Todo el catálogo' }, ...categorias];

  function elegir(opcion) {
    if (opcion.id === 'todo') return ir('irAHome');
    return ir('elegirCategoria', { categoriaId: opcion.id, nombre: opcion.nombre });
  }

  return (
    <nav className="sistemas" aria-label="Sistemas del vehículo">
      <h5 className="sistemas-titulo">Sistemas</h5>
      <ul>
        {opciones.map((opcion) => {
          const esActiva = opcion.id === activa;
          return (
            <li key={opcion.id}>
              <button
                type="button"
                className={esActiva ? 'sistema activo' : 'sistema'}
                aria-current={esActiva ? 'page' : undefined}
                onClick={() => elegir(opcion)}
              >
                {esActiva && (
                  <motion.span
                    layoutId="sistema-activo"
                    className="sistema-marca"
                    transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
                  />
                )}
                {opcion.nombre}
              </button>
            </li>
          );
        })}
        {cargando && categorias.length === 0 && <li className="apagado">Cargando…</li>}
      </ul>
    </nav>
  );
}
