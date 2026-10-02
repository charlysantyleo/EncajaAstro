import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Trash2, Truck, PartyPopper } from 'lucide-react';
import { useTienda } from '../store/useTienda';
import { graphqlRequest } from '../graphql/client';
import { QUERY_PRODUCTO_STOCK } from '../graphql/queries';
import { IMAGENES } from '../imagenes';
import { ENVIO_GRATIS } from '../lib/formato';
import { Cantidad, Importe } from './ui/Movimiento';

export default function CarritoView() {
  const carrito = useTienda((estado) => estado.carrito);
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const cambiarCantidad = useTienda((estado) => estado.cambiarCantidad);
  const quitarDelCarrito = useTienda((estado) => estado.quitarDelCarrito);
  const ir = useTienda((estado) => estado.ir);

  const [stockReal, setStockReal] = useState({});
  const [revisando, setRevisando] = useState(true);

  useEffect(() => {
    let sigueActivo = true;
    setRevisando(true);
    Promise.all(
      carrito.map((item) =>
        graphqlRequest(QUERY_PRODUCTO_STOCK, { id: item.productoId })
          .then((datos) => [item.productoId, datos.producto?.stock ?? 0])
          .catch(() => [item.productoId, null])
      )
    )
      .then((pares) => {
        if (sigueActivo) setStockReal(Object.fromEntries(pares));
      })
      .finally(() => {
        if (sigueActivo) setRevisando(false);
      });
    return () => {
      sigueActivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
  const piezas = carrito.reduce((suma, item) => suma + item.cantidad, 0);
  const falta = Math.max(0, ENVIO_GRATIS - total);
  const hayExcesos = carrito.some((item) => {
    const disponible = stockReal[item.productoId];
    return disponible != null && item.cantidad > disponible;
  });

  if (carrito.length === 0) {
    return (
      <div className="contenedor-medio">
        <motion.div className="vacio" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h2>Tu nota está vacía</h2>
          <p className="apagado">Agrega piezas desde el catálogo o desde la ficha de tu vehículo.</p>
          <button className="btn btn-primario" onClick={() => ir('irAHome')}>
            Ver catálogo
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="contenedor" style={{ maxWidth: 1180 }}>
      <button className="enlace-volver" onClick={() => ir('volver', { respaldo: '/' })}>
        <ArrowLeft size={18} /> Seguir comprando
      </button>

      <div className="encabezado-pagina">
        <h1>Tu nota</h1>
        {revisando && <span className="apagado">Revisando existencias…</span>}
      </div>

      <div className="carrito">
        <section className="hoja" aria-label="Piezas en tu nota">
          {vehiculoActivo && (
            <p className="apagado" style={{ marginBottom: 8 }}>
              Se validará la compatibilidad con tu {vehiculoActivo.marca} {vehiculoActivo.modelo} {vehiculoActivo.anio} al
              confirmar.
            </p>
          )}
          <ul className="lineas">
            <AnimatePresence initial={false} mode="popLayout">
              {carrito.map((item) => {
                const disponible = stockReal[item.productoId];
                const excede = disponible != null && item.cantidad > disponible;
                const imagen = item.numeroParte ? IMAGENES[item.numeroParte] : null;
                return (
                  <motion.li
                    key={item.productoId}
                    layout
                    className="linea"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  >
                    <span className="linea-foto">
                      {imagen ? <img src={imagen} alt="" width="72" height="72" style={{ objectFit: 'cover', width: '100%', height: '100%' }} /> : item.nombre.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <div className="linea-nombre">{item.nombre}</div>
                      {item.numeroParte && <div className="folio apagado">{item.numeroParte}</div>}
                      {excede && <p className="error" style={{ marginTop: 4 }}>Solo quedan {disponible} en existencia.</p>}
                    </div>
                    <Cantidad
                      valor={item.cantidad}
                      max={disponible ?? 999}
                      min={1}
                      onCambio={(n) => cambiarCantidad(item.productoId, n)}
                    />
                    <Importe className="linea-importe" valor={item.precio * item.cantidad} />
                    <button
                      className="btn-icono"
                      onClick={() => quitarDelCarrito(item.productoId)}
                      aria-label={`Quitar ${item.nombre}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </section>

        <aside className="nota" aria-label="Resumen">
          <div className="nota-cab">
            <h4>Resumen</h4>
            <span className="folio apagado">{piezas === 1 ? '1 pieza' : `${piezas} piezas`}</span>
          </div>
          <div className={falta > 0 ? 'envio' : 'envio lleno'}>
            <div className="envio-riel" aria-hidden="true">
              <motion.div
                className="envio-barra"
                initial={false}
                animate={{ scaleX: Math.min(1, total / ENVIO_GRATIS) }}
                transition={{ type: 'spring', stiffness: 160, damping: 24 }}
              />
            </div>
            <p className="envio-texto">
              {falta > 0 ? <Truck size={16} /> : <PartyPopper size={16} />}
              {falta > 0 ? <span>Te faltan <Importe valor={falta} /> para el envío gratis.</span> : 'Tu pedido ya lleva envío gratis.'}
            </p>
          </div>
          <div className="nota-total">
            <span>Total</span>
            <strong>
              <Importe valor={total} />
            </strong>
          </div>
          <div className="nota-pie">
            <button className="btn btn-primario btn-bloque btn-isla" disabled={hayExcesos} onClick={() => ir('finalizarCompra')}>
              Ir a pagar
              <span className="btn-isla-icono" aria-hidden="true">
                <ArrowRight size={16} />
              </span>
            </button>
            {hayExcesos && <p className="error">Ajusta las cantidades que superan las existencias.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
