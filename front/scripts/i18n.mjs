// Herramientas de idiomas (practica P3-4).
//
//   npm run i18n:nuevo fr      crea src/i18n/idiomas/fr.json a partir del idioma base, listo para traducir
//   npm run i18n:revisar       revisa que todos los idiomas tengan las mismas claves que el base, con las mismas
//                              {variables}, y que cada t('clave') del codigo exista; avisa lo que sigue sin traducir
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const carpeta = path.join(raiz, 'src', 'i18n', 'idiomas');
const leer = (codigo) => JSON.parse(readFileSync(path.join(carpeta, `${codigo}.json`), 'utf-8'));
const escribir = (codigo, datos) => writeFileSync(path.join(carpeta, `${codigo}.json`), `${JSON.stringify(datos, null, 2)}\n`);

// La lista de idiomas sale de astro.config.mjs (const IDIOMAS = [...]); el primero es el base.
const config = readFileSync(path.join(raiz, 'astro.config.mjs'), 'utf-8');
const IDIOMAS = JSON.parse(config.match(/const IDIOMAS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
const BASE = IDIOMAS[0];

function aplanar(objeto, previo = '', salida = {}) {
  for (const [clave, valor] of Object.entries(objeto ?? {})) {
    const completa = previo ? `${previo}.${clave}` : clave;
    if (valor && typeof valor === 'object') aplanar(valor, completa, salida);
    else salida[completa] = valor;
  }
  return salida;
}
const variables = (texto) => [...String(texto).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

const [orden, codigo] = process.argv.slice(2);

if (orden === 'nuevo') {
  if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(codigo ?? '')) {
    console.error('Uso: npm run i18n:nuevo <codigo>   (por ejemplo: fr, pt, de)');
    process.exit(1);
  }
  if (existsSync(path.join(carpeta, `${codigo}.json`))) {
    console.error(`Ya existe src/i18n/idiomas/${codigo}.json`);
    process.exit(1);
  }
  const base = leer(BASE);
  // Copia del idioma base: la tienda funciona desde ya (en el idioma base) mientras se traduce.
  escribir(codigo, {
    ...base,
    idioma: { nombre: `(${codigo}) por traducir`, locale: codigo, og: codigo },
    catalogo: { categorias: {}, productos: {}, notas: {}, reemplazos: {} },
  });
  console.log(`Listo: src/i18n/idiomas/${codigo}.json (copia de ${BASE}.json).

Siguientes pasos:
  1. Traduce los valores de "textos", "offline" y "app"; en "idioma" pon su nombre ("Français") y su locale ("fr-FR").
  2. En "rutas", los segmentos de URL en ese idioma (categoria, producto, carrito, busqueda).
  3. Opcional: en "catalogo", los nombres de sistemas y piezas (ver en.json como ejemplo).
  4. Agrega '${codigo}' a const IDIOMAS en astro.config.mjs.
  5. npm run i18n:revisar`);
  process.exit(0);
}

if (orden === 'revisar') {
  let errores = 0;
  const base = aplanar(leer(BASE).textos);
  const archivos = readdirSync(carpeta).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));

  for (const c of IDIOMAS) {
    if (!archivos.includes(c)) {
      console.log(`ERROR  ${c}: esta en astro.config.mjs pero falta src/i18n/idiomas/${c}.json`);
      errores++;
    }
  }
  for (const c of archivos.filter((a) => !IDIOMAS.includes(a))) console.log(`aviso  ${c}.json existe pero '${c}' no esta en IDIOMAS de astro.config.mjs (no se publica)`);

  for (const c of archivos.filter((a) => a !== BASE)) {
    const datos = leer(c);
    const textos = aplanar(datos.textos);
    const faltan = Object.keys(base).filter((k) => !(k in textos));
    const sobran = Object.keys(textos).filter((k) => !(k in base));
    const malasVariables = Object.keys(base).filter((k) => k in textos && variables(base[k]) !== variables(textos[k]));
    const sinTraducir = Object.keys(base).filter((k) => textos[k] === base[k] && /[a-záéíóúñ]{4,}/i.test(base[k]));
    for (const seccion of ['idioma', 'rutas', 'app', 'offline']) {
      if (!datos[seccion]) {
        console.log(`ERROR  ${c}: falta la seccion "${seccion}"`);
        errores++;
      }
    }
    if (faltan.length) console.log(`ERROR  ${c}: faltan ${faltan.length} claves: ${faltan.slice(0, 8).join(', ')}${faltan.length > 8 ? '…' : ''}`);
    if (sobran.length) console.log(`aviso  ${c}: ${sobran.length} claves que el idioma base no tiene: ${sobran.slice(0, 8).join(', ')}`);
    if (malasVariables.length) console.log(`ERROR  ${c}: {variables} distintas en: ${malasVariables.join(', ')}`);
    errores += faltan.length + malasVariables.length;
    console.log(`${c}: ${Object.keys(base).length - faltan.length}/${Object.keys(base).length} claves` + (sinTraducir.length ? ` · ${sinTraducir.length} iguales al ${BASE} (¿sin traducir?)` : ''));
  }

  // Cada t('clave') literal del codigo debe existir en el idioma base.
  const usadas = new Set();
  (function recorrer(dir) {
    for (const f of readdirSync(dir)) {
      const p = path.join(dir, f);
      if (statSync(p).isDirectory()) recorrer(p);
      else if (/\.(jsx?|astro|mjs)$/.test(f)) for (const m of readFileSync(p, 'utf-8').matchAll(/\b(?:t|traducir\(\w+,)\s*\(?'([a-zA-Z][\w]*(?:\.[\w]+)+)'/g)) usadas.add(m[1]);
    }
  })(path.join(raiz, 'src'));
  const inexistentes = [...usadas].filter((k) => !(k in base));
  if (inexistentes.length) {
    console.log(`ERROR  el codigo usa claves que ${BASE}.json no tiene: ${inexistentes.join(', ')}`);
    errores += inexistentes.length;
  }
  console.log(`${BASE} (base): ${Object.keys(base).length} claves · ${usadas.size} usadas literalmente en el codigo`);
  console.log(errores ? `\n${errores} error(es).` : '\nTodo en orden.');
  process.exit(errores ? 1 : 0);
}

console.log('Uso: npm run i18n:nuevo <codigo>  |  npm run i18n:revisar');
