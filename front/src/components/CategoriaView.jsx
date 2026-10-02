import { useTienda } from '../store/useTienda';
import { leerParametros } from '../lib/rutas';
import { useProductos } from '../hooks/useCatalogo';
import CatalogoLayout from './CatalogoLayout';
import ListaProductos from './ListaProductos';

export default function CategoriaView() {
  const { id: categoriaId, nombre: categoriaNombre, q: texto } = leerParametros();
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const soloDirectos = useTienda((estado) => estado.soloDirectos);
  const ir = useTienda((estado) => estado.ir);

  const { productos, cargando, error, recargar } = useProductos({
    categoriaId,
    vehiculoId: vehiculoActivo?.id,
    texto,
    soloDirectos,
  });

  const titulo = texto ? `Resultados para “${texto}”` : (categoriaNombre ?? 'Catálogo');

  return (
    <CatalogoLayout>
      <div>
        <h1>{titulo}</h1>
        {vehiculoActivo && (
          <p className="apagado" style={{ marginTop: 12, marginBottom: 0 }}>
            Filtrado por compatibilidad con tu {vehiculoActivo.marca} {vehiculoActivo.modelo} {vehiculoActivo.anio}.
          </p>
        )}
      </div>

      <ListaProductos
        productos={productos}
        cargando={cargando}
        error={error}
        recargar={recargar}
        vacio={
          <>
            <p>No hay piezas que coincidan con este filtro.</p>
            {vehiculoActivo && (
              <button className="btn btn-secundario" onClick={() => ir('abrirSelectorVehiculo')}>
                Cambiar vehículo activo
              </button>
            )}
          </>
        }
      />
    </CatalogoLayout>
  );
}
