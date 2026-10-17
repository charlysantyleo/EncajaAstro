// Arma back/datos/vehiculos.json, el catalogo de vehiculos que se venden en Mexico, cruzando tres fuentes gratuitas:
//
//   1. INEGI (RAIAVL): ventas mensuales en Mexico por marca y modelo desde 2005. Dice QUE modelos llegaron
//      a Mexico y EN QUE AÑOS se vendieron. Es la base: un modelo que nunca se vendio aqui no entra.
//   2. NHTSA vPIC: los nombres oficiales de cada modelo y su marca real (INEGI los escribe a su manera:
//      "Sentra 4 PTS", "General Motors" en lugar de Chevrolet o GMC...).
//   3. FuelEconomy.gov: los motores (cilindrada y cilindros) de cada modelo y año, y que modelos existian antes
//      de 2005 para completar esos años en los modelos que ya se vendian en Mexico cuando INEGI empezo a contar.
//
// Lo que ninguna fuente trae (modelos solo de Mexico antes de 2005, motores de marcas que no se venden en
// EE. UU.) se agrega a mano desde el panel (Panel → Vehiculos).
//
// Uso:  node scripts/vehiculos/armar-catalogo.js [--desde 1990] [--cache <carpeta>]
// Se corre de vez en cuando (por ejemplo, una vez al año) y el JSON resultante se sube al repositorio;
// despues "npm run db:vehiculos" lo carga a la base. Las respuestas se guardan en la carpeta de cache,
// asi que repetirlo no vuelve a descargar nada.
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { inflateRawSync } from 'zlib';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SALIDA = path.join(AQUI, '..', '..', 'datos', 'vehiculos.json');

const argumentos = process.argv.slice(2);
const opcion = (nombre, porDefecto) => {
  const i = argumentos.indexOf(`--${nombre}`);
  return i >= 0 ? argumentos[i + 1] : porDefecto;
};
const DESDE = Number(opcion('desde', 1990));
const HASTA = new Date().getFullYear() + 1;
const CACHE = opcion('cache', path.join(tmpdir(), 'encaja-vehiculos-cache'));
// Un modelo con menos ventas que esto en todo el registro se considera ruido (importaciones sueltas).
const VENTAS_MINIMAS = 150;

const URL_INEGI = 'https://www.inegi.org.mx/contenidos/datosprimarios/iavl/datosabiertos/conjunto_de_datos_raiavl_mensual_venta_csv.zip';
const NHTSA = 'https://vpic.nhtsa.dot.gov/api/vehicles';
const FUEL = 'https://www.fueleconomy.gov/ws/rest';

// ---------------------------------------------------------------------------------------------
// Descargas con cache en disco y pocas a la vez

mkdirSync(CACHE, { recursive: true });

async function descargar(url, { binario = false, json = false } = {}) {
  const archivo = path.join(CACHE, createHash('sha1').update(url).digest('hex') + (binario ? '.bin' : '.txt'));
  if (existsSync(archivo)) return leerCache(archivo, binario, json);
  for (let intento = 1; ; intento++) {
    try {
      const respuesta = await fetch(url, { headers: { Accept: json ? 'application/json' : '*/*' } });
      if (respuesta.status === 404 || respuesta.status === 204) {
        writeFileSync(archivo, '');
        return leerCache(archivo, binario, json);
      }
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      writeFileSync(archivo, Buffer.from(await respuesta.arrayBuffer()));
      return leerCache(archivo, binario, json);
    } catch (error) {
      // NHTSA responde 403 cuando se le pregunta muy seguido: se espera cada vez mas antes de reintentar.
      if (intento >= 6) throw new Error(`No se pudo descargar ${url}: ${error.message}`);
      await new Promise((listo) => setTimeout(listo, 4000 * intento));
    }
  }
}

function leerCache(archivo, binario, json) {
  const datos = readFileSync(archivo);
  if (binario) return datos;
  const texto = datos.toString('utf8');
  if (!json) return texto;
  return texto.trim() ? JSON.parse(texto) : null;
}

async function enParalelo(tareas, cuantas = 8) {
  const resultados = new Array(tareas.length);
  let siguiente = 0;
  let hechas = 0;
  async function trabajador() {
    while (siguiente < tareas.length) {
      const i = siguiente++;
      resultados[i] = await tareas[i]();
      if (++hechas % 250 === 0) process.stdout.write(`  ${hechas}/${tareas.length}\n`);
    }
  }
  await Promise.all(Array.from({ length: cuantas }, trabajador));
  return resultados;
}

// ---------------------------------------------------------------------------------------------
// INEGI: un zip con un CSV por año. Lector de zip minimo (directorio central + inflate), sin dependencias.

function archivosDelZip(zip) {
  let fin = zip.length - 22;
  while (fin >= 0 && zip.readUInt32LE(fin) !== 0x06054b50) fin--;
  if (fin < 0) throw new Error('El archivo del INEGI no es un zip valido');
  const total = zip.readUInt16LE(fin + 10);
  let p = zip.readUInt32LE(fin + 16);
  const archivos = new Map();
  for (let n = 0; n < total; n++) {
    const metodo = zip.readUInt16LE(p + 10);
    const comprimido = zip.readUInt32LE(p + 20);
    const largoNombre = zip.readUInt16LE(p + 28);
    const largoExtra = zip.readUInt16LE(p + 30);
    const largoComentario = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const nombre = zip.toString('utf8', p + 46, p + 46 + largoNombre);
    const inicio = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const crudo = zip.subarray(inicio, inicio + comprimido);
    archivos.set(nombre, () => (metodo === 0 ? crudo : inflateRawSync(crudo)));
    p += 46 + largoNombre + largoExtra + largoComentario;
  }
  return archivos;
}

// El CSV mezcla codificaciones: unas columnas vienen en UTF-8 y otras en Windows-1252.
function texto(campoLatin1) {
  const utf8 = Buffer.from(campoLatin1, 'latin1').toString('utf8');
  return utf8.includes('�') ? campoLatin1 : utf8;
}

function filasCsv(contenido) {
  const lineas = contenido.toString('latin1').split(/\r?\n/).filter(Boolean);
  const partir = (linea) => {
    const campos = [];
    let actual = '';
    let entreComillas = false;
    for (const c of linea) {
      if (c === '"') entreComillas = !entreComillas;
      else if (c === ',' && !entreComillas) {
        campos.push(actual);
        actual = '';
      } else actual += c;
    }
    campos.push(actual);
    return campos;
  };
  const encabezado = partir(lineas[0]);
  return lineas.slice(1).map((linea) => Object.fromEntries(partir(linea).map((valor, i) => [encabezado[i], texto(valor)])));
}

async function ventasDelInegi() {
  console.log('INEGI: descargando las ventas por modelo…');
  const archivos = archivosDelZip(await descargar(URL_INEGI, { binario: true }));
  const ventas = new Map(); // "marca|modelo" -> { marca, modelo, anios:Set, unidades }
  for (const [nombre, leer] of archivos) {
    if (!/conjunto_de_datos\/.*\.csv$/i.test(nombre)) continue;
    for (const fila of filasCsv(leer())) {
      const unidades = Number(fila.UNI_VEH);
      if (!(unidades > 0)) continue;
      const clave = `${fila.MARCA}|${fila.MODELO}`;
      const venta = ventas.get(clave) ?? { marca: fila.MARCA.trim(), modelo: fila.MODELO.trim(), anios: new Set(), unidades: 0 };
      venta.anios.add(Number(fila.ANIO));
      venta.unidades += unidades;
      ventas.set(clave, venta);
    }
  }
  console.log(`INEGI: ${ventas.size} combinaciones de marca y modelo.`);
  return [...ventas.values()];
}

// ---------------------------------------------------------------------------------------------
// Marcas: INEGI agrupa por empresa ("General Motors", "Chrysler"); aqui se reparten en las marcas reales.

const MARCAS_DE_EMPRESA = {
  'General Motors': { candidatas: ['Chevrolet', 'GMC', 'Buick', 'Cadillac', 'Hummer', 'Pontiac', 'Saab', 'Saturn'], porDefecto: 'Chevrolet' },
  Chrysler: { candidatas: ['Dodge', 'Chrysler', 'Jeep', 'Ram'], porDefecto: 'Dodge' },
  'Ford Motor': { candidatas: ['Ford', 'Lincoln', 'Mercury'], porDefecto: 'Ford' },
  Nissan: { candidatas: ['Nissan', 'Infiniti'], porDefecto: 'Nissan' },
  SEAT: { candidatas: ['SEAT', 'Cupra'], porDefecto: 'SEAT' },
  KIA: { candidatas: ['Kia'], porDefecto: 'Kia' },
  'Mercedes Benz': { candidatas: ['Mercedes-Benz'], porDefecto: 'Mercedes-Benz' },
  'MG Motor': { candidatas: ['MG'], porDefecto: 'MG' },
  'Great Wall Motor': { candidatas: ['Great Wall'], porDefecto: 'Great Wall' },
  'Jetour Soueast': { candidatas: ['Jetour'], porDefecto: 'Jetour' },
  JETOUR: { candidatas: ['Jetour'], porDefecto: 'Jetour' },
  'Lynk&Co': { candidatas: ['Lynk & Co'], porDefecto: 'Lynk & Co' },
  Mini: { candidatas: ['MINI'], porDefecto: 'MINI' },
  // Motornation importa varias marcas chinas: la marca es la primera palabra del modelo.
  MOTORNATION: { candidatas: ['BAIC', 'Changan', 'DFSK', 'JMC', 'SERES'], porDefecto: null },
};
// Otras formas en que la marca aparece escrita dentro del nombre del modelo.
const OTROS_NOMBRES_DE_MARCA = { vw: 'Volkswagen', infinity: 'Infiniti', chevrolet: 'Chevrolet', cupra: 'Cupra' };

// Correcciones puntuales: clave "EMPRESA|modelo normalizado" (sin la marca al inicio).
// null descarta el modelo (variantes de chasis o nombres que no son un modelo).
const CORRECCIONES = {
  'Volkswagen|sedan': { modelo: 'Sedán' },
  'Nissan|xtrail': { modelo: 'X-Trail' },
  'Toyota|lcruiser': { modelo: 'Land Cruiser' },
  'Toyota|fjcruiser': { modelo: 'FJ Cruiser' },
  'Chrysler|jt': { marca: 'Jeep', modelo: 'Gladiator' },
  'Chrysler|crewcab': null,
  'Chrysler|quadcab': null,
  'Chrysler|megacab': null,
  'General Motors|147': { marca: 'Alfa Romeo', modelo: '147' },
  'General Motors|156': { marca: 'Alfa Romeo', modelo: '156' },
  'MOTORNATION|startruck': null,
  'Volkswagen|sportvan': { modelo: 'SportVan' },
  'Ford Motor|clubwagon': { modelo: 'Club Wagon' },
  'General Motors|bls4ptas': { marca: 'Cadillac', modelo: 'BLS' },
};
// Correcciones por patron, para modelos que INEGI escribe de varias formas.
const CORRECCIONES_POR_PATRON = [
  ['General Motors', /^palio/i, { marca: 'Fiat', modelo: 'Palio' }],
  ['Nissan', /^almera/i, { modelo: 'Almera' }],
  ['Nissan', /^cabstar/i, { modelo: 'Cabstar' }],
  ['Nissan', /^nv2500/i, { modelo: 'NV2500' }],
  ['Volkswagen', /^cross ?sport/i, { modelo: 'Cross Sport' }],
  ['Fiat', /^palio(?! adventure)/i, { modelo: 'Palio' }],
  ['Fiat', /^panda/i, { modelo: 'Panda' }],
  ['Renault', /^traffic/i, { modelo: 'Traffic' }],
];
const NOMBRES_DE_MARCA = { 'MG ROVER': 'MG Rover' };

// Modelos que solo se vendieron en Mexico y ya existian antes de 2005, cuando INEGI empezo a contar: ninguna
// fuente gratuita trae esos años. Los motores se dejan vacios (el garage ofrece la lista general).
const ANIOS_PREVIOS_A_INEGI = [
  ['Nissan', 'Tsuru', 1992],
  ['Nissan', 'Platina', 2002],
  ['Volkswagen', 'Sedán', 1990, 2003],
  ['Volkswagen', 'Pointer', 1997],
  ['Chevrolet', 'Chevy', 1994],
];
const DESCARTAR = /^(chasis|chassis|estacas|brightdrop|kodiak|p-?30)\b/i;

const sinAcentos = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const normal = (s) => sinAcentos(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const palabras = (s) => s.split(/[\s\-/]+/).filter(Boolean);

// Palabras que en INEGI describen la carroceria, la cabina o la transmision y no el modelo.
const RUIDO = [
  /\b\d\s*(ptas?|pts?|puertas|p|dr)\b\.?/gi,
  /\b(cabina regular|doble cabina|cabina extendida|crew cab|regular cab|chassis cab|chasis cabina|chasis|chassis)\b/gi,
  /\b(sed[aá]n|hatchback|hatch|hb|coupe|conv|convertible|cabrio|sw|break|monocab|wagon|pickup|van|cargo|carga|pasajeros|passenger|cutaway|panel|vp)\b/gi,
  /\b(suv|uuv|sut|diesel|tdi|hdi|hev|phev|idd|hibrido|híbrido|hybrid|4x4|4x2|awd|larga|largo|toldo alto|toldo bajo|std|king cab)\b/gi,
  /\b(nuevo|nueva|new|ng|ii|ta|tm|cc|dc|sc|7 p|7 plazas|l4|v4|v6|v8|gt|rs|r\.s\.?|sport|renault|cupra|rc|el[eé]ctrico|e-? ?tech|mediano|small)\b/gi,
  /\b\d\.\d\b/g,
  /\bclass \d.*$/gi,
];

function limpiar(modelo) {
  let limpio = ` ${modelo} `;
  for (const patron of RUIDO) limpio = limpio.replace(patron, ' ');
  limpio = limpio.replace(/[-.]+(\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
  // "Hiace P" / "Hiace V": una letra suelta al final es la version, no el modelo.
  limpio = limpio.replace(/\s+[A-Za-z]$/, '');
  // "SPORTAGE" -> "Sportage"; "cx-5" se queda para que el nombre oficial lo corrija.
  return limpio
    .split(' ')
    .map((p) => (/^[A-ZÁÉÍÓÚ]{4,}$/.test(p) ? p[0] + p.slice(1).toLowerCase() : /^[a-z]/.test(p) ? p[0].toUpperCase() + p.slice(1) : p))
    .join(' ');
}

// ---------------------------------------------------------------------------------------------
// NHTSA: nombres oficiales de los modelos de cada marca.

async function modelosNhtsa(marca) {
  const datos = await descargar(`${NHTSA}/GetModelsForMake/${encodeURIComponent(marca)}?format=json`, { json: true });
  const propios = (datos?.Results ?? []).filter((r) => normal(r.Make_Name) === normal(marca));
  return [...new Set(propios.map((r) => r.Model_Name.trim()))];
}

// El nombre oficial mas largo que sea el inicio del nombre de INEGI ("Frontier V6" -> "Frontier").
function nombreOficial(modeloInegi, oficiales) {
  const tokens = palabras(modeloInegi);
  let mejor = null;
  for (let k = tokens.length; k >= 1 && !mejor; k--) {
    const prefijo = normal(tokens.slice(0, k).join(''));
    mejor = oficiales.find((o) => normal(o.modelo) === prefijo) ?? null;
  }
  return mejor;
}

// ---------------------------------------------------------------------------------------------
// FuelEconomy.gov: motores por año, marca y modelo.

const SUFIJOS_FUEL = new Set(
  '2wd 4wd awd fwd rwd ffv hybrid hev phev cng sedan hatchback wagon coupe convertible cabriolet roadster pickup cab chassis van sport turbo diesel hd lwb swb 2dr 4dr 5dr 3dr 1500 2500 3500 plugin'.split(' ')
);

async function listaFuel(url) {
  const datos = await descargar(url, { json: true });
  const items = datos?.menuItem ?? [];
  return Array.isArray(items) ? items : [items];
}

function motorDeOpcion(textoOpcion, esHibrido) {
  const cilindros = textoOpcion.match(/(\d+)\s*cyl/i)?.[1];
  const litros = textoOpcion.match(/([\d.]+)\s*L\b/)?.[1];
  if (!cilindros || !litros) return /electric|\(A1\)/i.test(textoOpcion) ? 'Eléctrico' : null;
  let motor = `${Number(litros).toFixed(1)}L ${cilindros} cil.`;
  if (/turbo/i.test(textoOpcion)) motor += ' turbo';
  if (esHibrido || /hybrid/i.test(textoOpcion)) motor += ' híbrido';
  return motor;
}

const ordenarMotores = (motores) =>
  [...new Set(motores)].sort((a, b) => (parseFloat(a) || 99) - (parseFloat(b) || 99) || a.localeCompare(b));

// ---------------------------------------------------------------------------------------------

async function principal() {
  const ventas = await ventasDelInegi();

  // 1. Marca real y nombre limpio de cada modelo de INEGI.
  const marcasNhtsa = new Map(); // marca -> [{ marca, modelo }]
  const todasLasMarcas = new Set();
  for (const venta of ventas) {
    const empresa = MARCAS_DE_EMPRESA[venta.marca];
    for (const marca of empresa?.candidatas ?? [venta.marca]) todasLasMarcas.add(marca);
  }
  console.log(`NHTSA: nombres oficiales de ${todasLasMarcas.size} marcas…`);
  await enParalelo(
    [...todasLasMarcas].map((marca) => async () => {
      marcasNhtsa.set(marca, (await modelosNhtsa(marca)).map((modelo) => ({ marca, modelo })));
    }),
    2
  );

  const modelos = new Map(); // "marca|normal" -> { marca, nombres: Map(nombre -> unidades), oficial, anios:Set, primerAnioInegi }
  let descartados = 0;
  for (const venta of ventas) {
    if (venta.unidades < VENTAS_MINIMAS) {
      descartados++;
      continue;
    }
    const empresa = MARCAS_DE_EMPRESA[venta.marca] ?? { candidatas: [venta.marca], porDefecto: venta.marca };
    let marca = empresa.porDefecto;
    let nombre = venta.modelo.split(/\s+\/\s*|\/(?=[A-Z])/)[0].trim();

    // La marca puede venir al inicio del modelo: "GMC Sierra", "Jeep Compass", "KIA Río", "BAIC X35".
    const primera = normal(palabras(nombre)[0] ?? '');
    const marcaEscrita =
      empresa.candidatas.find((c) => normal(c) === primera) ??
      (OTROS_NOMBRES_DE_MARCA[primera] && (empresa.candidatas.includes(OTROS_NOMBRES_DE_MARCA[primera]) || primera === normal(venta.marca) || OTROS_NOMBRES_DE_MARCA[primera] === marca)
        ? OTROS_NOMBRES_DE_MARCA[primera]
        : null) ??
      (primera === normal(venta.marca) ? marca : null);
    if (marcaEscrita && palabras(nombre).length > 1) {
      marca = marcaEscrita;
      nombre = nombre.replace(/^\S+\s+/, '');
    }

    const clave = `${venta.marca}|${normal(nombre)}`;
    if (clave in CORRECCIONES && CORRECCIONES[clave] === null) {
      descartados++;
      continue;
    }
    const correccion =
      CORRECCIONES[clave] ?? CORRECCIONES_POR_PATRON.find(([empresaInegi, patron]) => empresaInegi === venta.marca && patron.test(nombre))?.[2];
    let oficial = null;
    if (correccion) {
      marca = correccion.marca ?? marca;
      nombre = correccion.modelo ?? nombre;
    } else {
      // El nombre oficial puede ser de cualquiera de las marcas de la empresa (Sierra es GMC, no Chevrolet).
      const candidatas = [marca, ...empresa.candidatas.filter((c) => c !== marca)].filter(Boolean);
      for (const candidata of candidatas) {
        oficial = nombreOficial(nombre, marcasNhtsa.get(candidata) ?? []) ?? nombreOficial(limpiar(nombre), marcasNhtsa.get(candidata) ?? []);
        if (oficial) break;
      }
      if (oficial) {
        marca = oficial.marca;
        nombre = oficial.modelo;
      } else {
        nombre = limpiar(nombre);
      }
    }
    marca = NOMBRES_DE_MARCA[marca] ?? marca;
    if (!marca || !nombre || DESCARTAR.test(nombre)) {
      descartados++;
      continue;
    }

    const llave = `${marca}|${normal(nombre)}`;
    const modelo = modelos.get(llave) ?? { marca, nombres: new Map(), oficial: null, anios: new Set(), primerAnioInegi: Infinity };
    if (oficial || correccion) modelo.oficial = nombre;
    modelo.nombres.set(nombre, (modelo.nombres.get(nombre) ?? 0) + venta.unidades);
    for (const anio of venta.anios) if (anio >= DESDE && anio <= HASTA) modelo.anios.add(anio);
    modelo.primerAnioInegi = Math.min(modelo.primerAnioInegi, ...venta.anios);
    modelos.set(llave, modelo);
  }
  for (const modelo of modelos.values()) {
    modelo.nombre = modelo.oficial ?? [...modelo.nombres].sort((a, b) => b[1] - a[1])[0][0];
  }
  for (const [marca, nombre, desde, hasta] of ANIOS_PREVIOS_A_INEGI) {
    let modelo = modelos.get(`${marca}|${normal(nombre)}`);
    if (!modelo && !hasta) continue;
    // Si INEGI ya no lo registro (el Sedán dejo de venderse en 2003), se agrega con sus años conocidos.
    modelo ??= { marca, nombre, oficial: nombre, nombres: new Map(), anios: new Set(), primerAnioInegi: Infinity };
    modelos.set(`${marca}|${normal(nombre)}`, modelo);
    for (let anio = Math.max(desde, DESDE); anio <= (hasta ?? modelo.primerAnioInegi - 1); anio++) modelo.anios.add(anio);
  }
  console.log(`Modelos que se venden en Mexico: ${modelos.size} (descartados por pocas ventas o por no ser un modelo: ${descartados}).`);

  const catalogo = {}; // marca -> modelo -> año -> [motores]
  for (const modelo of modelos.values()) {
    if (!modelo.anios.size) continue;
    catalogo[modelo.marca] ??= {};
    catalogo[modelo.marca][modelo.nombre] = Object.fromEntries([...modelo.anios].sort().map((anio) => [anio, []]));
  }

  // 2. FuelEconomy.gov: que modelos hubo cada año. Sirve para dos cosas: los años anteriores a 2005 (INEGI empieza
  //    ahi) de los modelos que ya se vendian en Mexico ese año, y saber a que modelo pedirle los motores.
  const primerAnioInegi = Math.min(...[...modelos.values()].map((m) => m.primerAnioInegi));
  const antiguos = new Set(
    [...modelos.values()].filter((m) => m.oficial && m.primerAnioInegi === primerAnioInegi).map((m) => `${m.marca}|${m.nombre}`)
  );
  const marcasAntiguas = new Set([...antiguos].map((clave) => clave.split('|')[0]));

  console.log('FuelEconomy.gov: marcas por año…');
  const anios = [];
  for (let anio = DESDE; anio <= HASTA; anio++) anios.push(anio);
  const marcasFuelPorAnio = await enParalelo(anios.map((anio) => () => listaFuel(`${FUEL}/vehicle/menu/make?year=${anio}`)));

  const consultasDeModelos = [];
  anios.forEach((anio, i) => {
    const disponibles = new Map(marcasFuelPorAnio[i].map((m) => [normal(m.value), m.value]));
    for (const marca of Object.keys(catalogo)) {
      const marcaFuel = disponibles.get(normal(marca));
      if (!marcaFuel) continue;
      const sirve = anio < primerAnioInegi ? marcasAntiguas.has(marca) : Object.values(catalogo[marca]).some((porAnio) => anio in porAnio);
      if (sirve) consultasDeModelos.push({ anio, marca, marcaFuel });
    }
  });
  console.log(`FuelEconomy.gov: modelos de ${consultasDeModelos.length} marcas-año…`);
  const modelosFuel = await enParalelo(
    consultasDeModelos.map(({ anio, marcaFuel }) => () =>
      listaFuel(`${FUEL}/vehicle/menu/model?year=${anio}&make=${encodeURIComponent(marcaFuel)}`)
    )
  );

  // Cada modelo de FuelEconomy ("Versa", "Silverado 2WD", "Mazda3") se asigna al modelo del catalogo cuyo nombre
  // es su inicio, siempre que lo que sobre sean palabras de carroceria o traccion ("Versa Note" no es "Versa").
  const consultasDeMotores = [];
  consultasDeModelos.forEach(({ anio, marca, marcaFuel }, i) => {
    const delCatalogo = Object.keys(catalogo[marca]).filter((nombre) =>
      anio < primerAnioInegi ? antiguos.has(`${marca}|${nombre}`) : anio in catalogo[marca][nombre]
    );
    for (const { value: modeloFuel } of modelosFuel[i]) {
      let fuel = palabras(modeloFuel);
      if (fuel.length && normal(fuel[0]).startsWith(normal(marca)) && normal(fuel[0]) !== normal(marca)) {
        fuel = [normal(fuel[0]).slice(normal(marca).length), ...fuel.slice(1)];
      }
      let elegido = null;
      for (const nombre of delCatalogo) {
        for (let k = fuel.length; k >= 1; k--) {
          if (normal(fuel.slice(0, k).join('')) !== normal(nombre)) continue;
          const resto = fuel.slice(k).map(normal);
          if (resto.every((p) => SUFIJOS_FUEL.has(p)) && (!elegido || normal(nombre).length > normal(elegido.nombre).length)) {
            elegido = { nombre, hibrido: resto.includes('hybrid') || resto.includes('hev') || resto.includes('phev') };
          }
          break;
        }
      }
      if (!elegido) continue;
      catalogo[marca][elegido.nombre][anio] ??= [];
      consultasDeMotores.push({ anio, marca, marcaFuel, modeloFuel, ...elegido });
    }
  });
  console.log(`FuelEconomy.gov: motores de ${consultasDeMotores.length} modelos-año…`);
  const opciones = await enParalelo(
    consultasDeMotores.map(({ anio, marcaFuel, modeloFuel }) => () =>
      listaFuel(`${FUEL}/vehicle/menu/options?year=${anio}&make=${encodeURIComponent(marcaFuel)}&model=${encodeURIComponent(modeloFuel)}`)
    )
  );
  consultasDeMotores.forEach(({ anio, marca, nombre, hibrido }, i) => {
    const motores = opciones[i].map((o) => motorDeOpcion(o.text, hibrido)).filter(Boolean);
    catalogo[marca][nombre][anio].push(...motores);
  });

  // 4. Escribir el JSON: marca -> modelo -> { año: [motores] }, todo ordenado para que los cambios se lean en un diff.
  let filas = 0;
  let conMotor = 0;
  const vehiculos = {};
  for (const marca of Object.keys(catalogo).sort((a, b) => a.localeCompare(b))) {
    vehiculos[marca] = {};
    for (const nombre of Object.keys(catalogo[marca]).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))) {
      vehiculos[marca][nombre] = {};
      for (const [anio, motores] of Object.entries(catalogo[marca][nombre]).sort((a, b) => a[0] - b[0])) {
        vehiculos[marca][nombre][anio] = ordenarMotores(motores);
        filas++;
        if (motores.length) conMotor++;
      }
    }
  }
  mkdirSync(path.dirname(SALIDA), { recursive: true });
  writeFileSync(
    SALIDA,
    JSON.stringify(
      {
        generado: new Date().toISOString().slice(0, 10),
        fuentes: ['INEGI RAIAVL (ventas en Mexico por modelo)', 'NHTSA vPIC (nombres oficiales)', 'FuelEconomy.gov (motores y años previos a 2005)'],
        vehiculos,
      },
      null,
      1
    ) + '\n'
  );
  console.log(
    `Listo: ${Object.keys(vehiculos).length} marcas, ${Object.values(vehiculos).reduce((n, m) => n + Object.keys(m).length, 0)} modelos, ` +
      `${filas} combinaciones de modelo y año (${conMotor} con motores). Guardado en ${path.relative(process.cwd(), SALIDA)}`
  );
}

await principal();
