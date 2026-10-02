import { motion } from 'motion/react';
import { TriangleAlert, RotateCw } from './ui/Iconos';
import Skeleton from './Skeleton';

export function Cargando({ filas = 3, alto = 60, columnas = false }) {
  return (
    <div
      role="status"
      aria-label="Cargando"
      style={{
        display: 'grid',
        gap: 12,
        gridTemplateColumns: columnas ? 'repeat(auto-fill, minmax(215px, 1fr))' : '1fr',
      }}
    >
      {Array.from({ length: filas }, (_, indice) => (
        <Skeleton key={indice} height={alto} />
      ))}
    </div>
  );
}

export function ErrorConReintento({ mensaje, onReintentar }) {
  return (
    <motion.div className="aviso-error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} role="alert">
      <p className="error" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <TriangleAlert size={18} /> {mensaje}
      </p>
      <button className="btn btn-secundario btn-chico" onClick={onReintentar}>
        <RotateCw size={16} /> Reintentar
      </button>
    </motion.div>
  );
}
