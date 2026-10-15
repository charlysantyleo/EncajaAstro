// Adaptador de entrada GraphQL: traduce cada operacion del schema a un caso de uso.
// Aqui NO hay SQL ni reglas de negocio; solo "que caso de uso atiende esta operacion".
// contexto.actor = quien hace la peticion (sale del JWT), o null si es invitado.
import { withFilter } from 'graphql-subscriptions';

/**
 * @param {{ catalogo, garage, pedidos, cuentas, pagos, direcciones }} casos  casos de uso ya armados (ver src/contenedor.js)
 * @param {import('../../../puertos/salida.js').Eventos} eventos
 */
export function crearResolvers({ catalogo, garage, pedidos, cuentas, pagos, direcciones }, eventos) {
  return {
    Query: {
      yo: (_, __, { actor }) => cuentas.yo(actor),

      categorias: () => catalogo.categorias(),
      categoria: (_, { id }) => catalogo.categoria(id),
      productos: (_, filtros) => catalogo.buscarProductos(filtros),
      producto: (_, { id }) => catalogo.producto(id),
      productosCompatibles: (_, args) => catalogo.productosCompatibles(args),
      vehiculosCompatibles: (_, { productoId }) => catalogo.vehiculosCompatibles(productoId),
      compatibilidades: (_, filtros) => catalogo.compatibilidades(filtros),

      vehiculos: (_, filtros, { actor }) => garage.vehiculos(actor, filtros),
      vehiculo: (_, { id }, { actor }) => garage.vehiculo(actor, id),
      mantenimientos: (_, { vehiculoId }, { actor }) => garage.mantenimientos(actor, vehiculoId),

      usuarios: (_, filtros, { actor }) => cuentas.usuarios(actor, filtros),
      usuario: (_, { id }, { actor }) => cuentas.usuario(actor, id),

      pedidos: (_, filtros, { actor }) => pedidos.pedidos(actor, filtros),
      pedido: (_, { id }, { actor }) => pedidos.pedido(actor, id),

      opcionesDePago: () => pagos.opciones(),
      pedidoPorReferencia: (_, { referencia }) => pagos.pedidoPorReferencia(referencia),
      pedidoPorCodigoDeMostrador: (_, { codigo }, { actor }) => pagos.pedidoPorCodigoDeMostrador(actor, codigo),

      reglasDeEnvio: () => direcciones.reglas(),
      misDirecciones: (_, __, { actor }) => direcciones.mias(actor),
    },

    Mutation: {
      crearCuenta: (_, datos) => cuentas.crearCuenta(datos),
      iniciarSesion: (_, datos) => cuentas.iniciarSesion(datos),
      solicitarRecuperacion: (_, datos) => cuentas.solicitarRecuperacion(datos),
      restablecerPassword: (_, datos) => cuentas.restablecerPassword(datos),
      registrarUsuario: (_, { datos }, { actor }) => cuentas.registrarUsuario(actor, datos),

      crearCategoria: (_, { datos }, { actor }) => catalogo.crearCategoria(actor, datos),
      crearProducto: (_, { datos }, { actor }) => catalogo.crearProducto(actor, datos),
      actualizarProducto: (_, { id, datos }, { actor }) => catalogo.actualizarProducto(actor, id, datos),
      eliminarProducto: (_, { id }, { actor }) => catalogo.eliminarProducto(actor, id),
      registrarCompatibilidad: (_, { datos }, { actor }) => catalogo.registrarCompatibilidad(actor, datos),

      agregarVehiculo: (_, { datos }, { actor }) => garage.agregarVehiculo(actor, datos),
      actualizarVehiculo: (_, { id, datos }, { actor }) => garage.actualizarVehiculo(actor, id, datos),
      eliminarVehiculo: (_, { id }, { actor }) => garage.eliminarVehiculo(actor, id),
      registrarMantenimiento: (_, { datos }, { actor }) => garage.registrarMantenimiento(actor, datos),

      registrarPedido: (_, { datos }, { actor }) => pedidos.registrarPedido(actor, datos),
      verificarPago: (_, { referencia }) => pagos.verificar(referencia),
      eliminarDireccion: (_, { id }, { actor }) => direcciones.eliminar(actor, id),
      confirmarPagoEnMostrador: (_, { codigo }, { actor }) => pagos.confirmarPagoEnMostrador(actor, codigo),
    },

    Subscription: {
      stockActualizado: {
        subscribe: withFilter(
          () => eventos.escucharStock(),
          (payload, { productoId }) => !productoId || String(payload.stockActualizado.id) === String(productoId)
        ),
      },
    },

    // Campos anidados: los objetos del dominio ya traen numeroParte, precio, etc.;
    // aqui solo se resuelven las relaciones.
    Usuario: {
      vehiculos: (usuario) => cuentas.vehiculosDe(usuario),
      pedidos: (usuario) => cuentas.pedidosDe(usuario),
    },
    Categoria: {
      productos: (categoria) => catalogo.productosDeCategoria(categoria),
    },
    Producto: {
      categoria: (producto) => catalogo.categoriaDe(producto),
      compatibilidades: (producto) => catalogo.compatibilidades({ productoId: producto.id }),
    },
    Vehiculo: {
      usuario: (vehiculo, _, { actor }) => garage.duenoDe(actor, vehiculo),
      compatibilidades: (vehiculo) => garage.compatibilidadesDe(vehiculo),
      mantenimientos: (vehiculo, _, { actor }) => garage.bitacoraDe(actor, vehiculo),
    },
    Compatibilidad: {
      producto: (compatibilidad) => catalogo.producto(compatibilidad.productoId),
      vehiculo: (compatibilidad) => garage.vehiculoPorId(compatibilidad.vehiculoId),
    },
    DetallePedido: {
      producto: (detalle) => catalogo.producto(detalle.productoId),
    },
    Pedido: {
      usuario: (pedido) => cuentas.usuarioPorId(pedido.usuarioId),
      vehiculo: (pedido) => (pedido.vehiculoId ? garage.vehiculoPorId(pedido.vehiculoId) : null),
      detalles: (pedido) => pedidos.detallesDe(pedido),
      pago: (pedido) => pagos.pagoDe(pedido),
      entrega: (pedido, _, { actor }) => pedidos.entregaDe(actor, pedido),
    },
    Mantenimiento: {
      vehiculo: (mantenimiento) => garage.vehiculoPorId(mantenimiento.vehiculoId),
      producto: (mantenimiento) => (mantenimiento.productoId ? catalogo.producto(mantenimiento.productoId) : null),
      pedido: (mantenimiento) => (mantenimiento.pedidoId ? pedidos.pedidoPorId(mantenimiento.pedidoId) : null),
    },
  };
}
