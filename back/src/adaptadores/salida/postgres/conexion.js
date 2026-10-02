import pg from 'pg';

// Crea el pool de conexiones a PostgreSQL.
export function crearPool({ databaseUrl, ssl }) {
  return new pg.Pool({
    connectionString: databaseUrl,
    ssl: ssl ? { rejectUnauthorized: false } : false,
  });
}

// Implementa el puerto Transaccion: BEGIN, el trabajo con repositorios atados a esa conexion, COMMIT
// (o ROLLBACK si algo falla, y entonces no se guarda nada).
export function crearTransaccion(pool, crearRepositorios) {
  return async function transaccion(trabajo) {
    const conexion = await pool.connect();
    try {
      await conexion.query('BEGIN');
      const resultado = await trabajo(crearRepositorios(conexion));
      await conexion.query('COMMIT');
      return resultado;
    } catch (error) {
      await conexion.query('ROLLBACK');
      throw error;
    } finally {
      conexion.release();
    }
  };
}
