import { useTienda } from '../store/useTienda';
import { useProductos } from '../hooks/useCatalogo';
import { useDelNavegador } from '../hooks/useEnNavegador';
import CatalogoLayout from './CatalogoLayout';
import BandaVehiculo from './BandaVehiculo';
import PedidoConfirmado from './PedidoConfirmado';
import ListaProductos from './ListaProductos';
import NotaLateral from './NotaLateral';
import { comoIsla } from './ui/Isla';

// categorias y productosIniciales vienen del build (pages/index.astro): el HTML ya trae el indice de sistemas y
// las primeras piezas, sin esqueletos. Con vehiculo activo, el navegador pide la lista filtrada.
function HomeView({ categorias = [], productosIniciales = null }) {
  const vehiculoActivo = useDelNavegador(useTienda((estado) => estado.vehiculoActivo), null);
  const soloDirectos = useDelNavegador(useTienda((estado) => estado.soloDirectos), false);

  const { productos, cargando, error, recargar } = useProductos({
    vehiculoId: vehiculoActivo?.id,
    soloDirectos,
    limite: 12,
    iniciales: productosIniciales,
  });

  return (
    <CatalogoLayout nota={<NotaLateral />} categorias={categorias} activa="todo">
      <PedidoConfirmado />
      <BandaVehiculo />
      <ListaProductos
        productos={productos}
        cargando={cargando}
        error={error}
        recargar={recargar}
        vacio={<p>No hay piezas registradas para este filtro.</p>}
      />
    </CatalogoLayout>
  );
}

export default comoIsla(HomeView);
