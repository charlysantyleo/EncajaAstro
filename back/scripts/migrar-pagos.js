// Para bases creadas antes de agregar los cobros: crea la tabla "pago" sin tocar lo que ya existe.
// Se puede correr varias veces. Una base nueva (npm run db:init) ya la trae desde db.sql.
import { config } from '../src/config.js';
import { crearPool } from '../src/adaptadores/salida/postgres/conexion.js';

const pool = crearPool(config.baseDeDatos);

await pool.query(`
  CREATE TABLE IF NOT EXISTS pago (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id INTEGER NOT NULL UNIQUE REFERENCES pedido(id),
    referencia TEXT NOT NULL UNIQUE,
    metodo TEXT NOT NULL,
    proveedor TEXT,
    status TEXT NOT NULL DEFAULT 'PENDIENTE',
    monto NUMERIC(10, 2) NOT NULL,
    id_externo TEXT,
    url TEXT,
    codigo TEXT,
    vence TEXT,
    detalle TEXT
  )
`);

console.log('Tabla "pago" lista. Los pedidos anteriores se quedan sin pago asociado.');

await pool.end();
