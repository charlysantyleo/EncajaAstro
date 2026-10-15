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
  f && { id: f.id, productoId: f.producto_id, vehiculoId: f.vehiculo_id, tipo: f.tipo, nota: f.nota };
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
          ['compatibilidad.vehiculo_id = ?', vehiculoId],
          ["compatibilidad.tipo = 'DIRECTO'", Boolean(vehiculoId && soloDirectos)],
          ['producto.categoria_id = ?', categoriaId],
          ['(producto.nombre ILIKE ? OR producto.numero_parte ILIKE ? OR producto.marca ILIKE ?)', texto ? `%${texto}%` : null],
          ['producto.precio >= ?', precioMin],
          ['producto.precio <= ?', precioMax],
        ]);
        const join = vehiculoId ? ' JOIN compatibilidad ON compatibilidad.producto_id = producto.id' : '';
        return todas(`SELECT DISTINCT producto.* FROM producto${join}${where} ORDER BY producto.nombre`, parametros, aProducto);
      },
      crear: (p) =>
        una(
          `INSERT INTO producto (nombre, descripcion, numero_parte, marca, precio, imagen, stock, categoria_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [p.nombre, p.descripcion, p.numeroParte, p.marca, p.precio, p.imagen, p.stock, p.categoriaId],
          aProducto
        ),
      actualizar: (id, p) =>
        una(
          `UPDATE producto SET nombre = $1, descripcion = $2, numero_parte = $3, marca = $4,
             precio = $5, imagen = $6, stock = $7, categoria_id = $8
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
      compatiblesCon: (productoId) =>
        todas(
          `SELECT vehiculo.* FROM vehiculo
           JOIN compatibilidad ON compatibilidad.vehiculo_id = vehiculo.id
           WHERE compatibilidad.producto_id = $1
           ORDER BY vehiculo.marca, vehiculo.modelo, vehiculo.anio`,
          [productoId],
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
      listar({ productoId, vehiculoId } = {}) {
        const { where, parametros } = armarWhere([
          ['producto_id = ?', productoId],
          ['vehiculo_id = ?', vehiculoId],
        ]);
        return todas(`SELECT * FROM compatibilidad${where}`, parametros, aCompatibilidad);
      },
      buscar: (productoId, vehiculoId) =>
        una(
          'SELECT * FROM compatibilidad WHERE producto_id = $1 AND vehiculo_id = $2',
          [productoId, vehiculoId],
          aCompatibilidad
        ),
      crear: ({ productoId, vehiculoId, tipo, nota }) =>
        una(
          'INSERT INTO compatibilidad (producto_id, vehiculo_id, tipo, nota) VALUES ($1, $2, $3, $4) RETURNING *',
          [productoId, vehiculoId, tipo, nota],
          aCompatibilidad
        ),
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
