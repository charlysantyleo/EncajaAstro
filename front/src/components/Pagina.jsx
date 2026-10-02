import { MotionConfig } from 'motion/react';
import Shell from './Shell';
import HomeView from './HomeView';
import CategoriaView from './CategoriaView';
import GarageView from './GarageView';
import VehiculoView from './VehiculoView';
import CarritoView from './CarritoView';
import CheckoutView from './CheckoutView';
import EntrarView from './EntrarView';

const VISTAS = {
  home: HomeView,
  categoria: CategoriaView,
  garage: GarageView,
  vehiculo: VehiculoView,
  carrito: CarritoView,
  checkout: CheckoutView,
  entrar: EntrarView,
};

// Isla de React que usan las paginas .astro: recibe el nombre de la vista.
// MotionConfig respeta prefers-reduced-motion en todas las animaciones de transform.
export default function Pagina({ vista }) {
  const Vista = VISTAS[vista];
  return (
    <MotionConfig reducedMotion="user">
      <Shell>
        <Vista />
      </Shell>
    </MotionConfig>
  );
}
