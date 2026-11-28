import { MotionConfig } from 'motion/react';
import { IdiomaContext } from '../../i18n/react';
import { idiomaDelDocumento } from '../../i18n';

// Cada isla de Astro es una raiz de React aparte, asi que cada una necesita su propio MotionConfig
// para respetar prefers-reduced-motion en las animaciones de transform, y su propio idioma (prop `idioma` que
// manda la pagina; sin ella, el lang de <html>).
export function comoIsla(Componente) {
  return function Isla(props) {
    return (
      <IdiomaContext.Provider value={props.idioma ?? idiomaDelDocumento()}>
        <MotionConfig reducedMotion="user">
          <Componente {...props} />
        </MotionConfig>
      </IdiomaContext.Provider>
    );
  };
}
