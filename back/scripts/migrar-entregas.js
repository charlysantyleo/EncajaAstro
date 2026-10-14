// Para bases creadas antes de pedir los datos de entrega: crea las tablas "entrega" y "direccion"
// (direcciones guardadas de cada cuenta) sin tocar lo que ya existe.
// Se puede correr varias veces, tambien si ya se habia corrido una version anterior de este script.
// Una base nueva (npm run db:init) ya trae todo desde db.sql.
import { config } from '../src/config.js';
import { crearPool } from '../src/adaptadores/salida/postgres/conexion.js';

const pool = crearPool(config.baseDeDatos);

await pool.query(`
  CREATE TABLE IF NOT EXISTS entrega (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id INTEGER NOT NULL UNIQUE REFERENCES pedido(id),
    tipo TEXT NOT NULL,
    telefono TEXT,
    costo NUMERIC(10, 2) NOT NULL DEFAULT 0,
    calle TEXT,
    numero_exterior TEXT,
    numero_interior TEXT,
    colonia TEXT,
    codigo_postal TEXT,
    ciudad TEXT,
    estado TEXT,
    referencias TEXT
  )
`);
// La primera version de la tabla no guardaba el costo del envio.
await pool.query('ALTER TABLE entrega ADD COLUMN IF NOT EXISTS costo NUMERIC(10, 2) NOT NULL DEFAULT 0');

await pool.query(`
  CREATE TABLE IF NOT EXISTS direccion (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id),
    telefono TEXT NOT NULL,
    calle TEXT NOT NULL,
    numero_exterior TEXT NOT NULL,
    numero_interior TEXT,
    colonia TEXT NOT NULL,
    codigo_postal TEXT NOT NULL,
    ciudad TEXT NOT NULL,
    estado TEXT NOT NULL,
    referencias TEXT
  )
`);

console.log('Tablas "entrega" y "direccion" listas. Los pedidos anteriores se quedan sin datos de entrega.');

await pool.end();
