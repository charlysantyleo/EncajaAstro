import { createContext, useCallback, useContext } from 'react';
import { idiomaDelDocumento } from './idiomas';
import { traducir } from './textos';
import { rutasPara } from '../lib/rutas';

// Cada isla de Astro es una raiz de React aparte: comoIsla (ui/Isla.jsx) pone este contexto con el idioma que le
// pasa la pagina (prop `idioma`). Asi el HTML del build y el navegador pintan el mismo idioma.
export const IdiomaContext = createContext(null);

export function useIdioma() {
  return useContext(IdiomaContext) ?? idiomaDelDocumento();
}

// t('Agregar a la nota') -> 'Add to note' en ingles. El texto en espanol es la clave (ver textos.js).
export function useT() {
  const idioma = useIdioma();
  return useCallback((texto, variables) => traducir(idioma, texto, variables), [idioma]);
}

// Las rutas publicas en el idioma de la pagina (/en/category/brakes/ ...).
export function useRutas() {
  return rutasPara(useIdioma());
}
