// Para bases creadas antes de la facturacion: crea la tabla "factura" (con su secuencia de folios) y agrega a cada
// sistema del catalogo su clave de producto o servicio del SAT. No toca lo que ya existe y se puede correr varias
// veces. Una base nueva (npm run db:init) ya lo trae desde db.sql.
import { config } from '../src/config.js';
import { crearPool } from '../src/adaptadores/salida/postgres/conexion.js';
import { migrarFacturas } from './facturas/migrar.js';

const pool = crearPool(config.baseDeDatos);
try {
  await migrarFacturas(pool);
  console.log('Facturacion lista: tabla "factura" y claves SAT de los sistemas del catalogo.');
} catch (error) {
  console.error('No se pudo migrar:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
