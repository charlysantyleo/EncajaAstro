import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { useTienda } from '../store/useTienda';
import { imagenDe } from '../imagenes';
import { ajusteDe } from '../lib/compat';
import { pesos } from '../lib/formato';
import { NumeroGiro, Sello, useCambio } from './ui/Movimiento';

export default function ProductoCard({ producto, indice = 0 }) {
  const ir = useTienda((estado) => estado.ir);
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const imagen = imagenDe(producto);
  const ajuste = ajusteDe(producto, vehiculoActivo?.id);
  const agotada = producto.stock <= 0;
  const [cambio, visto] = useCambio(producto.stock);
  const escalon = Math.min(indice, 11) * 0.045;

  return (
    <motion.article
      className={agotada ? 'pieza agotada' : 'pieza'}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: escalon }}
      whileHover={{ y: -3 }}
      onMouseEnter={cambio ? visto : undefined}
      onFocus={cambio ? visto : undefined}
    >
      <button className="pieza-abrir" onClick={() => ir('verProducto', { productoId: producto.id })}>
        <span className="pieza-foto">
          {imagen ? <img src={imagen} alt={producto.nombre} loading="lazy" /> : producto.nombre.slice(0, 2).toUpperCase()}
          {agotada ? (
            <Sello texto="Agotado" tono="rojo" retraso={0.3 + escalon} />
          ) : (
            ajuste && (
              <Sello
                texto={ajuste.tipo === 'DIRECTO' ? 'Embona' : 'Equivalente'}
                tono={ajuste.tipo === 'DIRECTO' ? 'amarillo' : 'azul'}
                retraso={0.3 + escalon}
              />
            )
          )}
        </span>
        <span className="pieza-nombre">{producto.nombre}</span>
        <span className="pieza-parte">
          {producto.marca ? `${producto.marca} · ` : ''}
          {producto.numeroParte}
        </span>
      </button>

      <div className="pieza-pie">
        <span className="pieza-precio">{pesos(producto.precio)}</span>
        <span
          className={['pieza-existencias', agotada ? 'cero' : '', cambio ? 'cambio' : ''].filter(Boolean).join(' ')}
          title={cambio ? 'Las existencias acaban de cambiar' : undefined}
        >
          <span className={cambio ? 'punto destello' : 'punto'} aria-hidden="true" />
          <NumeroGiro valor={producto.stock} /> {agotada ? 'sin existencias' : 'en stock'}
        </span>
        <button
          className="btn btn-secundario btn-chico pieza-agregar"
          disabled={agotada}
          onClick={() => ir('agregarAlCarrito', { producto, cantidad: 1 })}
        >
          <Plus size={16} />
          Agregar a la nota
        </button>
      </div>
    </motion.article>
  );
}
