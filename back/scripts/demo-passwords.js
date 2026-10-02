// Para bases creadas antes de agregar la autenticacion: los usuarios de ejemplo tenian
// contraseñas falsas ("demo-hash-1"...). Esto les pone la contraseña de demo "encaja123"
// guardada como hash bcrypt, para poder iniciar sesion con ellos.
import { config } from '../src/config.js';
import { crearPool } from '../src/adaptadores/salida/postgres/conexion.js';
import { crearPasswordsBcrypt } from '../src/adaptadores/salida/seguridad/passwordsBcrypt.js';

const PASSWORD_DEMO = 'encaja123';

const pool = crearPool(config.baseDeDatos);
const hash = await crearPasswordsBcrypt().cifrar(PASSWORD_DEMO);
const resultado = await pool.query(
  "UPDATE usuario SET password = $1 WHERE password LIKE 'demo-hash-%' RETURNING email",
  [hash]
);

console.log(`Contraseña "${PASSWORD_DEMO}" asignada a ${resultado.rowCount} usuario(s) de ejemplo:`);
for (const fila of resultado.rows) console.log(`  - ${fila.email}`);

await pool.end();
