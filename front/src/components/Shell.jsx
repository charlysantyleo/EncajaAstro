import { AnimatePresence } from 'motion/react';
import { useTienda } from '../store/useTienda';
import { useStockSuscripcion } from '../hooks/useStockSuscripcion';
import TopBar from './TopBar';
import Footer from './Footer';
import Avisos from './Avisos';
import ProductoModal from './ProductoModal';
import SelectorVehiculoModal from './SelectorVehiculoModal';
import AgregarVehiculoModal from './AgregarVehiculoModal';
import MantenimientoModal from './MantenimientoModal';
import EntrarModal from './EntrarModal';

// Marco comun de todas las paginas: barra superior, pie, capas y stock en vivo.
export default function Shell({ children }) {
  const modal = useTienda((estado) => estado.modal);

  useStockSuscripcion();

  return (
    <div className="app">
      <TopBar />
      <main className="app-main">{children}</main>
      <Footer />
      <Avisos />

      <AnimatePresence>
        {modal === 'producto' && <ProductoModal key="producto" />}
        {modal === 'selectorVehiculo' && <SelectorVehiculoModal key="selector" />}
        {modal === 'agregarVehiculo' && <AgregarVehiculoModal key="agregar" />}
        {modal === 'mantenimiento' && <MantenimientoModal key="mantenimiento" />}
        {modal === 'entrar' && <EntrarModal key="entrar" />}
      </AnimatePresence>
    </div>
  );
}
