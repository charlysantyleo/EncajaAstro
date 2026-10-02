import { Plus } from './ui/Iconos';
import { motion } from 'motion/react';
import { useTienda } from '../store/useTienda';
import { useVehiculos } from '../hooks/useCatalogo';
import { kilometros } from '../lib/formato';
import { Cargando, ErrorConReintento } from './EstadoCarga';
import { Sello } from './ui/Movimiento';

export default function GarageView() {
  const usuarioId = useTienda((estado) => estado.usuarioId);
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const ir = useTienda((estado) => estado.ir);
  const elegirVehiculoActivo = useTienda((estado) => estado.elegirVehiculoActivo);

  const { vehiculos, cargando, error, recargar } = useVehiculos(usuarioId);

  if (!usuarioId) {
    return (
      <div className="contenedor-medio">
        <div className="vacio">
          <h2>Tu garage vive en tu cuenta</h2>
          <p className="apagado">
            Entra o crea una cuenta para registrar tus vehículos y llevar su bitácora. Comprar sigue sin pedir cuenta.
          </p>
          <button className="btn btn-primario" onClick={() => ir('abrirEntrar')}>
            Entrar o crear cuenta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="contenedor" style={{ maxWidth: 1180 }}>
      <div className="encabezado-pagina">
        <div>
          <h1>Mi garage</h1>
          <p style={{ marginTop: 12, marginBottom: 0 }}>
            Elige un vehículo para ver qué piezas embonan y su bitácora. El vehículo activo filtra todo el catálogo.
          </p>
        </div>
        <button className="btn btn-primario btn-isla" onClick={() => ir('abrirAgregarVehiculo')}>
          Agregar vehículo
          <span className="btn-isla-icono" aria-hidden="true">
            <Plus size={16} />
          </span>
        </button>
      </div>

      {cargando && <Cargando filas={3} alto={190} columnas />}
      {error && <ErrorConReintento mensaje="No se pudo cargar tu garage." onReintentar={recargar} />}

      {!cargando && !error && vehiculos.length === 0 && (
        <div className="vacio">
          <h3>Tu garage está vacío</h3>
          <p className="apagado">Registra tu primer vehículo y el catálogo se ajusta a él.</p>
          <button className="btn btn-primario" onClick={() => ir('abrirAgregarVehiculo')}>
            Agregar mi primer vehículo
          </button>
        </div>
      )}

      {!cargando && !error && vehiculos.length > 0 && (
        <div className="grid-garage">
          {vehiculos.map((vehiculo, indice) => {
            const activo = vehiculo.id === vehiculoActivo?.id;
            return (
              <motion.article
                key={vehiculo.id}
                layout
                className={activo ? 'auto activo' : 'auto'}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28, delay: indice * 0.06 }}
              >
                <div className="auto-cabeza">
                  <span className="auto-emblema" aria-hidden="true">
                    {vehiculo.marca.slice(0, 1).toUpperCase()}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="auto-nombre">
                      {vehiculo.marca} {vehiculo.modelo}
                    </div>
                    {vehiculo.apodo && <span className="apagado">“{vehiculo.apodo}”</span>}
                  </div>
                  {activo && (
                    <span style={{ marginLeft: 'auto' }}>
                      <Sello texto="Activo" enLinea />
                    </span>
                  )}
                </div>
                <dl className="auto-datos">
                  <div>
                    <dt>Año</dt>
                    <dd>{vehiculo.anio}</dd>
                  </div>
                  <div>
                    <dt>Motor</dt>
                    <dd>{vehiculo.motor ?? 'Sin dato'}</dd>
                  </div>
                  <div>
                    <dt>Odómetro</dt>
                    <dd>{kilometros(vehiculo.kilometraje) ?? 'Sin dato'}</dd>
                  </div>
                </dl>
                <div className="auto-acciones">
                  <button className="btn btn-secundario btn-chico" onClick={() => ir('verVehiculo', { vehiculoId: vehiculo.id })}>
                    Ver ficha
                  </button>
                  {!activo && (
                    <button className="btn btn-texto btn-chico" onClick={() => elegirVehiculoActivo(vehiculo)}>
                      Usar como activo
                    </button>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
