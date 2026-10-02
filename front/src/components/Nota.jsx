import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Truck, PartyPopper, X } from 'lucide-react';
import { useTienda } from '../store/useTienda';
import { ENVIO_GRATIS } from '../lib/formato';
import { Importe } from './ui/Movimiento';

// La nota: el carrito siempre a la vista junto al catálogo.
export default function Nota() {
  const carrito = useTienda((estado) => estado.carrito);
  const quitarDelCarrito = useTienda((estado) => estado.quitarDelCarrito);
  const ir = useTienda((estado) => estado.ir);

  const piezas = carrito.reduce((suma, item) => suma + item.cantidad, 0);
  const total = carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
  const avance = Math.min(1, total / ENVIO_GRATIS);
  const falta = Math.max(0, ENVIO_GRATIS - total);

  return (
    <aside className="nota" aria-label="Tu nota">
      <div className="nota-cab">
        <h4>Tu nota</h4>
        <span className="folio apagado">{piezas === 1 ? '1 pieza' : `${piezas} piezas`}</span>
      </div>

      {carrito.length === 0 ? (
        <p className="nota-vacia">Aún no agregas piezas. Cada una que elijas se anota aquí.</p>
      ) : (
        <ul className="nota-lineas">
          <AnimatePresence initial={false} mode="popLayout">
            {carrito.map((item) => (
              <motion.li
                key={item.productoId}
                layout
                className="nota-linea"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              >
                <span className="nota-linea-cant">{item.cantidad}×</span>
                <span className="nota-linea-nombre">{item.nombre}</span>
                <Importe className="nota-linea-importe" valor={item.precio * item.cantidad} />
                <button
                  className="btn-icono"
                  style={{ width: 28, height: 28 }}
                  onClick={() => quitarDelCarrito(item.productoId)}
                  aria-label={`Quitar ${item.nombre}`}
                >
                  <X size={16} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <div className={falta > 0 ? 'envio' : 'envio lleno'}>
        <div className="envio-riel" aria-hidden="true">
          <motion.div
            className="envio-barra"
            initial={false}
            animate={{ scaleX: avance }}
            transition={{ type: 'spring', stiffness: 160, damping: 24 }}
          />
        </div>
        <p className="envio-texto">
          {falta > 0 ? <Truck size={16} /> : <PartyPopper size={16} />}
          {carrito.length === 0
            ? 'Envío gratis desde $999 en la zona metropolitana de Guadalajara.'
            : falta > 0
              ? <span>Te faltan <Importe valor={falta} /> para el envío gratis.</span>
              : 'Tu pedido ya lleva envío gratis.'}
        </p>
      </div>

      <div className="nota-total">
        <span>Total</span>
        <strong>
          <Importe valor={total} />
        </strong>
      </div>

      <div className="nota-pie">
        <button className="btn btn-primario btn-bloque btn-isla" disabled={carrito.length === 0} onClick={() => ir('finalizarCompra')}>
          Ir a pagar
          <span className="btn-isla-icono" aria-hidden="true">
            <ArrowRight size={16} />
          </span>
        </button>
        <button className="btn btn-secundario btn-bloque" disabled={carrito.length === 0} onClick={() => ir('irACarrito')}>
          Revisar nota
        </button>
      </div>
    </aside>
  );
}
