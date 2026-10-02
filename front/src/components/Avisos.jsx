import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { useTienda } from '../store/useTienda';

// Aviso transitorio (patron Toast de beUI): sube con resorte y se va solo.
export default function Avisos() {
  const aviso = useTienda((estado) => estado.aviso);
  const ir = useTienda((estado) => estado.ir);

  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => ir('cerrarAviso'), 4200);
    return () => clearTimeout(t);
  }, [aviso, ir]);

  return (
    <div className="avisos" role="status" aria-live="polite">
      <AnimatePresence>
        {aviso && (
          <motion.div
            key={aviso.id}
            className="aviso-toast"
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 440, damping: 30 }}
          >
            <Check size={18} strokeWidth={2.6} />
            <span>{aviso.texto}</span>
            <button className="btn btn-texto btn-chico" onClick={() => ir('irACarrito')}>
              Ver nota
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
