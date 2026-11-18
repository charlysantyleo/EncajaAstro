// Lee un token de color de src/styles/global.css (el primer :root, que es el tema claro).
// Lo usan astro.config.mjs (colores del manifiesto) y scripts/iconos-pwa.mjs (colores de los iconos), para que la
// PWA tome los colores del sistema de diseno en lugar de copiarlos a mano.
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf-8');
const raiz = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));

export function token(nombre) {
  const valor = raiz.match(new RegExp(`--${nombre}:\\s*(#[0-9a-fA-F]{3,8})\\b`))?.[1];
  if (!valor) throw new Error(`No encontre el token --${nombre} en global.css`);
  return valor.toLowerCase();
}
