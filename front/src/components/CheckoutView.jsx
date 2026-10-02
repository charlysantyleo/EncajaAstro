import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, TriangleAlert, Loader2 } from 'lucide-react';
import { useTienda } from '../store/useTienda';
import { graphqlRequest } from '../graphql/client';
import { MUTATION_REGISTRAR_PEDIDO } from '../graphql/queries';
import { pesos } from '../lib/formato';
import { Importe, Interruptor } from './ui/Movimiento';

export default function CheckoutView() {
  const carrito = useTienda((estado) => estado.carrito);
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const ir = useTienda((estado) => estado.ir);
  const sesion = useTienda((estado) => estado.sesion);

  const [nombre, setNombre] = useState(sesion?.usuario.nombre ?? '');
  const [email, setEmail] = useState(sesion?.usuario.email ?? '');
  const [usarVehiculo, setUsarVehiculo] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const total = carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0);

  async function manejarConfirmar(evento) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const datos = await graphqlRequest(MUTATION_REGISTRAR_PEDIDO, {
        datos: {
          cliente: { nombre, email },
          vehiculoId: usarVehiculo && vehiculoActivo ? vehiculoActivo.id : null,
          items: carrito.map((item) => ({ productoId: item.productoId, cantidad: item.cantidad })),
        },
      });
      ir('pedidoCreado', { pedido: datos.registrarPedido });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="contenedor" style={{ maxWidth: 1180 }}>
      <button className="enlace-volver" onClick={() => ir('irACarrito')}>
        <ArrowLeft size={18} /> Volver a la nota
      </button>

      <div className="encabezado-pagina">
        <h1>Finalizar compra</h1>
      </div>

      <div className="carrito">
        <form className="hoja formulario" onSubmit={manejarConfirmar}>
          <h4>Tus datos</h4>

          <div className="campos-2">
            <div className="campo">
              <label htmlFor="checkout-nombre">Nombre</label>
              <input
                id="checkout-nombre"
                className="input"
                required
                autoComplete="name"
                value={nombre}
                onChange={(evento) => setNombre(evento.target.value)}
              />
            </div>

            <div className="campo">
              <label htmlFor="checkout-email">Correo</label>
              <input
                id="checkout-email"
                className="input"
                required
                type="email"
                autoComplete="email"
                readOnly={Boolean(sesion)}
                title={sesion ? 'El pedido queda a nombre de tu cuenta' : undefined}
                value={email}
                onChange={(evento) => setEmail(evento.target.value)}
              />
            </div>
          </div>

          {vehiculoActivo && (
            <Interruptor activo={usarVehiculo} onCambio={setUsarVehiculo}>
              Validar compatibilidad con mi {vehiculoActivo.marca} {vehiculoActivo.modelo} {vehiculoActivo.anio}
            </Interruptor>
          )}

          <AnimatePresence>
            {error && (
              <motion.p
                className="aviso-fila"
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <TriangleAlert size={18} style={{ flex: 'none', marginTop: 2 }} /> {error}
              </motion.p>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-secundario" type="button" onClick={() => ir('irACarrito')}>
              Volver a la nota
            </button>
            <button className="btn btn-primario btn-isla" type="submit" disabled={enviando || carrito.length === 0}>
              {enviando ? 'Confirmando…' : 'Confirmar pedido'}
              <span className="btn-isla-icono" aria-hidden="true">
                {enviando ? <Loader2 size={16} className="girar" /> : <ArrowRight size={16} />}
              </span>
            </button>
          </div>
        </form>

        <aside className="nota" aria-label="Resumen del pedido">
          <div className="nota-cab">
            <h4>Resumen</h4>
          </div>
          <ul className="nota-lineas">
            {carrito.map((item) => (
              <li key={item.productoId} className="nota-linea" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
                <span className="nota-linea-cant">{item.cantidad}×</span>
                <span className="nota-linea-nombre">{item.nombre}</span>
                <span className="nota-linea-importe">{pesos(item.precio * item.cantidad)}</span>
              </li>
            ))}
          </ul>
          <div className="nota-total">
            <span>Total</span>
            <strong>
              <Importe valor={total} />
            </strong>
          </div>
        </aside>
      </div>
    </div>
  );
}
