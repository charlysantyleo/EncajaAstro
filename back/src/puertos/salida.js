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
 * @typedef {{ id: number, productoId: number, marca: string, modelo: string, anioDesde: number, anioHasta: number,
 *             motor: string|null, tipo: string, nota: string|null }} Compatibilidad
 * @typedef {{ id: number, marca: string, modelo: string, anio: number, motores: string[], origen: string }} ModeloDeVehiculo
 * @typedef {{ id: number, usuarioId: number, vehiculoId: number|null, fecha: string, total: number, status: string }} Pedido
 * @typedef {{ id: number, pedidoId: number, productoId: number, cantidad: number, precioUnitario: number, importe: number }} DetallePedido
 * @typedef {{ id: number, vehiculoId: number, productoId: number|null, pedidoId: number|null, fecha: string,
 *             kilometraje: number|null, descripcion: string }} Mantenimiento
 * @typedef {{ id: number, pedidoId: number, referencia: string, metodo: string, proveedor: string|null, status: string,
 *             monto: number, idExterno: string|null, url: string|null, codigo: string|null, vence: string|null,
 *             detalle: string|null }} Pago
 * @typedef {{ calle: string, numeroExterior: string, numeroInterior: string|null, colonia: string, codigoPostal: string,
 *             ciudad: string, estado: string, referencias: string|null }} Direccion
 * @typedef {{ id: number, pedidoId: number, tipo: string, telefono: string|null, costo: number, direccion: Direccion|null }} Entrega
 * @typedef {Direccion & { id: number, usuarioId: number, telefono: string }} DireccionGuardada
 * @typedef {{ id: string, nombre: string, email: string, rol: string }} Actor  quien hace la peticion (sale del JWT)
 */

/**
 * Repositorios: guardar y leer datos.
 * @typedef {object} Repositorios
 * @property {{ porId(id): Promise<Usuario|null>, porEmail(email): Promise<Usuario|null>, listar(f: { rol? }): Promise<Usuario[]>,
 *              crear(d: { nombre, email, passwordHash, rol }): Promise<Usuario>,
 *              cambiarPassword(id, passwordHash): Promise<Usuario>, cambiarRol(id, rol): Promise<Usuario> }} usuarios
 * @property {{ listar(): Promise<Categoria[]>, porId(id): Promise<Categoria|null>, crear(d): Promise<Categoria> }} categorias
 * @property {{ porId(id): Promise<Producto|null>, buscar(f: { categoriaId?, vehiculoId?, texto?, precioMin?, precioMax?, soloDirectos? }): Promise<Producto[]>,
 *              deCategoria(categoriaId): Promise<Producto[]>, crear(d): Promise<Producto>, actualizar(id, d): Promise<Producto>,
 *              eliminar(id): Promise<boolean>, descontarStock(id, cantidad): Promise<void>,
 *              reponerStock(id, cantidad): Promise<void> }} productos
 * @property {{ porId(id): Promise<Vehiculo|null>, listar(f: { usuarioId?, marca? }): Promise<Vehiculo[]>, deUsuario(usuarioId): Promise<Vehiculo[]>,
 *              compatiblesCon(productoId, usuarioId): Promise<Vehiculo[]>, crear(d): Promise<Vehiculo>, actualizar(id, d): Promise<Vehiculo>,
 *              eliminar(id): Promise<boolean>, actualizarKilometraje(id, km): Promise<void> }} vehiculos
 * @property {{ listar(f: { productoId?, vehiculoId? }): Promise<Compatibilidad[]>, buscar(productoId, vehiculoId): Promise<Compatibilidad|null>,
 *              deModelo(productoId, m: { marca, modelo }): Promise<Compatibilidad[]>,
 *              crear(d): Promise<Compatibilidad>, eliminar(id): Promise<boolean> }} compatibilidades
 * @property {{ hayDatos(): Promise<boolean>, marcas(anio): Promise<string[]>, modelos(marca, anio): Promise<string[]>,
 *              anios(marca, modelo): Promise<number[]>, motores(marca, modelo, anio): Promise<string[]>,
 *              buscarUno(marca, modelo, anio): Promise<ModeloDeVehiculo|null>,
 *              buscar(f: { terminos: string[], inicio: string, anio: number|null, limite: number }): Promise<object[]>,
 *              deMarca(marca): Promise<ModeloDeVehiculo[]>, guardar(d): Promise<ModeloDeVehiculo[]>,
 *              quitar(d): Promise<number> }} catalogoVehiculos
 * @property {{ todos(): Promise<Record<string, number>>, guardar(clave, valor): Promise<void> }} ajustes
 * @property {{ porId(id): Promise<{ id, tipo: string, datos: Uint8Array }|null>, crear(d: { tipo, base64 }): Promise<{ id }> }} imagenes
 * @property {{ porId(id): Promise<Pedido|null>, listar(f: { usuarioId?, status? }): Promise<Pedido[]>, deUsuario(usuarioId): Promise<Pedido[]>,
 *              crear(d): Promise<Pedido>, detallesDe(pedidoId): Promise<DetallePedido[]>, agregarDetalle(d): Promise<void>,
 *              incluyeProducto(pedidoId, productoId): Promise<boolean>, bloquear(id): Promise<Pedido|null>,
 *              cambiarStatus(id, status): Promise<void> }} pedidos
 * @property {{ porId(id): Promise<Pago|null>, dePedido(pedidoId): Promise<Pago|null>, porReferencia(referencia): Promise<Pago|null>,
 *              porCodigo(codigo): Promise<Pago|null>,
 *              crear(d: { pedidoId, referencia, metodo, proveedor, status, monto, codigo? }): Promise<Pago>,
 *              actualizar(id, cambios: Partial<Pago>): Promise<Pago> }} pagos
 * @property {{ dePedido(pedidoId): Promise<Entrega|null>,
 *              crear(d: { pedidoId, tipo, telefono, direccion, costo }): Promise<Entrega> }} entregas
 * @property {{ porId(id): Promise<DireccionGuardada|null>, deUsuario(usuarioId): Promise<DireccionGuardada[]>,
 *              crear(d): Promise<DireccionGuardada>, actualizarContacto(id, d: { telefono, referencias }): Promise<DireccionGuardada>,
 *              eliminar(id): Promise<boolean> }} direcciones
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
 * @property {(usuario: Usuario) => string} crearRecuperacion           enlace de un solo uso para cambiar la contraseña
 * @property {(token: string) => { usuarioId: string, huella: string }|null} leerRecuperacion
 * @property {(usuario: Usuario) => string} huellaDe                     cambia cuando cambia la contraseña
 */

/**
 * Correo saliente (Brevo en el adaptador actual; en consola si no hay proveedor configurado).
 * @typedef {{ configurado: boolean, enviar(m: { para: string, nombre?: string, asunto: string, texto: string, html: string }): Promise<void> }} Correo
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
 * Pasarela de cobro (Mercado Pago y PayPal en los adaptadores actuales). Cada una implementa solo lo que sabe cobrar.
 * @typedef {{ referencia: string, monto: number, descripcion: string, comprador: { nombre: string, email: string },
 *             lineas: { nombre: string, cantidad: number, precio: number }[], tarjeta: object|null, tienda: string|null,
 *             vence: string, urls: { retorno: string, notificacion: string|null } }} Cobro
 * @typedef {{ status: string, idExterno: string, url: string|null, codigo: string|null, vence: string|null,
 *             detalle: string|null }} ResultadoDeCobro
 * @typedef {object} Pasarela
 * @property {boolean} configurada                                      tiene credenciales
 * @property {boolean} cobraTarjetas
 * @property {string|null} llavePublica                                 la unica credencial que puede ver el navegador
 * @property {(cobro: Cobro) => Promise<ResultadoDeCobro>} [cobrarTarjeta]
 * @property {(cobro: Cobro) => Promise<ResultadoDeCobro>} [crearFichaTienda]
 * @property {(cobro: Cobro) => Promise<ResultadoDeCobro>} crearLink
 * @property {(pago: Pago) => Promise<{ status: string, detalle: string|null }>} consultar   estado actual del cobro
 * @property {(idPagoExterno: string) => Promise<string|null>} [referenciaDeNotificacion]
 * @property {(datos: { firma, idPeticion, idDato }) => boolean} [firmaValida]
 */

/**
 * Eventos en tiempo real (PubSub en memoria en el adaptador actual).
 * @typedef {{ stockCambio(producto: Producto): void, escucharStock(): AsyncIterator<any> }} Eventos
 */

export {};
