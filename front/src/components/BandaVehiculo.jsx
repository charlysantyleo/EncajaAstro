import { ArrowUpRight, Car, Plus } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { useVehiculos } from '../hooks/useCatalogo';
import { kilometros } from '../lib/formato';
import { Pintado } from './ui/Movimiento';

// Lo primero que ve el visitante: contra que vehiculo se esta comprando, a escala de cartel.
// Con vehiculo activo, su modelo y año ocupan el ancho; sin vehiculo, la pregunta y atajos a su garage.
export default function BandaVehiculo() {
  const usuarioId = useTienda((estado) => estado.usuarioId);
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const ir = useTienda((estado) => estado.ir);
  const elegirVehiculoActivo = useTienda((estado) => estado.elegirVehiculoActivo);
  const { vehiculos } = useVehiculos(usuarioId);

  if (vehiculoActivo) {
    return (
      <section className="cartel" aria-label="Vehículo activo">
        <p className="cartel-previo">Piezas que sí embonan en tu</p>
        <h1 className="cartel-auto">
          <Pintado key={vehiculoActivo.id}>
            {vehiculoActivo.modelo} <span className="cartel-anio">{vehiculoActivo.anio}</span>
          </Pintado>
        </h1>
        <div className="cartel-pie">
          <dl className="cartel-datos">
            <div>
              <dt>Marca</dt>
              <dd>{vehiculoActivo.marca}</dd>
            </div>
            {vehiculoActivo.motor && (
              <div>
                <dt>Motor</dt>
                <dd className="mono">{vehiculoActivo.motor}</dd>
              </div>
            )}
            {vehiculoActivo.kilometraje != null && (
              <div>
                <dt>Odómetro</dt>
                <dd className="mono">{kilometros(vehiculoActivo.kilometraje)}</dd>
              </div>
            )}
          </dl>
          <div className="cartel-acciones">
            <button className="btn btn-primario" onClick={() => ir('verVehiculo', { vehiculoId: vehiculoActivo.id })}>
              Ficha y bitácora
              <ArrowUpRight size={18} />
            </button>
            <button className="btn btn-secundario" onClick={() => ir('abrirSelectorVehiculo')}>
              Cambiar vehículo
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="cartel cartel-pregunta" aria-label="Elige tu vehículo">
      <h1 className="cartel-auto cartel-auto-pregunta">¿Qué auto tienes?</h1>
      <div className="cartel-pie">
        <p className="cartel-texto">
          Dinos marca, modelo y año una sola vez y te enseñamos lo que encaja. Sin adivinar números de parte.
        </p>
        <div className="cartel-acciones">
          {vehiculos.slice(0, 4).map((vehiculo) => (
            <button key={vehiculo.id} className="btn btn-secundario" onClick={() => elegirVehiculoActivo(vehiculo)}>
              <Car size={18} />
              {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio}
            </button>
          ))}
          <button className="btn btn-primario" onClick={() => ir('abrirAgregarVehiculo')}>
            <Plus size={18} />
            Agregar vehículo
          </button>
        </div>
      </div>
    </section>
  );
}
