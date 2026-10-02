import { AnimatePresence, motion } from 'motion/react';
import { NotebookPen, X } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { pesos } from '../lib/formato';
import { Sello } from './ui/Movimiento';

export default function PedidoConfirmado() {
  const pedido = useTienda((estado) => estado.pedidoConfirmado);
  const ir = useTienda((estado) => estado.ir);

  return (
    <AnimatePresence>
      {pedido && (
        <motion.section
          key={pedido.id}
          className="ticket"
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, height: 0, marginBottom: -24, paddingBlock: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 32 }}
        >
          <div className="ticket-cuerpo">
            <span className="ticket-folio">FOLIO N.º {pedido.id}</span>
            <h3 style={{ marginTop: 8 }}>
              Pedido registrado · {pesos(pedido.total)}
            </h3>
            <p className="ticket-detalle apagado">
              {pedido.detalles.map((detalle) => `${detalle.cantidad} × ${detalle.producto.nombre}`).join(', ')}
            </p>
            {pedido.vehiculo && (
              <button className="btn btn-secundario btn-chico" onClick={() => ir('abrirMantenimiento')}>
                <NotebookPen size={16} /> Anotar en la bitácora
              </button>
            )}
          </div>
          <div className="ticket-sello">
            <Sello texto={pedido.status} enLinea tono="verde" retraso={0.35} />
          </div>
          <button
            className="btn-icono"
            style={{ position: 'absolute', top: 8, right: 8 }}
            onClick={() => ir('cerrarConfirmacion')}
            aria-label="Cerrar confirmación"
          >
            <X size={18} />
          </button>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
