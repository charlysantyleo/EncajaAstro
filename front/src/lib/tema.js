// Tema claro / oscuro. Sin eleccion guardada se sigue la preferencia del sistema.
const CLAVE = 'encaja-tema';

export function temaActual() {
  if (typeof document === 'undefined') return 'claro';
  const elegido = document.documentElement.dataset.tema;
  if (elegido) return elegido;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
}

export function cambiarTema(tema) {
  document.documentElement.dataset.tema = tema;
  try {
    localStorage.setItem(CLAVE, tema);
  } catch {
    // modo privado: el tema dura solo esta visita
  }
}
