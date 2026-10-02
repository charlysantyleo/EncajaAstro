// PUERTOS DE SALIDA: lo que la aplicacion necesita del mundo exterior, sin decir COMO se hace.
// Los casos de uso solo conocen estas formas. Para cambiar Postgres por otra base, bcrypt por
// otro algoritmo o Google por otro proveedor, se escribe otro adaptador con la misma forma
// y se conecta en src/contenedor.js. Ningun caso de uso cambia.
//
// (JavaScript no tiene interfaces; estos typedefs son el contrato y el editor los usa para autocompletar.)

/**
 * Objetos del dominio (asi viajan entre capas, ya sin nombres de columnas SQL).
 * @typedef {{ id: number, nombre: string, email: string, rol: string, passwordHash: string|null }} Usuario
 * @typedef {{ id: number, nombre: string, descripcion: string|null }} Categoria
 * @typedef {{ id: number, nombre: string, descripcion: string|null, numeroParte: string, marca: string|null,
 *             precio: number, imagen: string|null, stock: number, categoriaId: number|null }} Producto
 * @typedef {{ id: number, usuarioId: number|null, apodo: string|null, marca: string, modelo: string, anio: number,
 *             motor: string|null, tipoCombustible: string, kilometraje: number|null }} Vehiculo
 * @typedef {{ id: number, productoId: number, vehiculoId: number, tipo: string, nota: string|null }} Compatibilidad
 * @typedef {{ id: number, usuarioId: number, vehiculoId: number|null, fecha: string, total: number, status: string }} Pedido
 * @typedef {{ id: number, pedidoId: number, productoId: number, cantidad: number, precioUnitario: number, importe: number }} DetallePedido
 * @typedef {{ id: number, vehiculoId: number, productoId: number|null, pedidoId: number|null, fecha: string,
 *             kilometraje: number|null, descripcion: string }} Mantenimiento
 * @typedef {{ id: string, nombre: string, email: string, rol: string }} Actor  quien hace la peticion (sale del JWT)
 */

/**
 * Repositorios: guardar y leer datos.
 * @typedef {object} Repositorios
 * @property {{ porId(id): Promise<Usuario|null>, porEmail(email): Promise<Usuario|null>, listar(f: { rol? }): Promise<Usuario[]>,
 *              crear(d: { nombre, email, passwordHash, rol }): Promise<Usuario> }} usuarios
 * @property {{ listar(): Promise<Categoria[]>, porId(id): Promise<Categoria|null>, crear(d): Promise<Categoria> }} categorias
 * @property {{ porId(id): Promise<Producto|null>, buscar(f: { categoriaId?, vehiculoId?, texto?, precioMin?, precioMax?, soloDirectos? }): Promise<Producto[]>,
 *              deCategoria(categoriaId): Promise<Producto[]>, crear(d): Promise<Producto>, actualizar(id, d): Promise<Producto>,
 *              eliminar(id): Promise<boolean>, descontarStock(id, cantidad): Promise<void> }} productos
 * @property {{ porId(id): Promise<Vehiculo|null>, listar(f: { usuarioId?, marca? }): Promise<Vehiculo[]>, deUsuario(usuarioId): Promise<Vehiculo[]>,
 *              compatiblesCon(productoId): Promise<Vehiculo[]>, crear(d): Promise<Vehiculo>, actualizar(id, d): Promise<Vehiculo>,
 *              eliminar(id): Promise<boolean>, actualizarKilometraje(id, km): Promise<void> }} vehiculos
 * @property {{ listar(f: { productoId?, vehiculoId? }): Promise<Compatibilidad[]>, buscar(productoId, vehiculoId): Promise<Compatibilidad|null>,
 *              crear(d): Promise<Compatibilidad> }} compatibilidades
 * @property {{ porId(id): Promise<Pedido|null>, listar(f: { usuarioId?, status? }): Promise<Pedido[]>, deUsuario(usuarioId): Promise<Pedido[]>,
 *              crear(d): Promise<Pedido>, detallesDe(pedidoId): Promise<DetallePedido[]>, agregarDetalle(d): Promise<void>,
 *              incluyeProducto(pedidoId, productoId): Promise<boolean> }} pedidos
 * @property {{ porId(id): Promise<Mantenimiento|null>, deVehiculo(vehiculoId): Promise<Mantenimiento[]>, crear(d): Promise<Mantenimiento> }} mantenimientos
 */

/**
 * Ejecuta varias operaciones como una sola: o se guardan todas o ninguna.
 * @typedef {<T>(trabajo: (repos: Repositorios) => Promise<T>) => Promise<T>} Transaccion
 */

/**
 * Tokens de sesion (JWT en el adaptador actual).
 * @typedef {object} Tokens
 * @property {(usuario: Usuario) => string} crear
 * @property {(encabezado: string|undefined) => Actor|null} leer        "Bearer <token>" -> actor, o null si no sirve
 * @property {() => string} crearState                                  valor de un solo uso para OAuth (anti-CSRF)
 * @property {(state: string) => void} verificarState                   lanza error si no es valido
 */

/**
 * Contraseñas (bcrypt en el adaptador actual).
 * @typedef {{ cifrar(password): Promise<string>, comparar(password, hash): Promise<boolean> }} Passwords
 */

/**
 * Proveedor de identidad externo (Google en el adaptador actual).
 * @typedef {object} ProveedorIdentidad
 * @property {boolean} configurado
 * @property {(state: string) => string} urlDeAutorizacion
 * @property {(codigo: string) => Promise<{ email: string, nombre: string|null, emailVerificado: boolean }>} perfilDesdeCodigo
 */

/**
 * Eventos en tiempo real (PubSub en memoria en el adaptador actual).
 * @typedef {{ stockCambio(producto: Producto): void, escucharStock(): AsyncIterator<any> }} Eventos
 */

export {};
