export const typeDefs = `#graphql
  """Rol del usuario dentro del sistema."""
  enum Rol {
    CLIENTE
    TALLER
    ADMIN
  }

  """Combustible que usa el vehiculo."""
  enum TipoCombustible {
    GASOLINA
    DIESEL
    HIBRIDO
    ELECTRICO
  }

  """Que tan exacto es el ajuste de una pieza en un vehiculo."""
  enum TipoCompatibilidad {
    DIRECTO
    EQUIVALENCIA
  }

  """Estado del ciclo de vida de un pedido."""
  enum StatusPedido {
    PENDIENTE
    PAGADO
    ENVIADO
    ENTREGADO
    CANCELADO
  }

  """Como se cobra un pedido."""
  enum MetodoPago {
    "Tarjeta de credito o debito, se cobra al confirmar."
    TARJETA
    "Efectivo en tienda de conveniencia, con una ficha de pago."
    TIENDA
    "Link para pagar despues o compartirlo."
    LINK
    "Se paga en mostrador al recoger el pedido."
    PICKUP
  }

  """Pasarela que procesa el cobro."""
  enum ProveedorPago {
    MERCADO_PAGO
    PAYPAL
  }

  """Donde se paga una ficha en efectivo. PAYCASH cubre 7-Eleven, Circle K, Soriana, Extra y Calimax."""
  enum TiendaPago {
    OXXO
    PAYCASH
  }

  """Estado del cobro de un pedido."""
  enum StatusPago {
    PENDIENTE
    APROBADO
    RECHAZADO
    CANCELADO
  }

  """Cuenta de usuario: compra refacciones y administra su garage."""
  type Usuario {
    id: ID!
    nombre: String!
    email: String!
    rol: Rol!
    vehiculos: [Vehiculo!]!
    pedidos: [Pedido!]!
  }

  """Resultado de entrar o crear cuenta: el JWT que el cliente debe mandar en Authorization y el usuario."""
  type Sesion {
    token: String!
    usuario: Usuario!
  }

  """Categoria del catalogo, por sistema del vehiculo."""
  type Categoria {
    id: ID!
    nombre: String!
    descripcion: String
    productos: [Producto!]!
  }

  """Refaccion disponible en el catalogo."""
  type Producto {
    id: ID!
    nombre: String!
    descripcion: String
    numeroParte: String!
    marca: String
    precio: Float!
    imagen: String
    stock: Int!
    categoria: Categoria
    compatibilidades: [Compatibilidad!]!
  }

  """Vehiculo registrado en el garage de un usuario."""
  type Vehiculo {
    id: ID!
    apodo: String
    marca: String!
    modelo: String!
    anio: Int!
    motor: String
    tipoCombustible: TipoCombustible!
    kilometraje: Int
    usuario: Usuario
    compatibilidades: [Compatibilidad!]!
    mantenimientos: [Mantenimiento!]!
  }

  """Relacion muchos a muchos entre una pieza y un vehiculo, con el tipo de ajuste."""
  type Compatibilidad {
    id: ID!
    tipo: TipoCompatibilidad!
    nota: String
    producto: Producto!
    vehiculo: Vehiculo!
  }

  """Renglon de un pedido: que producto, cuantas piezas y a que precio."""
  type DetallePedido {
    id: ID!
    cantidad: Int!
    precioUnitario: Float!
    importe: Float!
    producto: Producto!
  }

  """Pedido de compra de un usuario, opcionalmente ligado a un vehiculo."""
  type Pedido {
    id: ID!
    fecha: String!
    total: Float!
    status: StatusPedido!
    usuario: Usuario!
    vehiculo: Vehiculo
    detalles: [DetallePedido!]!
    "Cobro del pedido (null en pedidos anteriores a los pagos en linea)."
    pago: Pago
  }

  """Cobro de un pedido: con que metodo se paga y como va."""
  type Pago {
    "Clave larga y aleatoria; quien la tiene puede consultar el pedido aunque no tenga cuenta."
    referencia: ID!
    metodo: MetodoPago!
    proveedor: ProveedorPago
    status: StatusPago!
    monto: Float!
    "Link para pagar (LINK) o ficha imprimible (TIENDA)."
    url: String
    "Numero de referencia para pagar en la caja de la tienda."
    codigo: String
    "Fecha limite para pagar, en ISO 8601."
    vence: String
    "Aclaracion para el comprador (por ejemplo, por que se rechazo)."
    detalle: String
  }

  """Un metodo de pago que el checkout puede ofrecer y si esta listo para usarse."""
  type OpcionPago {
    metodo: MetodoPago!
    proveedor: ProveedorPago
    disponible: Boolean!
    "Por que no esta disponible (falta configurar la pasarela)."
    motivo: String
    "Llave publica de la pasarela para tokenizar la tarjeta en el navegador (solo TARJETA)."
    llavePublica: String
  }

  """Servicio registrado en la bitacora de un vehiculo."""
  type Mantenimiento {
    id: ID!
    fecha: String!
    kilometraje: Int
    descripcion: String!
    vehiculo: Vehiculo!
    producto: Producto
    pedido: Pedido
  }

  """Entrada para crear o actualizar una categoria."""
  input CategoriaInput {
    nombre: String!
    descripcion: String
  }

  """Entrada para crear o actualizar un producto."""
  input ProductoInput {
    nombre: String!
    descripcion: String
    numeroParte: String!
    marca: String
    precio: Float!
    imagen: String
    stock: Int!
    categoriaId: ID
  }

  """Entrada para registrar un usuario."""
  input UsuarioInput {
    nombre: String!
    email: String!
    password: String
    rol: Rol
  }

  """Entrada para agregar o actualizar un vehiculo del garage."""
  input VehiculoInput {
    usuarioId: ID
    apodo: String
    marca: String!
    modelo: String!
    anio: Int!
    motor: String
    tipoCombustible: TipoCombustible
    kilometraje: Int
  }

  """Entrada para declarar que una pieza embona en un vehiculo."""
  input CompatibilidadInput {
    productoId: ID!
    vehiculoId: ID!
    tipo: TipoCompatibilidad
    nota: String
  }

  """Datos del comprador cuando el pedido se hace como invitado."""
  input ClienteInput {
    nombre: String!
    email: String!
  }

  """Renglon del carrito que se envia al registrar un pedido."""
  input ItemPedidoInput {
    productoId: ID!
    cantidad: Int!
  }

  """Tarjeta ya tokenizada por la pasarela en el navegador. El numero de tarjeta nunca pasa por este servidor."""
  input TarjetaInput {
    token: String!
    "Marca de la tarjeta segun la pasarela (visa, master, debvisa...)."
    metodoId: String!
    emisorId: String
    cuotas: Int
  }

  """Como se va a cobrar el pedido."""
  input PagoInput {
    metodo: MetodoPago!
    "Solo hace falta para LINK, que puede salir por cualquiera de las dos pasarelas."
    proveedor: ProveedorPago
    "Solo TIENDA; por defecto OXXO."
    tienda: TiendaPago
    "Solo TARJETA."
    tarjeta: TarjetaInput
  }

  """Entrada de la mutation de negocio que registra un pedido completo."""
  input PedidoInput {
    cliente: ClienteInput!
    vehiculoId: ID
    items: [ItemPedidoInput!]!
    "Sin este campo el pedido se paga al recoger (PICKUP)."
    pago: PagoInput
  }

  """Entrada de la mutation de negocio que registra un servicio en la bitacora."""
  input MantenimientoInput {
    vehiculoId: ID!
    productoId: ID
    pedidoId: ID
    fecha: String
    kilometraje: Int
    descripcion: String!
  }

  type Query {
    "Usuario dueño del token enviado (null si la peticion es de un invitado)."
    yo: Usuario

    "Lista de categorias del catalogo."
    categorias: [Categoria!]!
    categoria(id: ID!): Categoria

    "Catalogo con filtros combinables de categoria, vehiculo, texto y precio."
    productos(
      categoriaId: ID
      vehiculoId: ID
      texto: String
      precioMin: Float
      precioMax: Float
      soloDirectos: Boolean
      limite: Int
      desde: Int
    ): [Producto!]!
    producto(id: ID!): Producto

    "Que piezas embonan en un vehiculo dado."
    productosCompatibles(vehiculoId: ID!, categoriaId: ID, soloDirectos: Boolean): [Producto!]!

    "Relacion inversa: en que vehiculos entra una pieza."
    vehiculosCompatibles(productoId: ID!): [Vehiculo!]!

    "Vehiculos del garage, con filtro por dueno o por marca."
    vehiculos(usuarioId: ID, marca: String): [Vehiculo!]!
    vehiculo(id: ID!): Vehiculo

    compatibilidades(productoId: ID, vehiculoId: ID): [Compatibilidad!]!

    usuarios(rol: Rol): [Usuario!]!
    usuario(id: ID!): Usuario

    "Historial de pedidos, con filtro por usuario o por status."
    pedidos(usuarioId: ID, status: StatusPedido): [Pedido!]!
    pedido(id: ID!): Pedido

    "Metodos de pago que ofrece el checkout y cuales estan configurados."
    opcionesDePago: [OpcionPago!]!

    "Pedido a partir de la referencia de su pago. Sirve a la pagina de pago, tambien para invitados."
    pedidoPorReferencia(referencia: ID!): Pedido

    "Bitacora de servicios de un vehiculo."
    mantenimientos(vehiculoId: ID!): [Mantenimiento!]!
  }

  type Mutation {
    "Crea una cuenta de cliente con correo y contraseña y regresa la sesion."
    crearCuenta(nombre: String!, email: String!, password: String!): Sesion!

    "Inicia sesion con correo y contraseña."
    iniciarSesion(email: String!, password: String!): Sesion!

    crearCategoria(datos: CategoriaInput!): Categoria!

    crearProducto(datos: ProductoInput!): Producto!
    actualizarProducto(id: ID!, datos: ProductoInput!): Producto
    eliminarProducto(id: ID!): Boolean!

    agregarVehiculo(datos: VehiculoInput!): Vehiculo!
    actualizarVehiculo(id: ID!, datos: VehiculoInput!): Vehiculo
    eliminarVehiculo(id: ID!): Boolean!

    "Solo ADMIN: da de alta un usuario con cualquier rol."
    registrarUsuario(datos: UsuarioInput!): Usuario!

    "Declara que una pieza embona en un vehiculo. Rechaza duplicados."
    registrarCompatibilidad(datos: CompatibilidadInput!): Compatibilidad!

    "Mutation de negocio del modulo de compra: valida stock y compatibilidad, calcula el total, descuenta existencias, crea el pedido con su detalle e inicia el cobro."
    registrarPedido(datos: PedidoInput!): Pedido!

    "Pregunta a la pasarela como va el cobro y pone el pedido al dia (PAGADO si se aprobo, CANCELADO si se rechazo o vencio)."
    verificarPago(referencia: ID!): Pedido!

    "Mutation de negocio del modulo de garage: valida compatibilidad y kilometraje, guarda el servicio en la bitacora y actualiza el odometro del vehiculo."
    registrarMantenimiento(datos: MantenimientoInput!): Mantenimiento!
  }

  type Subscription {
    "Se dispara cada vez que cambia el stock de un producto (compra o edicion de catalogo), para refrescar el catalogo sin recargar la pagina."
    stockActualizado(productoId: ID): Producto!
  }
`;
