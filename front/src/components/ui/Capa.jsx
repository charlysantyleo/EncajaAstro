import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X } from './Iconos';

// Dialogo centrado o cajon lateral (patrones Modal / Drawer de beUI):
// entra y sale con resorte (AnimatePresence en Shell), Esc cierra, el foco queda dentro.
export default function Capa({ lado = 'centro', titulo, onCerrar, children }) {
  const panel = useRef(null);
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  useEffect(() => {
    const previo = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();

    function tecla(evento) {
      if (evento.key === 'Escape') return cerrar.current();
      if (evento.key !== 'Tab' || !panel.current) return undefined;
      const foco = panel.current.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex="0"]');
      if (foco.length === 0) return undefined;
      const primero = foco[0];
      const ultimo = foco[foco.length - 1];
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
      return undefined;
    }

    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('keydown', tecla);
      document.body.style.overflow = overflow;
      if (previo instanceof HTMLElement) previo.focus();
    };
  }, []);

  const lateral = lado === 'derecha';

  return createPortal(
    <motion.div
      className={`capa-fondo ${lado}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCerrar();
      }}
    >
      <motion.div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`capa-panel ${lado}`}
        initial={lateral ? { x: '100%' } : { opacity: 0, y: 28, scale: 0.96 }}
        animate={lateral ? { x: 0 } : { opacity: 1, y: 0, scale: 1 }}
        exit={lateral ? { x: '100%' } : { opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      >
        <button className="btn-icono capa-cerrar" onClick={onCerrar} aria-label="Cerrar">
          <X size={20} strokeWidth={2.2} />
        </button>
        {children}
      </motion.div>
    </motion.div>,
    document.body
  );
}
