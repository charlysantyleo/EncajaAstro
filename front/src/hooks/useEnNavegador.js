import { useSyncExternalStore } from 'react';

const sinCambios = () => () => {};

// false mientras React hidrata el HTML que Astro genero en el build; true en cuanto la isla ya vive
// en el navegador (y desde el primer render en las islas client:only, que no se hidratan).
// Sirve para lo que el build no puede saber: la URL, el tema y lo guardado en localStorage.
export function useEnNavegador() {
  return useSyncExternalStore(sinCambios, () => true, () => false);
}
