import { AnimatePresence, motion } from 'motion/react';
import { NotebookPen, X } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { pesos } from '../lib/formato';
import { rutas } from '../lib/rutas';
import { STATUS_PEDIDO } from '../lib/pagos';
import { Sello } from './ui/Movimiento';
import { useT } from '../i18n/react';

export default function PedidoConfirmado() {
  const pedido = useTienda((estado) => estado.pedidoConfirmado);
  const ir = useTienda((estado) => estado.ir);
  const t = useT();

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
            <span className="ticket-folio">{t('pedido.folio', { id: pedido.id })}</span>
            <h3 style={{ marginTop: 8 }}>
              {t('pedido.registrado')} · {pesos(pedido.total)}
            </h3>
            <p className="ticket-detalle apagado">
              {pedido.detalles.map((detalle) => `${detalle.cantidad} × ${detalle.producto.nombre}`).join(', ')}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {pedido.pago && (
                <a className="btn btn-secundario btn-chico" href={rutas.pago(pedido.pago.referencia)}>
                  {pedido.status === 'PENDIENTE' ? t('pedido.verComoPagar') : t('pedido.verPedido')}
                </a>
              )}
              {pedido.vehiculo && pedido.status !== 'CANCELADO' && (
                <button className="btn btn-secundario btn-chico" onClick={() => ir('abrirMantenimiento')}>
                  <NotebookPen size={16} /> {t('pedido.anotarBitacora')}
                </button>
              )}
            </div>
          </div>
          <div className="ticket-sello">
            <Sello texto={STATUS_PEDIDO[pedido.status] ? t(`pedido.estado.${pedido.status}`) : pedido.status} enLinea tono="verde" retraso={0.35} />
          </div>
          <button
            className="btn-icono"
            style={{ position: 'absolute', top: 8, right: 8 }}
            onClick={() => ir('cerrarConfirmacion')}
            aria-label={t('pedido.cerrarConfirmacion')}
          >
            <X size={18} />
          </button>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
