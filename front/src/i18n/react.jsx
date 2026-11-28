import { createContext, useContext, useMemo } from 'react';
import { idiomaDelDocumento, traducir, traducirMensaje } from './index';
import { rutasPara } from '../lib/rutas';

// Cada isla de Astro es una raiz de React aparte: comoIsla (ui/Isla.jsx) pone este contexto con el idioma que le
// pasa la pagina (prop `idioma`). Asi el HTML del build y el navegador pintan el mismo idioma.
export const IdiomaContext = createContext(null);

export function useIdioma() {
  return useContext(IdiomaContext) ?? idiomaDelDocumento();
}

// const t = useT();
//   t('comun.yaLlevas', { n: 2 })   texto de la interfaz por su clave (src/i18n/idiomas/<idioma>.json)
//   t.mensaje(error)               mensaje que llega escrito en el idioma base (service worker, servidor)
export function useT() {
  const idioma = useIdioma();
  return useMemo(() => {
    const t = (clave, variables) => traducir(idioma, clave, variables);
    t.mensaje = (mensaje) => traducirMensaje(idioma, mensaje);
    return t;
  }, [idioma]);
}

// Las rutas publicas en el idioma de la pagina (/en/category/brakes/ ...).
export function useRutas() {
  return rutasPara(useIdioma());
}
