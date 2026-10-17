// Catalogo de vehiculos y compatibilidades por rango de años, para bases creadas antes de este cambio
// (una base nueva con "npm run db:init" ya lo trae). Se puede correr varias veces; tambien sirve para
// cargar una version nueva de datos/vehiculos.json.
//
//   1. Crea la tabla catalogo_vehiculo y la llena con datos/vehiculos.json.
//   2. Si las compatibilidades todavia apuntan a un coche del garage (vehiculo_id), las convierte a
//      marca + modelo + años: "embona en el Versa 2018 de Santiago" pasa a "embona en Nissan Versa 2018",
//      que ya le aplica a cualquier cliente con ese coche. Desde el panel se pueden ampliar los años.
//   3. Pone los nombres del catalogo a los coches del garage y a las compatibilidades ("nissan versa" -> "Nissan Versa").
import { config } from '../src/config.js';
import { crearPool } from '../src/adaptadores/salida/postgres/conexion.js';
import { migrarVehiculos } from './vehiculos/migrar.js';

const pool = crearPool(config.baseDeDatos);
const cliente = await pool.connect();

try {
  await cliente.query('BEGIN');
  const fuera = await migrarVehiculos(cliente);
  await cliente.query('COMMIT');
  if (fuera.length) {
    console.log(
      `Coches del garage que no estan en el catalogo (siguen funcionando; agregalos en Panel → Vehiculos si son correctos):\n` +
        fuera.map((v) => `  ${v.marca} ${v.modelo} ${v.anio}`).join('\n')
    );
  }
  console.log('Listo.');
} catch (error) {
  await cliente.query('ROLLBACK');
  console.error('No se pudo migrar:', error.message);
  process.exitCode = 1;
} finally {
  cliente.release();
  await pool.end();
}
