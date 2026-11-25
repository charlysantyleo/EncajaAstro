import { ArrowUpRight, Car, Plus } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { useVehiculos } from '../hooks/useCatalogo';
import { useEnNavegador } from '../hooks/useEnNavegador';
import { kilometros } from '../lib/formato';
import { Pintado } from './ui/Movimiento';
import { useT } from '../i18n/react';

// Lo primero que ve el visitante: contra que vehiculo se esta comprando, a escala de cartel.
// Con vehiculo activo, su modelo y año ocupan el ancho; sin vehiculo, la pregunta y atajos a su garage.
export default function BandaVehiculo() {
  const usuarioId = useTienda((estado) => estado.usuarioId);
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const ir = useTienda((estado) => estado.ir);
  const elegirVehiculoActivo = useTienda((estado) => estado.elegirVehiculoActivo);
  const { vehiculos } = useVehiculos(usuarioId);
  const enNavegador = useEnNavegador();
  const t = useT();

  // El HTML del build no sabe si el visitante ya eligio vehiculo: trae la pregunta, que es lo que ve quien llega
  // por primera vez (y lo que lee un buscador). Su titulo es el elemento mas grande de la pagina (el LCP), asi
  // que no se espera a React para pintarlo. Si ya habia vehiculo, al hidratar se cambia por su cartel.
  if (enNavegador && vehiculoActivo) {
    return (
      <section className="cartel" aria-label={t('Vehículo activo')}>
        <p className="cartel-previo">{t('Piezas que sí embonan en tu')}</p>
        <h1 className="cartel-auto">
          <Pintado key={vehiculoActivo.id}>
            {vehiculoActivo.modelo} <span className="cartel-anio">{vehiculoActivo.anio}</span>
          </Pintado>
        </h1>
        <div className="cartel-pie">
          <dl className="cartel-datos">
            <div>
              <dt>{t('Marca')}</dt>
              <dd>{vehiculoActivo.marca}</dd>
            </div>
            {vehiculoActivo.motor && (
              <div>
                <dt>{t('Motor')}</dt>
                <dd className="mono">{vehiculoActivo.motor}</dd>
              </div>
            )}
            {vehiculoActivo.kilometraje != null && (
              <div>
                <dt>{t('Odómetro')}</dt>
                <dd className="mono">{kilometros(vehiculoActivo.kilometraje)}</dd>
              </div>
            )}
          </dl>
          <div className="cartel-acciones">
            <button className="btn btn-primario" onClick={() => ir('verVehiculo', { vehiculoId: vehiculoActivo.id })}>
              {t('Ficha y bitácora')}
              <ArrowUpRight size={18} />
            </button>
            <button className="btn btn-secundario" onClick={() => ir('abrirSelectorVehiculo')}>
              {t('Cambiar vehículo')}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="cartel cartel-pregunta" aria-label={t('Elige tu vehículo')}>
      <h1 className="cartel-auto cartel-auto-pregunta">{t('¿Qué auto tienes?')}</h1>
      <div className="cartel-pie">
        <p className="cartel-texto">
          {t('Dinos marca, modelo y año una sola vez y te enseñamos lo que encaja. Sin adivinar números de parte.')}
        </p>
        <div className="cartel-acciones">
          {(enNavegador ? vehiculos : []).slice(0, 4).map((vehiculo) => (
            <button key={vehiculo.id} className="btn btn-secundario" onClick={() => elegirVehiculoActivo(vehiculo)}>
              <Car size={18} />
              {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio}
            </button>
          ))}
          <button className="btn btn-primario" onClick={() => ir('abrirAgregarVehiculo')}>
            <Plus size={18} />
            {t('Agregar vehículo')}
          </button>
        </div>
      </div>
    </section>
  );
}
