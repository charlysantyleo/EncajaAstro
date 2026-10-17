// Carga datos/vehiculos.json (lo arma scripts/vehiculos/armar-catalogo.js) a la tabla catalogo_vehiculo.
// Agrega lo nuevo y actualiza lo importado antes; lo que el administrador agrego o corrigio desde el panel
// (origen PANEL) no se toca. Lo usan "npm run db:init" y "npm run db:vehiculos".
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ARCHIVO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'datos', 'vehiculos.json');
const POR_LOTE = 1000;

/** @param {{ query: Function }} db  pool, cliente o PGlite */
export async function cargarCatalogo(db, archivo = ARCHIVO) {
  const { vehiculos } = JSON.parse(readFileSync(archivo, 'utf8'));
  const filas = [];
  for (const [marca, modelos] of Object.entries(vehiculos)) {
    for (const [modelo, anios] of Object.entries(modelos)) {
      for (const [anio, motores] of Object.entries(anios)) filas.push([marca, modelo, Number(anio), JSON.stringify(motores)]);
    }
  }
  for (let i = 0; i < filas.length; i += POR_LOTE) {
    const lote = filas.slice(i, i + POR_LOTE);
    await db.query(
      `INSERT INTO catalogo_vehiculo (marca, modelo, anio, motores, origen)
       SELECT f.marca, f.modelo, f.anio, ARRAY(SELECT jsonb_array_elements_text(f.motores::jsonb)), 'IMPORTADO'
       FROM unnest($1::text[], $2::text[], $3::int[], $4::text[]) AS f(marca, modelo, anio, motores)
       ON CONFLICT ((lower(marca)), (lower(modelo)), anio)
       DO UPDATE SET marca = EXCLUDED.marca, modelo = EXCLUDED.modelo, motores = EXCLUDED.motores
       WHERE catalogo_vehiculo.origen = 'IMPORTADO'`,
      [0, 1, 2, 3].map((columna) => lote.map((fila) => fila[columna]))
    );
  }
  return filas.length;
}
