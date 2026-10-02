import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTienda } from '../store/useTienda';
import { leerParametros, rutaActual } from '../lib/rutas';
import { useProductos } from '../hooks/useCatalogo';
import { graphqlRequest } from '../graphql/client';
import { MUTATION_REGISTRAR_MANTENIMIENTO } from '../graphql/queries';
import Capa from './ui/Capa';

export default function MantenimientoModal() {
  const vehiculoId = rutaActual().startsWith('/vehiculo') ? leerParametros().id : null;
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const pedidoConfirmado = useTienda((estado) => estado.pedidoConfirmado);
  const ir = useTienda((estado) => estado.ir);
  const refrescar = useTienda((estado) => estado.refrescar);

  const objetivoId = vehiculoId ?? vehiculoActivo?.id ?? null;
  const pedidoLigado = pedidoConfirmado?.vehiculo ? pedidoConfirmado : null;

  const { productos } = useProductos({ vehiculoId: objetivoId });

  const opciones = pedidoLigado
    ? pedidoLigado.detalles.map((detalle) => ({ id: detalle.producto.id, nombre: detalle.producto.nombre }))
    : productos.map((producto) => ({ id: producto.id, nombre: producto.nombre }));

  const [descripcion, setDescripcion] = useState('');
  const [productoId, setProductoId] = useState('');
  const [kilometraje, setKilometraje] = useState('');
  const [fecha, setFecha] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  async function manejarGuardar(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await graphqlRequest(MUTATION_REGISTRAR_MANTENIMIENTO, {
        datos: {
          vehiculoId: objetivoId,
          productoId: productoId || null,
          pedidoId: pedidoLigado && productoId ? pedidoLigado.id : null,
          fecha: fecha || null,
          kilometraje: kilometraje ? Number(kilometraje) : null,
          descripcion,
        },
      });
      refrescar();
      ir('cerrarModal');
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  if (!objetivoId) {
    return (
      <Capa titulo="Registrar servicio" onCerrar={() => ir('cerrarModal')}>
        <h3>Registrar servicio</h3>
        <p className="apagado">Primero elige un vehículo del garage.</p>
        <button className="btn btn-primario" onClick={() => ir('abrirSelectorVehiculo')}>
          Elegir vehículo
        </button>
      </Capa>
    );
  }

  return (
    <Capa titulo="Registrar servicio" onCerrar={() => ir('cerrarModal')}>
      <h3>Registrar servicio</h3>

      {pedidoLigado && (
        <p className="apagado" style={{ margin: 0 }}>
          Se anotará junto con el pedido N.º {pedidoLigado.id}, así queda el historial ligado a la compra.
        </p>
      )}

      <form className="formulario" onSubmit={manejarGuardar}>
        <div className="campo">
          <label htmlFor="mant-descripcion">Descripción</label>
          <input
            id="mant-descripcion"
            className="input"
            required
            value={descripcion}
            placeholder="Cambio de aceite y filtro"
            onChange={(evento) => setDescripcion(evento.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="mant-pieza">Pieza (opcional)</label>
          <select id="mant-pieza" className="input" value={productoId} onChange={(evento) => setProductoId(evento.target.value)}>
            <option value="">Sin pieza específica</option>
            {opciones.map((opcion) => (
              <option key={opcion.id} value={opcion.id}>
                {opcion.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="campos-2">
          <div className="campo">
            <label htmlFor="mant-km">Kilometraje (opcional)</label>
            <input
              id="mant-km"
              className="input"
              type="number"
              inputMode="numeric"
              value={kilometraje}
              onChange={(evento) => setKilometraje(evento.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="mant-fecha">Fecha (hoy por defecto)</label>
            <input id="mant-fecha" className="input" type="date" value={fecha} onChange={(evento) => setFecha(evento.target.value)} />
          </div>
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        <button className="btn btn-primario btn-bloque" type="submit" disabled={guardando}>
          {guardando ? (
            <>
              <Loader2 size={18} className="girar" /> Guardando…
            </>
          ) : (
            'Guardar en la bitácora'
          )}
        </button>
      </form>
    </Capa>
  );
}
