import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { useTienda } from '../store/useTienda';
import { kilometros } from '../lib/formato';

export default function Bitacora({ mantenimientos }) {
  const ir = useTienda((estado) => estado.ir);

  return (
    <section className="hoja">
      <div className="hoja-titulo">
        <h4>Bitácora</h4>
        <button className="btn btn-texto btn-chico" onClick={() => ir('abrirMantenimiento')}>
          <Plus size={16} strokeWidth={2.6} /> Registrar servicio
        </button>
      </div>

      {(!mantenimientos || mantenimientos.length === 0) && (
        <p className="apagado">Aún no hay servicios registrados para este vehículo.</p>
      )}

      {mantenimientos && mantenimientos.length > 0 && (
        <ul className="bitacora">
          {mantenimientos.map((registro, indice) => (
            <motion.li
              key={registro.id}
              className="bitacora-fila"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + indice * 0.06, type: 'spring', stiffness: 320, damping: 28 }}
            >
              <div className="bitacora-fecha">{registro.fecha}</div>
              <div className="bitacora-desc">{registro.descripcion}</div>
              <div className="apagado">
                {registro.producto?.nombre ? `${registro.producto.nombre} · ` : ''}
                {kilometros(registro.kilometraje) ?? 'sin kilometraje'}
              </div>
              {registro.pedido && <span className="etiqueta">Pedido N.º {registro.pedido.id}</span>}
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
