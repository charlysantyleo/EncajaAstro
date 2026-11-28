import { Plus } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { useVehiculos } from '../hooks/useCatalogo';
import Capa from './ui/Capa';
import { Sello } from './ui/Movimiento';
import { Cargando, ErrorConReintento } from './EstadoCarga';
import { useT } from '../i18n/react';

export default function SelectorVehiculoModal() {
  const usuarioId = useTienda((estado) => estado.usuarioId);
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const ir = useTienda((estado) => estado.ir);
  const elegirVehiculoActivo = useTienda((estado) => estado.elegirVehiculoActivo);
  const quitarVehiculoActivo = useTienda((estado) => estado.quitarVehiculoActivo);

  const { vehiculos, cargando, error, recargar } = useVehiculos(usuarioId);
  const t = useT();

  return (
    <Capa titulo={t('vehiculo.eligeVehiculo')} onCerrar={() => ir('cerrarModal')}>
      <h3>{t('vehiculo.eligeVehiculo')}</h3>
      <p className="apagado" style={{ margin: 0 }}>
        {t('vehiculo.selectorTexto')}
      </p>

      {cargando && <Cargando filas={3} alto={56} />}
      {error && <ErrorConReintento mensaje={t('vehiculo.errorGarage')} onReintentar={recargar} />}

      {!usuarioId && (
        <p className="apagado" style={{ margin: 0 }}>
          {t('vehiculo.entraParaUsar')}
        </p>
      )}

      {usuarioId && !cargando && !error && vehiculos.length === 0 && (
        <p className="apagado">{t('vehiculo.sinVehiculos')}</p>
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
              {activo && <Sello texto={t('vehiculo.activo')} enLinea />}
            </span>
            <span className="apagado">
              {vehiculo.apodo ? `${vehiculo.apodo} · ` : ''}
              {vehiculo.motor ?? t('vehiculo.motorNoEspecificado')}
            </span>
          </button>
        );
      })}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
        {usuarioId ? (
          <button className="btn btn-primario" onClick={() => ir('abrirAgregarVehiculo')}>
            <Plus size={18} /> {t('vehiculo.agregarVehiculo')}
          </button>
        ) : (
          <button className="btn btn-primario" onClick={() => ir('abrirEntrar')}>
            {t('vehiculo.entrarCrearCuenta')}
          </button>
        )}
        {vehiculoActivo && (
          <button className="btn btn-secundario" onClick={quitarVehiculoActivo}>
            {t('vehiculo.verCatalogoCompleto')}
          </button>
        )}
      </div>
    </Capa>
  );
}
