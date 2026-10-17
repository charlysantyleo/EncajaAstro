export const typeDefs = `#graphql
  """Rol del usuario dentro del sistema."""
  enum Rol {
    "Compra, garage, bitacora y direcciones guardadas."
    CLIENTE
    "Como CLIENTE, con precio de mayoreo (descuentoTaller de los ajustes)."
    TALLER
    "Mostrador: cobra pagos en mostrador, ve todos los pedidos y los marca enviados o entregados."
    EMPLEADO
    "Todo: lo de EMPLEADO, el catalogo, los usuarios y los ajustes de la tienda."
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

  """Como llega el pedido al comprador."""
  enum TipoEntrega {
    "Se envia a la direccion del comprador."
    DOMICILIO
    "El comprador pasa por el a la tienda."
    TIENDA
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
    "Lo que paga quien consulta: precio de lista, o de mayoreo si su cuenta es de taller."
    precioParaTi: Float!
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

  """
  En que vehiculos embona una pieza: un modelo del catalogo en un rango de años y, si importa, un motor.
  Le aplica a cualquier coche del garage con esa marca, modelo, año (y motor).
  """
  type Compatibilidad {
    id: ID!
    tipo: TipoCompatibilidad!
    nota: String
    producto: Producto!
    marca: String!
    modelo: String!
    anioDesde: Int!
    anioHasta: Int!
    "null = cualquier motor de ese modelo."
    motor: String
  }

  """Un modelo del catalogo de vehiculos en un año, con los motores que trajo."""
  type ModeloDeVehiculo {
    id: ID!
    marca: String!
    modelo: String!
    anio: Int!
    motores: [String!]!
    "IMPORTADO (INEGI, NHTSA y FuelEconomy.gov) o PANEL (agregado o corregido por el administrador)."
    origen: String!
  }

  """Un modelo del catalogo con todos sus años, para el panel."""
  type ModeloDelCatalogo {
    marca: String!
    modelo: String!
    anios: [ModeloDeVehiculo!]!
  }

  """Resultado de buscar un vehiculo por texto ("versa 2018")."""
  type VehiculoEncontrado {
    marca: String!
    modelo: String!
    "El año escrito en la busqueda, o null si no se escribio."
    anio: Int
    desde: Int!
    hasta: Int!
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
    "Como se entrega (null en pedidos anteriores a este dato)."
    entrega: Entrega
  }

  """Direccion de envio dentro de Mexico."""
  type Direccion {
    calle: String!
    numeroExterior: String!
    numeroInterior: String
    colonia: String!
    codigoPostal: String!
    ciudad: String!
    estado: String!
    "Señas para encontrar el domicilio (entre calles, color de la fachada...)."
    referencias: String
  }

  """Entrega de un pedido: a domicilio (con direccion) o para recoger en tienda."""
  type Entrega {
    tipo: TipoEntrega!
    "Costo del envio incluido en el total del pedido (0 si se recoge en tienda o el envio salio gratis)."
    costo: Float!
    "Telefono de contacto, 10 digitos. Solo lo ve el dueño del pedido o un administrador."
    telefono: String
    "Solo en entregas a domicilio."
    direccion: Direccion
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
    "Referencia para pagar: en la caja de la tienda (TIENDA) o el codigo que se dicta en mostrador (PICKUP)."
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
    "Al crear: existencias iniciales (0 si no viene). Al editar: si no viene, no se tocan (para sumar o restar usa ajustarStock)."
    stock: Int
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

  """Entrada para declarar que una pieza embona en un modelo del catalogo, de un año a otro."""
  input CompatibilidadInput {
    productoId: ID!
    marca: String!
    modelo: String!
    anioDesde: Int!
    anioHasta: Int!
    "Vacio = cualquier motor de ese modelo."
    motor: String
    tipo: TipoCompatibilidad
    nota: String
  }

  """Entrada para agregar o corregir un modelo del catalogo de vehiculos en un rango de años."""
  input ModeloDeVehiculoInput {
    marca: String!
    modelo: String!
    anioDesde: Int!
    anioHasta: Int!
    motores: [String!]
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

  """Direccion de envio que un usuario guardo en su cuenta, con el telefono de contacto."""
  type DireccionGuardada {
    id: ID!
    telefono: String!
    calle: String!
    numeroExterior: String!
    numeroInterior: String
    colonia: String!
    codigoPostal: String!
    ciudad: String!
    estado: String!
    referencias: String
  }

  """Ajustes de la tienda que el administrador cambia desde el panel."""
  type Ajustes {
    "Cuota del envio a domicilio."
    costoEnvio: Float!
    "Importe en piezas a partir del cual el envio es gratis."
    envioGratisDesde: Float!
    "Descuento de las cuentas TALLER, en porcentaje (0 a 50)."
    descuentoTaller: Float!
  }

  """Ajustes a cambiar; los que no vengan se quedan como estan."""
  input AjustesInput {
    costoEnvio: Float
    envioGratisDesde: Float
    descuentoTaller: Float
  }

  """Lo que cuesta el envio a domicilio y a donde llega."""
  type ReglasDeEnvio {
    "Cuota fija del envio a domicilio."
    costo: Float!
    "Importe en piezas a partir del cual el envio es gratis."
    gratisDesde: Float!
    estado: String!
    "Municipios con cobertura (zona metropolitana de Guadalajara)."
    municipios: [String!]!
  }

  """Direccion a la que se envia el pedido."""
  input DireccionInput {
    calle: String!
    numeroExterior: String!
    numeroInterior: String
    colonia: String!
    "5 digitos."
    codigoPostal: String!
    "Ciudad o municipio."
    ciudad: String!
    estado: String!
    referencias: String
  }

  """Como se entrega el pedido y a quien llamar para coordinarlo."""
  input EntregaInput {
    tipo: TipoEntrega!
    "10 digitos; se aceptan espacios, guiones y la lada +52."
    telefono: String!
    "Obligatoria si el tipo es DOMICILIO. Debe estar en un municipio de reglasDeEnvio."
    direccion: DireccionInput
    "Con sesion: guarda la direccion en la cuenta para la proxima compra (sin duplicarla)."
    guardar: Boolean
  }

  """Entrada de la mutation de negocio que registra un pedido completo."""
  input PedidoInput {
    cliente: ClienteInput!
    vehiculoId: ID
    items: [ItemPedidoInput!]!
    "Sin este campo el pedido se paga al recoger (PICKUP)."
    pago: PagoInput
    "Sin este campo el pedido se recoge en tienda. Pagar al recoger (PICKUP) no admite DOMICILIO."
    entrega: EntregaInput
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

    "En cuales de los coches de mi garage embona una pieza (sin sesion: lista vacia)."
    vehiculosCompatibles(productoId: ID!): [Vehiculo!]!

    "Catalogo de vehiculos: marcas (de un año, si se indica)."
    marcasDeVehiculos(anio: Int): [String!]!
    "Modelos de una marca (de un año, si se indica)."
    modelosDeVehiculos(marca: String!, anio: Int): [String!]!
    "Años de un modelo, del mas reciente al mas antiguo."
    aniosDeVehiculo(marca: String!, modelo: String!): [Int!]!
    "Motores de un modelo en un año (sin año: de todos sus años). Vacio si el catalogo no los conoce."
    motoresDeVehiculo(marca: String!, modelo: String!, anio: Int): [String!]!
    "Busca en el catalogo por texto: 'versa', 'nissan versa 2018'."
    buscarVehiculos(texto: String!, limite: Int): [VehiculoEncontrado!]!
    "Para el panel: los modelos de una marca con sus años y motores."
    catalogoDeMarca(marca: String!): [ModeloDelCatalogo!]!

    "Vehiculos del garage, con filtro por dueno o por marca."
    vehiculos(usuarioId: ID, marca: String): [Vehiculo!]!
    vehiculo(id: ID!): Vehiculo

    compatibilidades(productoId: ID, vehiculoId: ID): [Compatibilidad!]!

    usuarios(rol: Rol): [Usuario!]!
    usuario(id: ID!): Usuario

    "Historial de pedidos, con filtro por usuario o por status."
    pedidos(usuarioId: ID, status: StatusPedido): [Pedido!]!
    pedido(id: ID!): Pedido

    "Personal (EMPLEADO o ADMIN): el pedido de un codigo de mostrador, para revisarlo antes de cobrar."
    pedidoPorCodigoDeMostrador(codigo: String!): Pedido

    "Metodos de pago que ofrece el checkout y cuales estan configurados."
    opcionesDePago: [OpcionPago!]!

    "Pedido a partir de la referencia de su pago. Sirve a la pagina de pago, tambien para invitados."
    pedidoPorReferencia(referencia: ID!): Pedido

    "Costo y cobertura del envio a domicilio."
    reglasDeEnvio: ReglasDeEnvio!

    "Ajustes actuales de la tienda."
    ajustesDeTienda: Ajustes!

    "Direcciones guardadas del usuario del token, la mas reciente primero."
    misDirecciones: [DireccionGuardada!]!

    "Bitacora de servicios de un vehiculo."
    mantenimientos(vehiculoId: ID!): [Mantenimiento!]!
  }

  type Mutation {
    "Crea una cuenta de cliente con correo y contraseña y regresa la sesion."
    crearCuenta(nombre: String!, email: String!, password: String!): Sesion!

    "Inicia sesion con correo y contraseña."
    iniciarSesion(email: String!, password: String!): Sesion!

    "Manda al correo un enlace para elegir contraseña nueva. Siempre responde true, exista o no la cuenta."
    solicitarRecuperacion(email: String!): Boolean!

    "Con el token del enlace, cambia la contraseña y regresa la sesion. El enlace dura una hora y sirve una sola vez."
    restablecerPassword(token: String!, password: String!): Sesion!

    crearCategoria(datos: CategoriaInput!): Categoria!

    crearProducto(datos: ProductoInput!): Producto!
    actualizarProducto(id: ID!, datos: ProductoInput!): Producto
    eliminarProducto(id: ID!): Boolean!

    agregarVehiculo(datos: VehiculoInput!): Vehiculo!
    actualizarVehiculo(id: ID!, datos: VehiculoInput!): Vehiculo
    eliminarVehiculo(id: ID!): Boolean!

    "Solo ADMIN: da de alta un usuario con cualquier rol."
    registrarUsuario(datos: UsuarioInput!): Usuario!

    "Solo ADMIN: declara que una pieza embona en un modelo de un año a otro. Rechaza rangos que se enciman."
    registrarCompatibilidad(datos: CompatibilidadInput!): Compatibilidad!

    "Solo ADMIN: agrega un modelo al catalogo de vehiculos (o reemplaza sus motores) en un rango de años."
    guardarModeloDeVehiculo(datos: ModeloDeVehiculoInput!): [ModeloDeVehiculo!]!

    "Solo ADMIN: quita del catalogo un modelo en un rango de años. Regresa cuantos años quito."
    quitarModeloDeVehiculo(marca: String!, modelo: String!, anioDesde: Int!, anioHasta: Int!): Int!

    "Mutation de negocio del modulo de compra: valida stock y compatibilidad, calcula el total, descuenta existencias, crea el pedido con su detalle e inicia el cobro."
    registrarPedido(datos: PedidoInput!): Pedido!

    "Pregunta a la pasarela como va el cobro y pone el pedido al dia (PAGADO si se aprobo, CANCELADO si se rechazo o vencio)."
    verificarPago(referencia: ID!): Pedido!

    "Personal (EMPLEADO o ADMIN): el comprador pago en mostrador; el pedido de ese codigo queda PAGADO."
    confirmarPagoEnMostrador(codigo: String!): Pedido!

    "Personal (EMPLEADO o ADMIN): marca un pedido pagado como ENVIADO (solo a domicilio) o ENTREGADO."
    cambiarStatusDePedido(id: ID!, status: StatusPedido!): Pedido!

    "Solo ADMIN: cambia el rol de otra cuenta (no el propio)."
    cambiarRol(usuarioId: ID!, rol: Rol!): Usuario!

    "Solo ADMIN: costo de envio, envio gratis y descuento de taller."
    actualizarAjustes(datos: AjustesInput!): Ajustes!

    "Solo ADMIN: suma (o resta, con negativo) piezas a las existencias de un producto."
    ajustarStock(productoId: ID!, cantidad: Int!): Producto!

    "Solo ADMIN: guarda una foto de producto (WebP, JPG o PNG en base64, maximo 1.5 MB) y regresa su ruta para usarla en imagen."
    subirImagen(tipo: String!, base64: String!): String!

    "Solo ADMIN: quita una compatibilidad pieza-vehiculo."
    eliminarCompatibilidad(id: ID!): Boolean!

    "Borra una direccion guardada del usuario del token."
    eliminarDireccion(id: ID!): Boolean!

    "Mutation de negocio del modulo de garage: valida compatibilidad y kilometraje, guarda el servicio en la bitacora y actualiza el odometro del vehiculo."
    registrarMantenimiento(datos: MantenimientoInput!): Mantenimiento!
  }

  type Subscription {
    "Se dispara cada vez que cambia el stock de un producto (compra o edicion de catalogo), para refrescar el catalogo sin recargar la pagina."
    stockActualizado(productoId: ID): Producto!
  }
`;
