// /en/manifest.webmanifest, /fr/manifest.webmanifest...: el manifiesto de la PWA en cada idioma que no es el base
// (nombre, descripcion, lang y su inicio). El del idioma base lo genera @vite-pwa/astro. Base.astro enlaza el que toca.
import css from '../../styles/global.css?raw';
import { manifiesto, tokenDe } from '../../pwa/manifiesto.mjs';
import { datos, prefijo } from '../../i18n';
import { rutasDeManifiestos } from '../../lib/paginas';

export const getStaticPaths = rutasDeManifiestos;

export function GET({ props }) {
  const contenido = manifiesto(datos(props.idioma), prefijo(props.idioma), { rojo: tokenDe(css, 'rojo'), papel: tokenDe(css, 'papel') });
  return new Response(JSON.stringify(contenido), { headers: { 'Content-Type': 'application/manifest+json' } });
}
