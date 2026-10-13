import { MotionConfig } from 'motion/react';

// Cada isla de Astro es una raiz de React aparte, asi que cada una necesita su propio MotionConfig
// para respetar prefers-reduced-motion en las animaciones de transform.
export function comoIsla(Componente) {
  return function Isla(props) {
    return (
      <MotionConfig reducedMotion="user">
        <Componente {...props} />
      </MotionConfig>
    );
  };
}
