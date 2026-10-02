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
      stock
      categoria { id nombre }
      compatibilidades { tipo vehiculo { id } }
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
      stock
      categoria { nombre }
      compatibilidades {
        tipo
        nota
        vehiculo { id apodo marca modelo anio motor }
      }
    }
  }
`;

export const QUERY_PRODUCTO_STOCK = `
  query ProductoStock($id: ID!) {
    producto(id: $id) { id stock }
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
      tipoCombustible
      kilometraje
    }
  }
`;

export const MUTATION_REGISTRAR_PEDIDO = `
  mutation RegistrarPedido($datos: PedidoInput!) {
    registrarPedido(datos: $datos) {
      id
      fecha
      total
      status
      vehiculo { marca modelo anio }
      detalles { cantidad importe producto { id nombre } }
    }
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
