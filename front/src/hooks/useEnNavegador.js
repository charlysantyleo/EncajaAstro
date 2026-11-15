import { useSyncExternalStore } from 'react';
import { useReducedMotion } from 'motion/react';

const sinCambios = () => () => {};

// false mientras React hidrata el HTML que Astro genero en el build; true en cuanto la isla ya vive
// en el navegador (y desde el primer render en las islas client:only, que no se hidratan).
// Sirve para lo que el build no puede saber: la URL, el tema y lo guardado en localStorage.
export function useEnNavegador() {
  return useSyncExternalStore(sinCambios, () => true, () => false);
}

// Un valor del store (que sale de localStorage) solo despues de hidratar: mientras tanto, el mismo valor que
// uso el build. Asi el primer render del navegador coincide con el HTML y React no tiene que tirarlo.
export function useDelNavegador(valor, comoEnElBuild) {
  return useEnNavegador() ? valor : comoEnElBuild;
}

// Animacion de entrada solo para lo que aparece ya en el navegador. Lo que viene en el HTML del build no se
// anima: si empezara invisible (opacity 0, clip-path), se quedaria oculto hasta que cargara React.
export function useAnimarEntrada() {
  const reducido = useReducedMotion();
  return useEnNavegador() && !reducido;
}
