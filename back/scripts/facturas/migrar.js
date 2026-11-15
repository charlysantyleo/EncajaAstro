// Lo que hace "npm run db:facturas" (ver scripts/migrar-facturas.js), como funcion para poder probarlo
// contra cualquier conexion.

/** @param {{ query: Function }} db */
export async function migrarFacturas(db) {
  await db.query(`ALTER TABLE categoria ADD COLUMN IF NOT EXISTS clave_sat TEXT NOT NULL DEFAULT '01010101'`);
  // Las dos claves que se pudieron confirmar en el catalogo del SAT; las demas se ajustan en Panel -> Ajustes.
  await db.query(`
    UPDATE categoria SET clave_sat = CASE
        WHEN lower(nombre) = 'frenos' THEN '25171700'
        WHEN lower(nombre) IN ('electrico', 'eléctrico') THEN '25173900'
        ELSE clave_sat END
    WHERE clave_sat = '01010101'
  `);

  await db.query('CREATE SEQUENCE IF NOT EXISTS factura_folio');
  await db.query(`
    CREATE TABLE IF NOT EXISTS factura (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      pedido_id INTEGER NOT NULL UNIQUE REFERENCES pedido(id),
      serie TEXT NOT NULL,
      folio INTEGER NOT NULL,
      estado TEXT NOT NULL,
      rfc_receptor TEXT NOT NULL,
      datos JSONB NOT NULL,
      xml TEXT NOT NULL,
      uuid TEXT,
      creada TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}
