import { motion } from 'motion/react';
import { rutas } from '../lib/rutas';
import { useCategorias } from '../hooks/useCatalogo';

// Indice de sistemas: columna izquierda fija en escritorio, fila deslizable en movil.
// Son enlaces (<a href>), no botones: un buscador los sigue y llegan a las paginas /categoria/<sistema>.
// La lista viene del build (iniciales) y se pone al dia en el navegador. activa: id del sistema, 'todo' o null.
// El cuadro rojo marca el sistema activo y viaja entre renglones (layoutId).
export default function CategoriaTabs({ iniciales = [], activa = null }) {
  const { categorias: delServidor, cargando } = useCategorias();
  const categorias = delServidor.length ? delServidor : iniciales;
  const opciones = [{ id: 'todo', nombre: 'Todo el catálogo' }, ...categorias];

  return (
    <nav className="sistemas" aria-labelledby="sistemas-titulo">
      <p className="titulo-chico sistemas-titulo" id="sistemas-titulo">
        Sistemas
      </p>
      <ul>
        {opciones.map((opcion) => {
          const esActiva = opcion.id === activa;
          return (
            <li key={opcion.id}>
              <a
                href={opcion.id === 'todo' ? rutas.home : rutas.categoria(opcion.id, opcion.nombre)}
                className={esActiva ? 'sistema activo' : 'sistema'}
                aria-current={esActiva ? 'page' : undefined}
              >
                {esActiva && (
                  <motion.span
                    layoutId="sistema-activo"
                    className="sistema-marca"
                    transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
                  />
                )}
                {opcion.nombre}
              </a>
            </li>
          );
        })}
        {cargando && categorias.length === 0 && <li className="apagado">Cargando…</li>}
      </ul>
    </nav>
  );
}
