import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { Minus, Plus } from './Iconos';
import { pesos } from '../../lib/formato';

// Patrones de movimiento (motion): números con resorte, interruptor, cantidad, cinta pintada.

const RESORTE = { type: 'spring', stiffness: 420, damping: 30 };

export function Importe({ valor, className }) {
  const reducido = useReducedMotion();
  const mv = useMotionValue(valor);
  const texto = useTransform(mv, (v) => pesos(v));

  useEffect(() => {
    if (reducido) {
      mv.set(valor);
      return undefined;
    }
    const control = animate(mv, valor, { type: 'spring', stiffness: 140, damping: 22 });
    return () => control.stop();
  }, [valor, reducido, mv]);

  return <motion.span className={className}>{texto}</motion.span>;
}

// Numero entero que gira hacia arriba o abajo al cambiar (existencias en vivo, cantidades).
export function NumeroGiro({ valor, className }) {
  const anterior = useRef(valor);
  const sube = valor >= anterior.current;
  useEffect(() => {
    anterior.current = valor;
  }, [valor]);

  return (
    <span className={`numero-giro ${className ?? ''}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={valor}
          style={{ display: 'inline-block' }}
          initial={{ y: sube ? '70%' : '-70%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: sube ? '-70%' : '70%', opacity: 0 }}
          transition={RESORTE}
        >
          {valor}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Interruptor({ activo, onCambio, children }) {
  return (
    <button type="button" role="switch" aria-checked={activo} className="interruptor" onClick={() => onCambio(!activo)}>
      <span className="interruptor-riel">
        <motion.span layout transition={RESORTE} className="interruptor-pomo" />
      </span>
      {children}
    </button>
  );
}

export function Cantidad({ valor, min = 1, max = 999, onCambio, etiqueta = 'Cantidad' }) {
  return (
    <div className="cantidad" role="group" aria-label={etiqueta}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        disabled={valor <= min}
        aria-label="Quitar una pieza"
        onClick={() => onCambio(valor - 1)}
      >
        <Minus size={16} />
      </motion.button>
      <span className="cantidad-valor" aria-live="polite">
        <NumeroGiro valor={valor} />
      </span>
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        disabled={valor >= max}
        aria-label="Agregar una pieza"
        onClick={() => onCambio(valor + 1)}
      >
        <Plus size={16} />
      </motion.button>
    </div>
  );
}

// Marca de ajuste: un cuadro rojo que se dibuja (clip-path) junto a la palabra.
// tono: amarillo = ajuste directo (cuadro lleno), azul = equivalencia (cuadro hueco),
// rojo = agotado (gris tachado), verde = estado correcto. Los nombres de tono se conservan por compatibilidad.
const CLASE_TONO = { amarillo: 'directo', azul: 'equivalente', rojo: 'agotado', verde: 'correcto' };

export function Sello({ texto, tono = 'amarillo', retraso = 0, enLinea = false }) {
  const reducido = useReducedMotion();
  return (
    <span className={['sello', CLASE_TONO[tono] ?? 'directo', enLinea ? 'en-linea' : ''].filter(Boolean).join(' ')}>
      <motion.span
        className="sello-cuadro"
        aria-hidden="true"
        initial={reducido ? false : { clipPath: 'inset(0 100% 0 0)' }}
        animate={{ clipPath: 'inset(0 0% 0 0)' }}
        transition={{ duration: 0.35, ease: [0.77, 0, 0.175, 1], delay: retraso }}
      />
      {texto}
    </span>
  );
}

// Texto a escala de cartel que sube desde su linea base (nombre del vehiculo activo).
export function Pintado({ children, className, retraso = 0.05, como = 'span' }) {
  const reducido = useReducedMotion();
  const Elemento = motion[como];
  return (
    <Elemento
      className={className}
      initial={reducido ? false : { clipPath: 'inset(0 0 100% 0)', y: '0.12em' }}
      animate={{ clipPath: 'inset(0 0 -10% 0)', y: 0 }}
      transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: retraso }}
    >
      {children}
    </Elemento>
  );
}

// Aparece al entrar en pantalla, una sola vez, escalonado.
export function Aparece({ children, retraso = 0, y = 14, className, como = 'div' }) {
  const Elemento = motion[como];
  return (
    <Elemento
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -40px 0px' }}
      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1], delay: retraso }}
    >
      {children}
    </Elemento>
  );
}

// Marca un valor que cambió después del primer render y la sostiene hasta que el visitante
// la ve (hover o foco sobre la pieza): el color de alerta se queda hasta que lo notas.
export function useCambio(valor) {
  const primera = useRef(true);
  const [cambio, setCambio] = useState(false);
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    setCambio(true);
  }, [valor]);
  return [cambio, () => setCambio(false)];
}

export { RESORTE };
