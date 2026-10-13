import { Suspense, lazy } from 'react';
import { AnimatePresence } from 'motion/react';
import { useTienda } from '../store/useTienda';
import Avisos from './Avisos';
import { comoIsla } from './ui/Isla';

// Cada capa vive en su propio archivo de JavaScript y se descarga hasta la primera vez que se abre:
// quien solo mira el catalogo nunca baja el formulario de entrar ni el de la bitacora.
const CAPAS = {
  producto: lazy(() => import('./ProductoModal')),
  selectorVehiculo: lazy(() => import('./SelectorVehiculoModal')),
  agregarVehiculo: lazy(() => import('./AgregarVehiculoModal')),
  mantenimiento: lazy(() => import('./MantenimientoModal')),
  entrar: lazy(() => import('./EntrarModal')),
};

// Isla client:idle presente en todas las paginas: avisos y dialogos. Nada de esto se necesita
// para pintar la pagina, asi que se hidrata cuando el navegador queda libre.
function Capas() {
  const modal = useTienda((estado) => estado.modal);
  const Capa = CAPAS[modal];

  return (
    <>
      <Avisos />
      <AnimatePresence>
        {Capa && (
          <Suspense key={modal} fallback={null}>
            <Capa />
          </Suspense>
        )}
      </AnimatePresence>
    </>
  );
}

export default comoIsla(Capas);
