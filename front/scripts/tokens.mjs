// Lee un token de color de src/styles/global.css (el primer :root, que es el tema claro).
// Lo usan astro.config.mjs (colores del manifiesto) y scripts/iconos-pwa.mjs (colores de los iconos), para que la
// PWA tome los colores del sistema de diseno en lugar de copiarlos a mano.
import { readFileSync } from 'node:fs';
import { tokenDe } from '../src/pwa/manifiesto.mjs';

const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf-8');

export const token = (nombre) => tokenDe(css, nombre);
