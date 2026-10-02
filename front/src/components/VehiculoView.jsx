import { ArrowLeft, NotebookPen } from 'lucide-react';
import { useTienda } from '../store/useTienda';
import { leerParametros } from '../lib/rutas';
import { useVehiculo } from '../hooks/useCatalogo';
import { kilometros } from '../lib/formato';
import PiezasCompatibles from './PiezasCompatibles';
import Bitacora from './Bitacora';
import { Cargando, ErrorConReintento } from './EstadoCarga';
import { Aparece, Sello } from './ui/Movimiento';

export default function VehiculoView() {
  const { id: vehiculoId } = leerParametros();
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const ir = useTienda((estado) => estado.ir);
  const elegirVehiculoActivo = useTienda((estado) => estado.elegirVehiculoActivo);

  const usuarioId = useTienda((estado) => estado.usuarioId);
  const { vehiculo, cargando, error, recargar } = useVehiculo(usuarioId ? vehiculoId : null);

  if (!usuarioId) {
    return (
      <div className="contenedor-medio">
        <div className="vacio">
          <h2>Entra para ver esta ficha</h2>
          <p className="apagado">La ficha y la bitácora de un vehículo solo las ve su dueño.</p>
          <button className="btn btn-primario" onClick={() => ir('abrirEntrar')}>
            Entrar
          </button>
        </div>
      </div>
    );
  }

  const esActivo = vehiculo && vehiculo.id === vehiculoActivo?.id;

  return (
    <div className="contenedor" style={{ maxWidth: 1240 }}>
      <button className="enlace-volver" onClick={() => ir('irAGarage')}>
        <ArrowLeft size={18} /> Volver al garage
      </button>

      {cargando && <Cargando filas={2} alto={80} />}
      {error && <ErrorConReintento mensaje="No se pudo cargar el vehículo." onReintentar={recargar} />}

      {vehiculo && (
        <>
          <header className="vehiculo-cabeza">
            <div>
              {vehiculo.apodo && <span className="etiqueta relleno">“{vehiculo.apodo}”</span>}
              <h1 style={{ marginTop: vehiculo.apodo ? 14 : 0 }}>
                {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio}
              </h1>
              <p className="folio" style={{ margin: '14px 0 0', fontSize: 14.5 }}>
                {vehiculo.motor ?? 'motor no especificado'} · {vehiculo.tipoCombustible.toLowerCase()}
                {vehiculo.kilometraje != null ? ` · ${kilometros(vehiculo.kilometraje)}` : ''}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {esActivo ? (
                <Sello texto="Vehículo activo" enLinea tono="azul" />
              ) : (
                <button className="btn btn-secundario" onClick={() => elegirVehiculoActivo(vehiculo)}>
                  Usar como activo
                </button>
              )}
              <button className="btn btn-primario btn-isla" onClick={() => ir('abrirMantenimiento')}>
                Registrar servicio
                <span className="btn-isla-icono" aria-hidden="true">
                  <NotebookPen size={16} />
                </span>
              </button>
            </div>
          </header>

          <Aparece className="dos-columnas">
            <PiezasCompatibles vehiculoId={vehiculo.id} />
            <Bitacora mantenimientos={vehiculo.mantenimientos} />
          </Aparece>
        </>
      )}
    </div>
  );
}
