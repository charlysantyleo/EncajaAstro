// Lo que hace "npm run db:vehiculos" (ver scripts/migrar-vehiculos.js), como funcion para poder probarlo
// contra cualquier conexion.
import { cargarCatalogo } from './cargar.js';

/**
 * Corre dentro de una transaccion abierta por quien la llama. Regresa los coches del garage que no
 * quedaron en el catalogo, para avisar.
 * @param {{ query: Function }} cliente
 */
export async function migrarVehiculos(cliente, avisar = console.log) {
  await cliente.query(`
    CREATE TABLE IF NOT EXISTS catalogo_vehiculo (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      marca TEXT NOT NULL,
      modelo TEXT NOT NULL,
      anio INTEGER NOT NULL,
      motores TEXT[] NOT NULL DEFAULT '{}',
      origen TEXT NOT NULL DEFAULT 'PANEL'
    )
  `);
  await cliente.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS catalogo_vehiculo_clave ON catalogo_vehiculo (lower(marca), lower(modelo), anio)'
  );
  const cargadas = await cargarCatalogo(cliente);
  avisar(`Catalogo de vehiculos: ${cargadas} combinaciones de modelo y año cargadas.`);

  const { rows: columnaVieja } = await cliente.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'compatibilidad' AND column_name = 'vehiculo_id'`
  );
  if (columnaVieja.length) {
    await cliente.query(`
      ALTER TABLE compatibilidad
        ADD COLUMN IF NOT EXISTS marca TEXT,
        ADD COLUMN IF NOT EXISTS modelo TEXT,
        ADD COLUMN IF NOT EXISTS anio_desde INTEGER,
        ADD COLUMN IF NOT EXISTS anio_hasta INTEGER,
        ADD COLUMN IF NOT EXISTS motor TEXT
    `);
    await cliente.query(`
      UPDATE compatibilidad c
      SET marca = v.marca, modelo = v.modelo, anio_desde = v.anio, anio_hasta = v.anio
      FROM vehiculo v WHERE v.id = c.vehiculo_id
    `);
    // Dos clientes con el mismo coche daban dos compatibilidades iguales: queda una.
    const { rowCount: repetidas } = await cliente.query(`
      DELETE FROM compatibilidad a USING compatibilidad b
      WHERE a.id > b.id AND a.producto_id = b.producto_id
        AND lower(a.marca) = lower(b.marca) AND lower(a.modelo) = lower(b.modelo)
        AND a.anio_desde = b.anio_desde AND a.anio_hasta = b.anio_hasta
    `);
    await cliente.query(`
      ALTER TABLE compatibilidad
        DROP COLUMN vehiculo_id,
        ALTER COLUMN marca SET NOT NULL,
        ALTER COLUMN modelo SET NOT NULL,
        ALTER COLUMN anio_desde SET NOT NULL,
        ALTER COLUMN anio_hasta SET NOT NULL,
        ADD CHECK (anio_desde <= anio_hasta)
    `);
    avisar(`Compatibilidades convertidas a marca, modelo y años (${repetidas} repetidas eliminadas).`);
  }
  await cliente.query(
    'CREATE INDEX IF NOT EXISTS compatibilidad_modelo ON compatibilidad (lower(marca), lower(modelo))'
  );

  await cliente.query(`
    UPDATE vehiculo v SET marca = c.marca, modelo = c.modelo
    FROM catalogo_vehiculo c
    WHERE lower(c.marca) = lower(trim(v.marca)) AND lower(c.modelo) = lower(trim(v.modelo)) AND c.anio = v.anio
      AND (v.marca <> c.marca OR v.modelo <> c.modelo)
  `);
  await cliente.query(`
    UPDATE compatibilidad x SET marca = c.marca, modelo = c.modelo
    FROM (SELECT DISTINCT ON (lower(marca), lower(modelo)) marca, modelo FROM catalogo_vehiculo) c
    WHERE lower(c.marca) = lower(trim(x.marca)) AND lower(c.modelo) = lower(trim(x.modelo))
      AND (x.marca <> c.marca OR x.modelo <> c.modelo)
  `);
  const { rows: fuera } = await cliente.query(`
    SELECT DISTINCT v.marca, v.modelo, v.anio FROM vehiculo v
    WHERE NOT EXISTS (
      SELECT 1 FROM catalogo_vehiculo c
      WHERE lower(c.marca) = lower(v.marca) AND lower(c.modelo) = lower(v.modelo) AND c.anio = v.anio
    )
    ORDER BY 1, 2, 3
  `);

  return fuera;
}
