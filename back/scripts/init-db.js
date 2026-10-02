import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, '..', 'db.sql');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Falta la variable de entorno DATABASE_URL con el connection string de Postgres');
  process.exit(1);
}

const usarSSL = process.env.DATABASE_SSL !== 'false';

const pool = new Pool({
  connectionString,
  ssl: usarSSL ? { rejectUnauthorized: false } : false,
});

const sql = readFileSync(sqlPath, 'utf-8');

const cliente = await pool.connect();
try {
  await cliente.query('BEGIN');
  await cliente.query(sql);
  await cliente.query('COMMIT');
  console.log('Base de datos inicializada desde db.sql');
} catch (error) {
  await cliente.query('ROLLBACK');
  console.error('No se pudo inicializar la base de datos:', error.message);
  process.exitCode = 1;
} finally {
  cliente.release();
  await pool.end();
}
