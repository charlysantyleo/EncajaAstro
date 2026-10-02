// Casos de uso de cuentas: crear cuenta, entrar (correo o Google) y administrar usuarios.
import { ErrorDeNegocio } from '../dominio/errores.js';
import { ROLES, exigirAdmin, exigirDueno } from '../dominio/permisos.js';
import { validarPasswordNueva } from '../dominio/reglas.js';

/**
 * @param {{ repos: import('../puertos/salida.js').Repositorios, tokens: import('../puertos/salida.js').Tokens,
 *           passwords: import('../puertos/salida.js').Passwords, identidad: import('../puertos/salida.js').ProveedorIdentidad }} puertos
 */
export function crearCuentas({ repos, tokens, passwords, identidad }) {
  const sesionDe = (usuario) => ({ token: tokens.crear(usuario), usuario });

  return {
    // Convierte el encabezado Authorization en el actor de la peticion (o null si es invitado).
    actorDesde: (encabezado) => tokens.leer(encabezado),

    yo: (actor) => (actor ? repos.usuarios.porId(actor.id) : null),
    usuarioPorId: (id) => repos.usuarios.porId(id),
    vehiculosDe: (usuario) => repos.vehiculos.deUsuario(usuario.id),
    pedidosDe: (usuario) => repos.pedidos.deUsuario(usuario.id),

    usuarios(actor, { rol }) {
      exigirAdmin(actor);
      return repos.usuarios.listar({ rol });
    },

    usuario(actor, id) {
      exigirDueno(actor, id);
      return repos.usuarios.porId(id);
    },

    async crearCuenta({ nombre, email, password }) {
      validarPasswordNueva(password);
      if (await repos.usuarios.porEmail(email)) throw new ErrorDeNegocio(`Ya existe una cuenta con el correo ${email}`);
      const usuario = await repos.usuarios.crear({
        nombre,
        email,
        passwordHash: await passwords.cifrar(password),
        rol: ROLES.CLIENTE,
      });
      return sesionDe(usuario);
    },

    async iniciarSesion({ email, password }) {
      const usuario = await repos.usuarios.porEmail(email);
      // Mismo mensaje si no existe el correo o si la contraseña esta mal: no revelamos cuales correos existen.
      const correcta = usuario?.passwordHash ? await passwords.comparar(password, usuario.passwordHash) : false;
      if (!correcta) throw new ErrorDeNegocio('Correo o contraseña incorrectos');
      return sesionDe(usuario);
    },

    async registrarUsuario(actor, datos) {
      exigirAdmin(actor);
      if (await repos.usuarios.porEmail(datos.email)) {
        throw new ErrorDeNegocio(`Ya existe un usuario con el correo ${datos.email}`);
      }
      return repos.usuarios.crear({
        nombre: datos.nombre,
        email: datos.email,
        passwordHash: datos.password ? await passwords.cifrar(datos.password) : null,
        rol: datos.rol ?? ROLES.CLIENTE,
      });
    },

    // ---------- OAuth2 con un proveedor externo (Google) ----------

    // Paso 1: a donde mandar al usuario. null si el proveedor no esta configurado.
    urlDeEntradaExterna: () => (identidad.configurado ? identidad.urlDeAutorizacion(tokens.crearState()) : null),

    // Pasos 2 a 6: el proveedor regreso con un codigo; lo cambiamos por el perfil y damos NUESTRO token.
    async entrarConProveedor({ codigo, state }) {
      tokens.verificarState(state);
      const perfil = await identidad.perfilDesdeCodigo(codigo);
      if (!perfil.email || !perfil.emailVerificado) throw new ErrorDeNegocio('Google no confirmó tu correo');

      const usuario =
        (await repos.usuarios.porEmail(perfil.email)) ??
        (await repos.usuarios.crear({
          nombre: perfil.nombre || perfil.email,
          email: perfil.email,
          passwordHash: null,
          rol: ROLES.CLIENTE,
        }));
      return tokens.crear(usuario);
    },
  };
}
