// Adaptador de salida: implementa el puerto Repositorios con SQL sobre PostgreSQL.
// Es el UNICO lugar del backend que conoce tablas y columnas. Cada fila se traduce
// a un objeto del dominio (numero_parte -> numeroParte, precio NUMERIC -> number...).

const numero = (valor) => (valor == null ? null : Number(valor));

const aUsuario = (f) =>
  f && { id: f.id, nombre: f.nombre, email: f.email, rol: f.rol, passwordHash: f.password };
const aCategoria = (f) => f && { id: f.id, nombre: f.nombre, descripcion: f.descripcion };
const aProducto = (f) =>
  f && {
    id: f.id,
    nombre: f.nombre,
    descripcion: f.descripcion,
    numeroParte: f.numero_parte,
    marca: f.marca,
    precio: numero(f.precio),
    imagen: f.imagen,
    stock: f.stock,
    categoriaId: f.categoria_id,
  };
const aVehiculo = (f) =>
  f && {
    id: f.id,
    usuarioId: f.usuario_id,
    apodo: f.apodo,
    marca: f.marca,
    modelo: f.modelo,
    anio: f.anio,
    motor: f.motor,
    tipoCombustible: f.tipo_combustible,
    kilometraje: f.kilometraje,
  };
const aCompatibilidad = (f) =>
  f && {
    id: f.id,
    productoId: f.producto_id,
    marca: f.marca,
    modelo: f.modelo,
    anioDesde: f.anio_desde,
    anioHasta: f.anio_hasta,
    motor: f.motor,
    tipo: f.tipo,
    nota: f.nota,
  };
const aModeloDeVehiculo = (f) =>
  f && { id: f.id, marca: f.marca, modelo: f.modelo, anio: f.anio, motores: f.motores ?? [], origen: f.origen };

// La compatibilidad "c" cubre al vehiculo "v": misma marca y modelo, año dentro del rango y, si la compatibilidad
// pide un motor, ese motor. Es la regla cubre() de dominio/vehiculos.js escrita en SQL.
const CUBRE = `lower(c.marca) = lower(v.marca) AND lower(c.modelo) = lower(v.modelo)
  AND v.anio BETWEEN c.anio_desde AND c.anio_hasta
  AND (c.motor IS NULL OR lower(c.motor) = lower(coalesce(v.motor, '')))`;
const aPedido = (f) =>
  f && { id: f.id, usuarioId: f.usuario_id, vehiculoId: f.vehiculo_id, fecha: f.fecha, total: numero(f.total), status: f.status };
const aDetalle = (f) =>
  f && {
    id: f.id,
    pedidoId: f.pedido_id,
    productoId: f.producto_id,
    cantidad: f.cantidad,
    precioUnitario: numero(f.precio_unitario),
    importe: numero(f.importe),
  };
const aMantenimiento = (f) =>
  f && {
    id: f.id,
    vehiculoId: f.vehiculo_id,
    productoId: f.producto_id,
    pedidoId: f.pedido_id,
    fecha: f.fecha,
    kilometraje: f.kilometraje,
    descripcion: f.descripcion,
  };
const aPago = (f) =>
  f && {
    id: f.id,
    pedidoId: f.pedido_id,
    referencia: f.referencia,
    metodo: f.metodo,
    proveedor: f.proveedor,
    status: f.status,
    monto: numero(f.monto),
    idExterno: f.id_externo,
    url: f.url,
    codigo: f.codigo,
    vence: f.vence,
    detalle: f.detalle,
  };

// La direccion solo existe en entregas a domicilio.
const aEntrega = (f) =>
  f && {
    id: f.id,
    pedidoId: f.pedido_id,
    tipo: f.tipo,
    telefono: f.telefono,
    costo: numero(f.costo),
    direccion: f.calle && {
      calle: f.calle,
      numeroExterior: f.numero_exterior,
      numeroInterior: f.numero_interior,
      colonia: f.colonia,
      codigoPostal: f.codigo_postal,
      ciudad: f.ciudad,
      estado: f.estado,
      referencias: f.referencias,
    },
  };

const aDireccionGuardada = (f) =>
  f && {
    id: f.id,
    usuarioId: f.usuario_id,
    telefono: f.telefono,
    calle: f.calle,
    numeroExterior: f.numero_exterior,
    numeroInterior: f.numero_interior,
    colonia: f.colonia,
    codigoPostal: f.codigo_postal,
    ciudad: f.ciudad,
    estado: f.estado,
    referencias: f.referencias,
  };

// Campos de un pago que cambian despues de crearlo, con su columna.
const COLUMNAS_DE_PAGO = { status: 'status', idExterno: 'id_externo', url: 'url', codigo: 'codigo', vence: 'vence', detalle: 'detalle' };

// Arma "WHERE a = $1 AND b ILIKE $2" solo con los filtros que vienen.
function armarWhere(filtros) {
  const condiciones = [];
  const parametros = [];
  for (const [condicion, valor] of filtros) {
    if (valor == null || valor === '' || valor === false) continue;
    if (valor === true) {
      condiciones.push(condicion);
      continue;
    }
    parametros.push(valor);
    condiciones.push(condicion.replaceAll('?', `$${parametros.length}`));
  }
  return { where: condiciones.length ? ' WHERE ' + condiciones.join(' AND ') : '', parametros };
}

/**
 * @param {{ query: Function }} db  el pool o una conexion dentro de una transaccion
 * @returns {import('../../../puertos/salida.js').Repositorios}
 */
export function crearRepositorios(db) {
  const todas = async (sql, parametros, mapa) => (await db.query(sql, parametros)).rows.map(mapa);
  const una = async (sql, parametros, mapa) => mapa((await db.query(sql, parametros)).rows[0] ?? null);

  return {
    usuarios: {
      porId: (id) => una('SELECT * FROM usuario WHERE id = $1', [id], aUsuario),
      porEmail: (email) => una('SELECT * FROM usuario WHERE email = $1', [email], aUsuario),
      listar: ({ rol } = {}) =>
        rol
          ? todas('SELECT * FROM usuario WHERE rol = $1 ORDER BY nombre', [rol], aUsuario)
          : todas('SELECT * FROM usuario ORDER BY nombre', [], aUsuario),
      crear: ({ nombre, email, passwordHash, rol }) =>
        una(
          'INSERT INTO usuario (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING *',
          [nombre, email, passwordHash, rol],
          aUsuario
        ),
      cambiarRol: (id, rol) => una('UPDATE usuario SET rol = $1 WHERE id = $2 RETURNING *', [rol, id], aUsuario),
      cambiarPassword: (id, passwordHash) =>
        una('UPDATE usuario SET password = $1 WHERE id = $2 RETURNING *', [passwordHash, id], aUsuario),
    },

    categorias: {
      listar: () => todas('SELECT * FROM categoria ORDER BY nombre', [], aCategoria),
      porId: (id) => una('SELECT * FROM categoria WHERE id = $1', [id], aCategoria),
      crear: ({ nombre, descripcion }) =>
        una('INSERT INTO categoria (nombre, descripcion) VALUES ($1, $2) RETURNING *', [nombre, descripcion], aCategoria),
    },

    productos: {
      porId: (id) => una('SELECT * FROM producto WHERE id = $1', [id], aProducto),
      deCategoria: (categoriaId) =>
        todas('SELECT * FROM producto WHERE categoria_id = $1 ORDER BY nombre', [categoriaId], aProducto),
      buscar({ categoriaId, vehiculoId, texto, precioMin, precioMax, soloDirectos }) {
        const { where, parametros } = armarWhere([
          ['v.id = ?', vehiculoId],
          ["c.tipo = 'DIRECTO'", Boolean(vehiculoId && soloDirectos)],
          ['producto.categoria_id = ?', categoriaId],
          ['(producto.nombre ILIKE ? OR producto.numero_parte ILIKE ? OR producto.marca ILIKE ?)', texto ? `%${texto}%` : null],
          ['producto.precio >= ?', precioMin],
          ['producto.precio <= ?', precioMax],
        ]);
        const join = vehiculoId ? ` JOIN compatibilidad c ON c.producto_id = producto.id JOIN vehiculo v ON ${CUBRE}` : '';
        return todas(`SELECT DISTINCT producto.* FROM producto${join}${where} ORDER BY producto.nombre`, parametros, aProducto);
      },
      crear: (p) =>
        una(
          `INSERT INTO producto (nombre, descripcion, numero_parte, marca, precio, imagen, stock, categoria_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [p.nombre, p.descripcion, p.numeroParte, p.marca, p.precio, p.imagen, p.stock ?? 0, p.categoriaId],
          aProducto
        ),
      actualizar: (id, p) =>
        una(
          `UPDATE producto SET nombre = $1, descripcion = $2, numero_parte = $3, marca = $4,
             precio = $5, imagen = $6, stock = COALESCE($7, stock), categoria_id = $8
           WHERE id = $9 RETURNING *`,
          [p.nombre, p.descripcion, p.numeroParte, p.marca, p.precio, p.imagen, p.stock, p.categoriaId, id],
          aProducto
        ),
      eliminar: async (id) => (await db.query('DELETE FROM producto WHERE id = $1', [id])).rowCount > 0,
      descontarStock: async (id, cantidad) => {
        await db.query('UPDATE producto SET stock = stock - $1 WHERE id = $2', [cantidad, id]);
      },
      reponerStock: async (id, cantidad) => {
        await db.query('UPDATE producto SET stock = stock + $1 WHERE id = $2', [cantidad, id]);
      },
    },

    vehiculos: {
      porId: (id) => una('SELECT * FROM vehiculo WHERE id = $1', [id], aVehiculo),
      listar({ usuarioId, marca } = {}) {
        const { where, parametros } = armarWhere([
          ['usuario_id = ?', usuarioId],
          ['marca ILIKE ?', marca ? `%${marca}%` : null],
        ]);
        return todas(`SELECT * FROM vehiculo${where} ORDER BY marca, modelo, anio`, parametros, aVehiculo);
      },
      deUsuario: (usuarioId) =>
        todas('SELECT * FROM vehiculo WHERE usuario_id = $1 ORDER BY marca, modelo', [usuarioId], aVehiculo),
      // Los coches de un usuario en los que embona una pieza.
      compatiblesCon: (productoId, usuarioId) =>
        todas(
          `SELECT DISTINCT v.* FROM vehiculo v
           JOIN compatibilidad c ON ${CUBRE}
           WHERE c.producto_id = $1 AND v.usuario_id = $2
           ORDER BY v.marca, v.modelo, v.anio`,
          [productoId, usuarioId],
          aVehiculo
        ),
      crear: (v) =>
        una(
          `INSERT INTO vehiculo (usuario_id, apodo, marca, modelo, anio, motor, tipo_combustible, kilometraje)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [v.usuarioId, v.apodo, v.marca, v.modelo, v.anio, v.motor, v.tipoCombustible, v.kilometraje],
          aVehiculo
        ),
      actualizar: (id, v) =>
        una(
          `UPDATE vehiculo SET apodo = $1, marca = $2, modelo = $3, anio = $4,
             motor = $5, tipo_combustible = $6, kilometraje = $7
           WHERE id = $8 RETURNING *`,
          [v.apodo, v.marca, v.modelo, v.anio, v.motor, v.tipoCombustible, v.kilometraje, id],
          aVehiculo
        ),
      eliminar: async (id) => (await db.query('DELETE FROM vehiculo WHERE id = $1', [id])).rowCount > 0,
      actualizarKilometraje: async (id, kilometraje) => {
        await db.query('UPDATE vehiculo SET kilometraje = $1 WHERE id = $2', [kilometraje, id]);
      },
    },

    compatibilidades: {
      // Con vehiculoId: las compatibilidades que cubren ese coche del garage.
      listar({ productoId, vehiculoId } = {}) {
        const { where, parametros } = armarWhere([
          ['c.producto_id = ?', productoId],
          ['v.id = ?', vehiculoId],
        ]);
        const join = vehiculoId ? ` JOIN vehiculo v ON ${CUBRE}` : '';
        return todas(
          `SELECT c.* FROM compatibilidad c${join}${where}
           ORDER BY c.marca, c.modelo, c.anio_desde, c.motor NULLS FIRST`,
          parametros,
          aCompatibilidad
        );
      },
      // La que aplica a ese coche; si hay una para su motor y otra general, gana la de su motor.
      buscar: (productoId, vehiculoId) =>
        una(
          `SELECT c.* FROM compatibilidad c JOIN vehiculo v ON ${CUBRE}
           WHERE c.producto_id = $1 AND v.id = $2
           ORDER BY c.motor IS NULL, c.tipo <> 'DIRECTO'
           LIMIT 1`,
          [productoId, vehiculoId],
          aCompatibilidad
        ),
      deModelo: (productoId, { marca, modelo }) =>
        todas(
          'SELECT * FROM compatibilidad WHERE producto_id = $1 AND lower(marca) = lower($2) AND lower(modelo) = lower($3)',
          [productoId, marca, modelo],
          aCompatibilidad
        ),
      crear: (c) =>
        una(
          `INSERT INTO compatibilidad (producto_id, marca, modelo, anio_desde, anio_hasta, motor, tipo, nota)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [c.productoId, c.marca, c.modelo, c.anioDesde, c.anioHasta, c.motor, c.tipo, c.nota],
          aCompatibilidad
        ),
      eliminar: async (id) => (await db.query('DELETE FROM compatibilidad WHERE id = $1', [id])).rowCount > 0,
    },

    // Catalogo compartido de vehiculos: una fila por marca, modelo y año, con sus motores.
    catalogoVehiculos: {
      hayDatos: async () => (await db.query('SELECT EXISTS (SELECT 1 FROM catalogo_vehiculo) AS hay')).rows[0].hay,
      marcas: async (anio) =>
        (
          await db.query(
            `SELECT marca FROM catalogo_vehiculo${anio ? ' WHERE anio = $1' : ''} GROUP BY marca ORDER BY lower(marca)`,
            anio ? [anio] : []
          )
        ).rows.map((f) => f.marca),
      modelos: async (marca, anio) =>
        (
          await db.query(
            `SELECT modelo FROM catalogo_vehiculo
             WHERE lower(marca) = lower($1)${anio ? ' AND anio = $2' : ''} GROUP BY modelo ORDER BY lower(modelo)`,
            anio ? [marca, anio] : [marca]
          )
        ).rows.map((f) => f.modelo),
      anios: async (marca, modelo) =>
        (
          await db.query(
            'SELECT anio FROM catalogo_vehiculo WHERE lower(marca) = lower($1) AND lower(modelo) = lower($2) ORDER BY anio DESC',
            [marca, modelo]
          )
        ).rows.map((f) => f.anio),
      // Sin año: los motores de todos los años de ese modelo (para elegir el de una compatibilidad).
      motores: async (marca, modelo, anio) =>
        (
          await db.query(
            `SELECT DISTINCT unnest(motores) AS motor FROM catalogo_vehiculo
             WHERE lower(marca) = lower($1) AND lower(modelo) = lower($2)${anio ? ' AND anio = $3' : ''}`,
            anio ? [marca, modelo, anio] : [marca, modelo]
          )
        ).rows.map((f) => f.motor),
      buscarUno: (marca, modelo, anio) =>
        una(
          'SELECT * FROM catalogo_vehiculo WHERE lower(marca) = lower($1) AND lower(modelo) = lower($2) AND anio = $3',
          [marca, modelo, anio],
          aModeloDeVehiculo
        ),
      // terminos: patrones ILIKE que deben aparecer todos en "marca modelo"; inicio: el primero, para poner
      // antes los modelos que empiezan con lo que se escribio. Agrupa por modelo con su primer y ultimo año.
      async buscar({ terminos, inicio, anio, limite }) {
        const parametros = [terminos, inicio];
        if (anio) parametros.push(anio);
        const filas = (
          await db.query(
            `SELECT marca, modelo, min(anio) AS desde, max(anio) AS hasta
             FROM catalogo_vehiculo
             WHERE (marca || ' ' || modelo) ILIKE ALL($1::text[])${anio ? ' AND anio = $3' : ''}
             GROUP BY marca, modelo
             ORDER BY bool_or(modelo ILIKE $2) DESC, lower(marca), lower(modelo)
             LIMIT ${Number(limite)}`,
            parametros
          )
        ).rows;
        return filas.map((f) => ({ marca: f.marca, modelo: f.modelo, anio: anio ?? null, desde: f.desde, hasta: f.hasta }));
      },
      deMarca: (marca) =>
        todas('SELECT * FROM catalogo_vehiculo WHERE lower(marca) = lower($1) ORDER BY lower(modelo), anio', [marca], aModeloDeVehiculo),
      // Lo que se guarda desde el panel reemplaza los motores y ya no lo pisa la importacion.
      guardar: ({ marca, modelo, anioDesde, anioHasta, motores }) =>
        todas(
          `INSERT INTO catalogo_vehiculo (marca, modelo, anio, motores, origen)
           SELECT $1, $2, anio, $5::text[], 'PANEL' FROM generate_series($3::int, $4::int) AS anio
           ON CONFLICT ((lower(marca)), (lower(modelo)), anio)
           DO UPDATE SET motores = EXCLUDED.motores, origen = 'PANEL'
           RETURNING *`,
          [marca, modelo, anioDesde, anioHasta, motores],
          aModeloDeVehiculo
        ),
      quitar: async ({ marca, modelo, anioDesde, anioHasta }) =>
        (
          await db.query(
            `DELETE FROM catalogo_vehiculo
             WHERE lower(marca) = lower($1) AND lower(modelo) = lower($2) AND anio BETWEEN $3 AND $4`,
            [marca, modelo, anioDesde, anioHasta]
          )
        ).rowCount,
    },

    // Ajustes de la tienda como clave/valor; se guardan como texto y se leen como numero.
    ajustes: {
      todos: async () =>
        Object.fromEntries((await db.query('SELECT clave, valor FROM ajuste')).rows.map((f) => [f.clave, Number(f.valor)])),
      guardar: async (clave, valor) => {
        await db.query(
          'INSERT INTO ajuste (clave, valor) VALUES ($1, $2) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor',
          [clave, String(valor)]
        );
      },
    },

    // Fotos de producto. Llegan en base64 desde GraphQL y se guardan como bytes.
    imagenes: {
      porId: (id) => una('SELECT id, tipo, datos FROM imagen WHERE id = $1', [id], (f) => f && { id: f.id, tipo: f.tipo, datos: f.datos }),
      crear: ({ tipo, base64 }) =>
        una('INSERT INTO imagen (tipo, datos) VALUES ($1, $2) RETURNING id', [tipo, Buffer.from(base64, 'base64')], (f) => f && { id: f.id }),
    },

    pedidos: {
      porId: (id) => una('SELECT * FROM pedido WHERE id = $1', [id], aPedido),
      // Dentro de una transaccion: nadie mas puede cambiar este pedido hasta que termine.
      bloquear: (id) => una('SELECT * FROM pedido WHERE id = $1 FOR UPDATE', [id], aPedido),
      cambiarStatus: async (id, status) => {
        await db.query('UPDATE pedido SET status = $1 WHERE id = $2', [status, id]);
      },
      listar({ usuarioId, status } = {}) {
        const { where, parametros } = armarWhere([
          ['usuario_id = ?', usuarioId],
          ['status = ?', status],
        ]);
        return todas(`SELECT * FROM pedido${where} ORDER BY fecha DESC, id DESC`, parametros, aPedido);
      },
      deUsuario: (usuarioId) =>
        todas('SELECT * FROM pedido WHERE usuario_id = $1 ORDER BY fecha DESC', [usuarioId], aPedido),
      crear: ({ usuarioId, vehiculoId, fecha, total, status }) =>
        una(
          'INSERT INTO pedido (usuario_id, vehiculo_id, fecha, total, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [usuarioId, vehiculoId, fecha, total, status],
          aPedido
        ),
      detallesDe: (pedidoId) => todas('SELECT * FROM detalle_pedido WHERE pedido_id = $1', [pedidoId], aDetalle),
      agregarDetalle: async ({ pedidoId, productoId, cantidad, precioUnitario, importe }) => {
        await db.query(
          `INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario, importe)
           VALUES ($1, $2, $3, $4, $5)`,
          [pedidoId, productoId, cantidad, precioUnitario, importe]
        );
      },
      incluyeProducto: async (pedidoId, productoId) =>
        (await db.query('SELECT 1 FROM detalle_pedido WHERE pedido_id = $1 AND producto_id = $2', [pedidoId, productoId]))
          .rowCount > 0,
    },

    pagos: {
      porId: (id) => una('SELECT * FROM pago WHERE id = $1', [id], aPago),
      dePedido: (pedidoId) => una('SELECT * FROM pago WHERE pedido_id = $1', [pedidoId], aPago),
      porReferencia: (referencia) => una('SELECT * FROM pago WHERE referencia = $1', [referencia], aPago),
      // El codigo de mostrador; tambien guarda la referencia de las fichas de tienda, por eso se busca el mas reciente.
      porCodigo: (codigo) => una('SELECT * FROM pago WHERE codigo = $1 ORDER BY id DESC LIMIT 1', [codigo], aPago),
      crear: ({ pedidoId, referencia, metodo, proveedor, status, monto, codigo = null }) =>
        una(
          `INSERT INTO pago (pedido_id, referencia, metodo, proveedor, status, monto, codigo)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [pedidoId, referencia, metodo, proveedor, status, monto, codigo],
          aPago
        ),
      // Actualiza solo los campos que vienen (status, idExterno, url, codigo, vence, detalle).
      actualizar(id, cambios) {
        const campos = Object.keys(cambios).filter((campo) => COLUMNAS_DE_PAGO[campo] && cambios[campo] !== undefined);
        if (!campos.length) return una('SELECT * FROM pago WHERE id = $1', [id], aPago);
        const asignaciones = campos.map((campo, indice) => `${COLUMNAS_DE_PAGO[campo]} = $${indice + 1}`).join(', ');
        return una(
          `UPDATE pago SET ${asignaciones} WHERE id = $${campos.length + 1} RETURNING *`,
          [...campos.map((campo) => cambios[campo]), id],
          aPago
        );
      },
    },

    entregas: {
      dePedido: (pedidoId) => una('SELECT * FROM entrega WHERE pedido_id = $1', [pedidoId], aEntrega),
      crear: ({ pedidoId, tipo, telefono, direccion, costo = 0 }) =>
        una(
          `INSERT INTO entrega (pedido_id, tipo, telefono, costo, calle, numero_exterior, numero_interior, colonia,
             codigo_postal, ciudad, estado, referencias)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
          [
            pedidoId,
            tipo,
            telefono,
            costo,
            direccion?.calle ?? null,
            direccion?.numeroExterior ?? null,
            direccion?.numeroInterior ?? null,
            direccion?.colonia ?? null,
            direccion?.codigoPostal ?? null,
            direccion?.ciudad ?? null,
            direccion?.estado ?? null,
            direccion?.referencias ?? null,
          ],
          aEntrega
        ),
    },

    direcciones: {
      porId: (id) => una('SELECT * FROM direccion WHERE id = $1', [id], aDireccionGuardada),
      // La mas reciente primero: es la que el checkout deja elegida.
      deUsuario: (usuarioId) => todas('SELECT * FROM direccion WHERE usuario_id = $1 ORDER BY id DESC', [usuarioId], aDireccionGuardada),
      crear: (d) =>
        una(
          `INSERT INTO direccion (usuario_id, telefono, calle, numero_exterior, numero_interior, colonia,
             codigo_postal, ciudad, estado, referencias)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
          [d.usuarioId, d.telefono, d.calle, d.numeroExterior, d.numeroInterior, d.colonia, d.codigoPostal, d.ciudad, d.estado, d.referencias],
          aDireccionGuardada
        ),
      actualizarContacto: (id, { telefono, referencias }) =>
        una('UPDATE direccion SET telefono = $1, referencias = $2 WHERE id = $3 RETURNING *', [telefono, referencias, id], aDireccionGuardada),
      eliminar: async (id) => (await db.query('DELETE FROM direccion WHERE id = $1', [id])).rowCount > 0,
    },

    mantenimientos: {
      porId: (id) => una('SELECT * FROM mantenimiento WHERE id = $1', [id], aMantenimiento),
      deVehiculo: (vehiculoId) =>
        todas(
          'SELECT * FROM mantenimiento WHERE vehiculo_id = $1 ORDER BY fecha DESC, id DESC',
          [vehiculoId],
          aMantenimiento
        ),
      crear: (m) =>
        una(
          `INSERT INTO mantenimiento (vehiculo_id, producto_id, pedido_id, fecha, kilometraje, descripcion)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [m.vehiculoId, m.productoId, m.pedidoId, m.fecha, m.kilometraje, m.descripcion],
          aMantenimiento
        ),
    },
  };
}
