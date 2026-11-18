// Genera los iconos de la PWA a partir del isotipo, con los colores de los tokens de src/styles/global.css.
//   node scripts/iconos-pwa.mjs
//
//   public/pwa-192x192.png            "any": cuadro rojo redondeado (asi se ve en el escritorio y la barra de tareas)
//   public/pwa-512x512.png            "any", 512
//   public/maskable-icon-512x512.png  "maskable": rojo a sangre (sin esquinas transparentes); el sistema lo recorta
//                                     en circulo, gota o cuadro, asi que el logo va dentro del 80% central
//   public/apple-touch-icon.png       180x180 a sangre: iOS no usa el manifiesto y redondea el icono por su cuenta
import sharp from 'sharp';
import { token } from './tokens.mjs';

// Tokens de diseno (global.css, tema claro).
const ROJO = token('rojo'); // #e10600
const TINTA = token('tinta'); // #0e0e0e
const BLANCO = token('superficie'); // #ffffff

// Isotipo medido sobre el icono original de 512 px: bloque negro con la muesca y la "H" blanca encajada.
// Ocupa x 117-395 e y 152-360 (278 x 208), centrado en (256, 256).
const ISOTIPO = `
  <path fill="${TINTA}" d="M117 152H298V221H242V291H298V360H117Z"/>
  <path fill="${BLANCO}" d="M312 152H395V360H312V277H256V235H312Z"/>`;

const svg = ({ redondeado }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" ${redondeado ? 'rx="96"' : ''} fill="${ROJO}"/>${ISOTIPO}
</svg>`;

const iconos = [
  { archivo: 'public/pwa-192x192.png', lado: 192, redondeado: true },
  { archivo: 'public/pwa-512x512.png', lado: 512, redondeado: true },
  { archivo: 'public/maskable-icon-512x512.png', lado: 512, redondeado: false },
  { archivo: 'public/apple-touch-icon.png', lado: 180, redondeado: false },
];

for (const { archivo, lado, redondeado } of iconos) {
  await sharp(Buffer.from(svg({ redondeado })), { density: 72 * (lado / 512) * 4 })
    .resize(lado, lado)
    .png({ compressionLevel: 9 })
    .toFile(archivo);
  console.log(archivo, `${lado}x${lado}`);
}

// Comprobacion de la zona segura del maskable: el circulo de radio 40% (204.8 px en 512) debe contener el logo.
const mitadDiagonal = Math.hypot((395 - 117) / 2, (360 - 152) / 2);
console.log(`maskable: el logo llega a ${mitadDiagonal.toFixed(1)} px del centro (zona segura: 204.8 px)`);
