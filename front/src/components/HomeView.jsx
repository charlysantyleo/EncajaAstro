import { useTienda } from '../store/useTienda';
import { useProductos } from '../hooks/useCatalogo';
import CatalogoLayout from './CatalogoLayout';
import BandaVehiculo from './BandaVehiculo';
import PedidoConfirmado from './PedidoConfirmado';
import ListaProductos from './ListaProductos';

export default function HomeView() {
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const soloDirectos = useTienda((estado) => estado.soloDirectos);

  const { productos, cargando, error, recargar } = useProductos({
    vehiculoId: vehiculoActivo?.id,
    soloDirectos,
    limite: 12,
  });

  return (
    <CatalogoLayout>
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
