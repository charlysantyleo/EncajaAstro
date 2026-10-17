// Para bases creadas antes del panel de administracion: crea las tablas "ajuste" (costo de envio,
// descuento de taller) e "imagen" (fotos de producto subidas desde el panel) sin tocar lo que ya existe.
// Se puede correr varias veces. Una base nueva (npm run db:init) ya las trae desde db.sql.
import { config } from '../src/config.js';
import { crearPool } from '../src/adaptadores/salida/postgres/conexion.js';

const pool = crearPool(config.baseDeDatos);

await pool.query(`
  CREATE TABLE IF NOT EXISTS ajuste (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  )
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS imagen (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo TEXT NOT NULL,
    datos BYTEA NOT NULL,
    creada TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

console.log('Tablas "ajuste" e "imagen" listas.');

await pool.end();
