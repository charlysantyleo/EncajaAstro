// /en/manifest.webmanifest: el manifiesto de la PWA en ingles (nombre, descripcion, idioma y /en/ como inicio).
// Las paginas en ingles lo enlazan en lugar del de @vite-pwa/astro (ver layouts/Base.astro).
import css from '../../styles/global.css?raw';
import { manifiesto, tokenDe } from '../../pwa/manifiesto.mjs';

export function GET() {
  const datos = manifiesto('en', { rojo: tokenDe(css, 'rojo'), papel: tokenDe(css, 'papel') });
  return new Response(JSON.stringify(datos), { headers: { 'Content-Type': 'application/manifest+json' } });
}
