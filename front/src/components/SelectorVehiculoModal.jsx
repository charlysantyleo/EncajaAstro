import { Plus } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { useVehiculos } from '../hooks/useCatalogo';
import Capa from './ui/Capa';
import { Sello } from './ui/Movimiento';
import { Cargando, ErrorConReintento } from './EstadoCarga';

export default function SelectorVehiculoModal() {
  const usuarioId = useTienda((estado) => estado.usuarioId);
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const ir = useTienda((estado) => estado.ir);
  const elegirVehiculoActivo = useTienda((estado) => estado.elegirVehiculoActivo);
  const quitarVehiculoActivo = useTienda((estado) => estado.quitarVehiculoActivo);

  const { vehiculos, cargando, error, recargar } = useVehiculos(usuarioId);

  return (
    <Capa titulo="Elige tu vehículo" onCerrar={() => ir('cerrarModal')}>
      <h3>Elige tu vehículo</h3>
      <p className="apagado" style={{ margin: 0 }}>
        El vehículo activo filtra el catálogo y valida cada pedido.
      </p>

      {cargando && <Cargando filas={3} alto={56} />}
      {error && <ErrorConReintento mensaje="No se pudo cargar tu garage." onReintentar={recargar} />}

      {!usuarioId && (
        <p className="apagado" style={{ margin: 0 }}>
          Entra a tu cuenta para usar los vehículos de tu garage.
        </p>
      )}

      {usuarioId && !cargando && !error && vehiculos.length === 0 && (
        <p className="apagado">Aún no tienes vehículos registrados.</p>
      )}

      {vehiculos.map((vehiculo) => {
        const activo = vehiculo.id === vehiculoActivo?.id;
        return (
          <button
            key={vehiculo.id}
            className={activo ? 'opcion-vehiculo activo' : 'opcion-vehiculo'}
            onClick={() => elegirVehiculoActivo(vehiculo)}
          >
            <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', fontWeight: 700 }}>
              {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio}
              {activo && <Sello texto="Activo" enLinea />}
            </span>
            <span className="apagado">
              {vehiculo.apodo ? `${vehiculo.apodo} · ` : ''}
              {vehiculo.motor ?? 'motor no especificado'}
            </span>
          </button>
        );
      })}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
        {usuarioId ? (
          <button className="btn btn-primario" onClick={() => ir('abrirAgregarVehiculo')}>
            <Plus size={18} /> Agregar vehículo
          </button>
        ) : (
          <button className="btn btn-primario" onClick={() => ir('abrirEntrar')}>
            Entrar o crear cuenta
          </button>
        )}
        {vehiculoActivo && (
          <button className="btn btn-secundario" onClick={quitarVehiculoActivo}>
            Ver catálogo completo
          </button>
        )}
      </div>
    </Capa>
  );
}
