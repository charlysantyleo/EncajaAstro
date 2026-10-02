import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ChevronsUpDown, X } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { ENVIO_GRATIS, pesos } from '../lib/formato';
import { Importe } from './ui/Movimiento';

// La nota: franja fija al pie con piezas, total y avance al envio gratis.
// Se despliega hacia arriba para ver y quitar renglones sin salir del catalogo.
export default function Nota() {
  const carrito = useTienda((estado) => estado.carrito);
  const quitarDelCarrito = useTienda((estado) => estado.quitarDelCarrito);
  const ir = useTienda((estado) => estado.ir);
  const reducido = useReducedMotion();
  const [abierta, setAbierta] = useState(false);

  const piezas = carrito.reduce((suma, item) => suma + item.cantidad, 0);
  const total = carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
  const avance = Math.min(1, total / ENVIO_GRATIS);
  const falta = Math.max(0, ENVIO_GRATIS - total);

  useEffect(() => {
    if (carrito.length === 0) setAbierta(false);
  }, [carrito.length]);

  useEffect(() => {
    if (!abierta) return undefined;
    const tecla = (evento) => evento.key === 'Escape' && setAbierta(false);
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [abierta]);

  return (
    <aside className={abierta ? 'nota-franja abierta' : 'nota-franja'} aria-label="Tu nota">
      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div
            id="nota-detalle"
            className="nota-detalle"
            initial={reducido ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducido ? { opacity: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <ul className="nota-lineas">
              <AnimatePresence initial={false} mode="popLayout">
                {carrito.map((item) => (
                  <motion.li
                    key={item.productoId}
                    layout
                    className="nota-linea"
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <span className="nota-linea-cant">{item.cantidad}×</span>
                    <span className="nota-linea-nombre">
                      {item.nombre}
                      {item.numeroParte && <span className="mono"> {item.numeroParte}</span>}
                    </span>
                    <span className="nota-linea-importe">{pesos(item.precio * item.cantidad)}</span>
                    <button
                      className="btn-icono"
                      onClick={() => quitarDelCarrito(item.productoId)}
                      aria-label={`Quitar ${item.nombre}`}
                    >
                      <X size={16} />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="nota-barra">
        <span className="nota-envio" aria-hidden="true">
          <motion.span
            className="nota-envio-avance"
            initial={false}
            animate={{ scaleX: avance }}
            transition={{ type: 'spring', duration: 0.6, bounce: 0 }}
          />
        </span>

        <button
          type="button"
          className="nota-resumen"
          disabled={carrito.length === 0}
          aria-expanded={abierta}
          aria-controls="nota-detalle"
          onClick={() => setAbierta((valor) => !valor)}
        >
          <span className="nota-titulo">Nota</span>
          <span className="nota-piezas mono">{piezas}</span>
          <span className="nota-estado">
            {carrito.length === 0
              ? 'Vacía. Envío gratis desde $999 en la zona metropolitana de Guadalajara.'
              : falta > 0
                ? `Te faltan ${pesos(falta)} para el envío gratis.`
                : 'Tu pedido ya lleva envío gratis.'}
          </span>
          {carrito.length > 0 && <ChevronsUpDown size={16} />}
        </button>

        <strong className="nota-total mono">
          <Importe valor={total} />
        </strong>

        <button className="btn btn-primario nota-pagar" disabled={carrito.length === 0} onClick={() => ir('finalizarCompra')}>
          Ir a pagar
          <ArrowRight size={18} />
        </button>
      </div>
    </aside>
  );
}
