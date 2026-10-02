import { ArrowUpRight, Car, Plus, ScrollText } from 'lucide-react';
import { useTienda } from '../store/useTienda';
import { useVehiculos } from '../hooks/useCatalogo';
import { kilometros } from '../lib/formato';
import { Aparece, Pintado, Sello } from './ui/Movimiento';

// Lo primero que ve el visitante: contra qué vehículo se está comprando.
// Con vehículo activo, su nombre se pinta en letra de rótulo; sin vehículo, una invitación con atajos a su garage.
export default function BandaVehiculo() {
  const usuarioId = useTienda((estado) => estado.usuarioId);
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const ir = useTienda((estado) => estado.ir);
  const elegirVehiculoActivo = useTienda((estado) => estado.elegirVehiculoActivo);
  const { vehiculos } = useVehiculos(usuarioId);

  if (vehiculoActivo) {
    return (
      <Aparece className="banda">
        <div>
          <h2>
            <span className="banda-previo">
              Piezas que sí embonan en tu
            </span>
            <Pintado key={vehiculoActivo.id} className="banda-auto">
              {vehiculoActivo.modelo} {vehiculoActivo.anio}
            </Pintado>
          </h2>
          <p className="banda-texto">
            {vehiculoActivo.marca} {vehiculoActivo.modelo}
            {vehiculoActivo.kilometraje != null ? ` · ${kilometros(vehiculoActivo.kilometraje)}` : ''}. El catálogo ya está
            filtrado; cada pieza lleva su cinta de ajuste.
          </p>
          <div className="banda-acciones">
            <button className="btn btn-primario btn-isla" onClick={() => ir('verVehiculo', { vehiculoId: vehiculoActivo.id })}>
              <ScrollText size={18} /> Ficha y bitácora
              <span className="btn-isla-icono" aria-hidden="true">
                <ArrowUpRight size={16} />
              </span>
            </button>
            <button className="btn btn-secundario" onClick={() => ir('abrirSelectorVehiculo')}>
              Cambiar vehículo
            </button>
          </div>
        </div>
        <dl className="banda-ficha">
          <div>
            <dt>Marca</dt>
            <dd>{vehiculoActivo.marca}</dd>
          </div>
          {vehiculoActivo.kilometraje != null && (
            <div>
              <dt>Odómetro</dt>
              <dd>{kilometros(vehiculoActivo.kilometraje)}</dd>
            </div>
          )}
          <Sello texto="Compatible" enLinea tono="azul" retraso={0.7} />
        </dl>
      </Aparece>
    );
  }

  return (
    <Aparece className="banda">
      <div>
        <h2 className="banda-titulo">Dinos qué auto tienes y te enseñamos lo que encaja</h2>
        <p className="banda-texto">
          Registra marca, modelo y año una sola vez. Sin adivinar números de parte.
        </p>
        <div className="rapidos">
          {vehiculos.slice(0, 4).map((vehiculo) => (
            <button key={vehiculo.id} className="rapido" onClick={() => elegirVehiculoActivo(vehiculo)}>
              <Car size={16} />
              {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio}
            </button>
          ))}
          <button className="btn btn-primario btn-chico" onClick={() => ir('abrirAgregarVehiculo')}>
            <Plus size={16} /> Agregar vehículo
          </button>
        </div>
      </div>
      <img className="banda-foto" src="/img/catalogo.jpg" alt="Refacciones del catálogo" />
    </Aparece>
  );
}
