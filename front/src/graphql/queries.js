export const QUERY_CATEGORIAS = `
  query Categorias {
    categorias { id nombre descripcion }
  }
`;

export const QUERY_PRODUCTOS = `
  query Productos($categoriaId: ID, $vehiculoId: ID, $texto: String, $soloDirectos: Boolean, $limite: Int) {
    productos(
      categoriaId: $categoriaId
      vehiculoId: $vehiculoId
      texto: $texto
      soloDirectos: $soloDirectos
      limite: $limite
    ) {
      id
      nombre
      numeroParte
      marca
      precio
      precioParaTi
      imagen
      stock
      categoria { id nombre }
      compatibilidades { tipo marca modelo anioDesde anioHasta motor }
    }
  }
`;

export const QUERY_PRODUCTO = `
  query Producto($id: ID!) {
    producto(id: $id) {
      id
      nombre
      descripcion
      numeroParte
      marca
      precio
      precioParaTi
      imagen
      stock
      categoria { nombre }
      compatibilidades {
        tipo
        nota
        marca
        modelo
        anioDesde
        anioHasta
        motor
      }
    }
  }
`;

export const QUERY_PRODUCTO_STOCK = `
  query ProductoStock($id: ID!) {
    producto(id: $id) { id stock precioParaTi }
  }
`;

export const QUERY_VEHICULOS = `
  query Vehiculos($usuarioId: ID) {
    vehiculos(usuarioId: $usuarioId) {
      id
      apodo
      marca
      modelo
      anio
      motor
      tipoCombustible
      kilometraje
    }
  }
`;

export const QUERY_VEHICULO = `
  query Vehiculo($id: ID!) {
    vehiculo(id: $id) {
      id
      apodo
      marca
      modelo
      anio
      motor
      tipoCombustible
      kilometraje
      mantenimientos {
        id
        fecha
        kilometraje
        descripcion
        producto { id nombre }
        pedido { id status }
      }
    }
  }
`;

export const QUERY_PEDIDOS = `
  query Pedidos($usuarioId: ID) {
    pedidos(usuarioId: $usuarioId) {
      id
      fecha
      total
      status
      vehiculo { marca modelo anio }
      detalles { cantidad importe producto { id nombre } }
    }
  }
`;

export const MUTATION_AGREGAR_VEHICULO = `
  mutation AgregarVehiculo($datos: VehiculoInput!) {
    agregarVehiculo(datos: $datos) {
      id
      apodo
      marca
      modelo
      anio
      motor
      tipoCombustible
      kilometraje
    }
  }
`;

// Un pedido con su cobro: lo que pintan la confirmacion y la pagina de pago.
const CAMPOS_PEDIDO_CON_PAGO = `
  id
  fecha
  total
  status
  vehiculo { marca modelo anio }
  detalles { cantidad importe producto { id nombre } }
  pago { referencia metodo proveedor status monto url codigo vence detalle }
  entrega {
    tipo
    costo
    direccion { calle numeroExterior numeroInterior colonia codigoPostal ciudad estado referencias }
  }
`;

export const MUTATION_REGISTRAR_PEDIDO = `
  mutation RegistrarPedido($datos: PedidoInput!) {
    registrarPedido(datos: $datos) {${CAMPOS_PEDIDO_CON_PAGO}}
  }
`;

export const QUERY_OPCIONES_DE_PAGO = `
  query OpcionesDePago {
    opcionesDePago { metodo proveedor disponible motivo llavePublica }
  }
`;

export const QUERY_PEDIDO_POR_REFERENCIA = `
  query PedidoPorReferencia($referencia: ID!) {
    pedidoPorReferencia(referencia: $referencia) {${CAMPOS_PEDIDO_CON_PAGO}}
  }
`;

export const MUTATION_VERIFICAR_PAGO = `
  mutation VerificarPago($referencia: ID!) {
    verificarPago(referencia: $referencia) {${CAMPOS_PEDIDO_CON_PAGO}}
  }
`;

export const MUTATION_REGISTRAR_MANTENIMIENTO = `
  mutation RegistrarMantenimiento($datos: MantenimientoInput!) {
    registrarMantenimiento(datos: $datos) {
      id
      fecha
      kilometraje
      descripcion
      producto { nombre }
      vehiculo { id kilometraje }
    }
  }
`;

const CAMPOS_SESION = `
  token
  usuario {
    id
    nombre
    email
    rol
  }
`;

export const MUTATION_INICIAR_SESION = `
  mutation IniciarSesion($email: String!, $password: String!) {
    iniciarSesion(email: $email, password: $password) {${CAMPOS_SESION}}
  }
`;

export const MUTATION_CREAR_CUENTA = `
  mutation CrearCuenta($nombre: String!, $email: String!, $password: String!) {
    crearCuenta(nombre: $nombre, email: $email, password: $password) {${CAMPOS_SESION}}
  }
`;

export const QUERY_YO = `
  query Yo {
    yo {
      id
      nombre
      email
      rol
    }
  }
`;

export const QUERY_REGLAS_DE_ENVIO = `
  query ReglasDeEnvio {
    reglasDeEnvio { costo gratisDesde estado municipios }
  }
`;

export const QUERY_MIS_DIRECCIONES = `
  query MisDirecciones {
    misDirecciones { id telefono calle numeroExterior numeroInterior colonia codigoPostal ciudad estado referencias }
  }
`;

export const MUTATION_ELIMINAR_DIRECCION = `
  mutation EliminarDireccion($id: ID!) {
    eliminarDireccion(id: $id)
  }
`;

export const MUTATION_SOLICITAR_RECUPERACION = `
  mutation SolicitarRecuperacion($email: String!) {
    solicitarRecuperacion(email: $email)
  }
`;

export const MUTATION_RESTABLECER_PASSWORD = `
  mutation RestablecerPassword($token: String!, $password: String!) {
    restablecerPassword(token: $token, password: $password) {${CAMPOS_SESION}}
  }
`;

// Cobro en mostrador (solo admin): el pedido con quien lo compro, para revisarlo antes de cobrar.
const CAMPOS_PEDIDO_MOSTRADOR = `
  id
  fecha
  total
  status
  usuario { nombre email }
  detalles { cantidad importe producto { id nombre } }
  pago { metodo status codigo monto }
`;

export const QUERY_PEDIDO_POR_CODIGO = `
  query PedidoPorCodigoDeMostrador($codigo: String!) {
    pedidoPorCodigoDeMostrador(codigo: $codigo) {${CAMPOS_PEDIDO_MOSTRADOR}}
  }
`;

export const MUTATION_CONFIRMAR_PAGO_MOSTRADOR = `
  mutation ConfirmarPagoEnMostrador($codigo: String!) {
    confirmarPagoEnMostrador(codigo: $codigo) {${CAMPOS_PEDIDO_MOSTRADOR}}
  }
`;

// ---------- panel de administracion ----------

const CAMPOS_PEDIDO_PANEL = `
  id
  fecha
  total
  status
  usuario { nombre email }
  entrega {
    tipo
    telefono
    costo
    direccion { calle numeroExterior numeroInterior colonia codigoPostal ciudad estado referencias }
  }
  pago { metodo proveedor status codigo }
  detalles { cantidad importe producto { id nombre numeroParte } }
`;

export const QUERY_PEDIDOS_PANEL = `
  query PedidosPanel {
    pedidos {${CAMPOS_PEDIDO_PANEL}}
  }
`;

export const MUTATION_CAMBIAR_STATUS_PEDIDO = `
  mutation CambiarStatusDePedido($id: ID!, $status: StatusPedido!) {
    cambiarStatusDePedido(id: $id, status: $status) {${CAMPOS_PEDIDO_PANEL}}
  }
`;

export const QUERY_PRODUCTOS_PANEL = `
  query ProductosPanel {
    productos { id nombre descripcion numeroParte marca precio stock imagen categoria { id nombre } }
  }
`;

export const QUERY_PRODUCTO_PANEL = `
  query ProductoPanel($id: ID!) {
    producto(id: $id) {
      id nombre descripcion numeroParte marca precio stock imagen
      categoria { id }
      compatibilidades { id tipo nota marca modelo anioDesde anioHasta motor }
    }
  }
`;


export const MUTATION_CREAR_PRODUCTO = `
  mutation CrearProducto($datos: ProductoInput!) {
    crearProducto(datos: $datos) { id }
  }
`;

export const MUTATION_ACTUALIZAR_PRODUCTO = `
  mutation ActualizarProducto($id: ID!, $datos: ProductoInput!) {
    actualizarProducto(id: $id, datos: $datos) { id }
  }
`;

export const MUTATION_AJUSTAR_STOCK = `
  mutation AjustarStock($productoId: ID!, $cantidad: Int!) {
    ajustarStock(productoId: $productoId, cantidad: $cantidad) { id stock }
  }
`;

export const MUTATION_SUBIR_IMAGEN = `
  mutation SubirImagen($tipo: String!, $base64: String!) {
    subirImagen(tipo: $tipo, base64: $base64)
  }
`;

export const MUTATION_REGISTRAR_COMPATIBILIDAD = `
  mutation RegistrarCompatibilidad($datos: CompatibilidadInput!) {
    registrarCompatibilidad(datos: $datos) { id }
  }
`;

export const MUTATION_ELIMINAR_COMPATIBILIDAD = `
  mutation EliminarCompatibilidad($id: ID!) {
    eliminarCompatibilidad(id: $id)
  }
`;

export const QUERY_USUARIOS_PANEL = `
  query UsuariosPanel {
    usuarios { id nombre email rol }
  }
`;

export const MUTATION_CAMBIAR_ROL = `
  mutation CambiarRol($usuarioId: ID!, $rol: Rol!) {
    cambiarRol(usuarioId: $usuarioId, rol: $rol) { id rol }
  }
`;

export const QUERY_AJUSTES = `
  query Ajustes {
    ajustesDeTienda { costoEnvio envioGratisDesde descuentoTaller }
  }
`;

export const MUTATION_ACTUALIZAR_AJUSTES = `
  mutation ActualizarAjustes($datos: AjustesInput!) {
    actualizarAjustes(datos: $datos) { costoEnvio envioGratisDesde descuentoTaller }
  }
`;

export const MUTATION_CREAR_CATEGORIA = `
  mutation CrearCategoria($datos: CategoriaInput!) {
    crearCategoria(datos: $datos) { id nombre descripcion }
  }
`;

// ---------- catalogo de vehiculos ----------

export const QUERY_BUSCAR_VEHICULOS = `
  query BuscarVehiculos($texto: String!, $limite: Int) {
    buscarVehiculos(texto: $texto, limite: $limite) { marca modelo anio desde hasta }
  }
`;

export const QUERY_MARCAS_DE_VEHICULOS = `
  query MarcasDeVehiculos($anio: Int) {
    marcasDeVehiculos(anio: $anio)
  }
`;

export const QUERY_MODELOS_DE_VEHICULOS = `
  query ModelosDeVehiculos($marca: String!, $anio: Int) {
    modelosDeVehiculos(marca: $marca, anio: $anio)
  }
`;

export const QUERY_ANIOS_DE_VEHICULO = `
  query AniosDeVehiculo($marca: String!, $modelo: String!) {
    aniosDeVehiculo(marca: $marca, modelo: $modelo)
  }
`;

export const QUERY_MOTORES_DE_VEHICULO = `
  query MotoresDeVehiculo($marca: String!, $modelo: String!, $anio: Int) {
    motoresDeVehiculo(marca: $marca, modelo: $modelo, anio: $anio)
  }
`;

export const QUERY_CATALOGO_DE_MARCA = `
  query CatalogoDeMarca($marca: String!) {
    catalogoDeMarca(marca: $marca) { marca modelo anios { id anio motores origen } }
  }
`;

export const MUTATION_GUARDAR_MODELO_DE_VEHICULO = `
  mutation GuardarModeloDeVehiculo($datos: ModeloDeVehiculoInput!) {
    guardarModeloDeVehiculo(datos: $datos) { id anio motores origen }
  }
`;

export const MUTATION_QUITAR_MODELO_DE_VEHICULO = `
  mutation QuitarModeloDeVehiculo($marca: String!, $modelo: String!, $anioDesde: Int!, $anioHasta: Int!) {
    quitarModeloDeVehiculo(marca: $marca, modelo: $modelo, anioDesde: $anioDesde, anioHasta: $anioHasta)
  }
`;
