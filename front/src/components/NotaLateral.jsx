import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, X } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { useStockEnVivo } from '../store/useStockEnVivo';
import { useReglasDeEnvio } from '../hooks/useCatalogo';
import { useEnNavegador } from '../hooks/useEnNavegador';
import { ENVIO_GRATIS, pesos } from '../lib/formato';
import { Cantidad, Importe } from './ui/Movimiento';
import Skeleton from './Skeleton';

// La nota a la derecha del catalogo (pantallas anchas de la pagina de inicio): lo que lleva el cliente,
// con cantidades que se pueden ajustar sin pasar del stock, el avance al envio gratis y el boton para pagar.
// En pantallas angostas su lugar lo ocupa la franja fija de abajo (Nota.jsx).
export default function NotaLateral() {
  const enNavegador = useEnNavegador();
  const carrito = useTienda((estado) => estado.carrito);
  const cambiarCantidad = useTienda((estado) => estado.cambiarCantidad);
  const quitarDelCarrito = useTienda((estado) => estado.quitarDelCarrito);
  const ir = useTienda((estado) => estado.ir);
  const stockEnVivo = useStockEnVivo((estado) => estado.stock);
  const gratisDesde = useReglasDeEnvio().reglas?.gratisDesde ?? ENVIO_GRATIS;
  const reducido = useReducedMotion();

  // La nota vive en localStorage: el HTML del build no la conoce, asi que reserva el lugar.
  if (!enNavegador) {
    return (
      <section className="nota-lateral" aria-label="Tu nota" aria-busy="true">
        <Skeleton height={220} />
      </section>
    );
  }

  const piezas = carrito.reduce((suma, item) => suma + item.cantidad, 0);
  const total = carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
  const avance = gratisDesde > 0 ? Math.min(1, total / gratisDesde) : 1;
  const falta = Math.max(0, gratisDesde - total);

  return (
    <section className="nota-lateral" aria-labelledby="nota-lateral-titulo">
      <header className="nota-lateral-cabeza">
        <h2 id="nota-lateral-titulo">Tu nota</h2>
        <span className="mono apagado">
          {piezas} {piezas === 1 ? 'pieza' : 'piezas'}
        </span>
      </header>

      {carrito.length === 0 ? (
        <p className="nota-lateral-vacia">
          Todavía no llevas nada. Agrega piezas con el <strong>+</strong> de cada renglón y aquí verás tu cuenta.
        </p>
      ) : (
        <ul className="nota-lateral-lineas">
          <AnimatePresence initial={false} mode="popLayout">
            {carrito.map((item) => {
              // Tope: lo que diga el stock en vivo; si no, lo que habia al agregarla; si no se sabe, no se sube.
              const tope = stockEnVivo[item.productoId] ?? item.stock ?? item.cantidad;
              return (
                <motion.li
                  key={item.productoId}
                  layout
                  initial={reducido ? { opacity: 0 } : { opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                >
                  <span className="nota-lateral-foto" aria-hidden="true">
                    {item.imagen ? <img src={item.imagen} alt="" width="44" height="44" /> : item.nombre.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="nota-lateral-nombre">
                    {item.nombre}
                    {item.numeroParte && <span className="mono apagado">{item.numeroParte}</span>}
                  </span>
                  <button className="btn-icono" onClick={() => quitarDelCarrito(item.productoId)} aria-label={`Quitar ${item.nombre}`}>
                    <X size={16} />
                  </button>
                  <Cantidad
                    valor={item.cantidad}
                    min={1}
                    max={Math.max(1, tope)}
                    etiqueta={`Cantidad de ${item.nombre}`}
                    onCambio={(n) => cambiarCantidad(item.productoId, n)}
                  />
                  <Importe className="nota-lateral-importe" valor={item.precio * item.cantidad} />
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <footer className="nota-lateral-pie">
        <div className="nota-lateral-envio">
          <span className="nota-lateral-avance" aria-hidden="true">
            <motion.span initial={false} animate={{ scaleX: avance }} transition={{ type: 'spring', duration: 0.6, bounce: 0 }} />
          </span>
          <span className="apagado">
            {carrito.length === 0
              ? `Envío gratis desde ${pesos(gratisDesde)} en la zona metropolitana de Guadalajara.`
              : falta > 0
                ? `Te faltan ${pesos(falta)} para el envío gratis.`
                : 'Tu pedido ya lleva envío gratis.'}
          </span>
        </div>
        <div className="nota-lateral-total">
          <span>Total</span>
          <strong className="mono">
            <Importe valor={total} />
          </strong>
        </div>
        <button className="btn btn-primario btn-bloque" disabled={carrito.length === 0} onClick={() => ir('finalizarCompra')}>
          Ir a pagar
          <ArrowRight size={18} />
        </button>
      </footer>
    </section>
  );
}
