// Casos de uso de cuentas: crear cuenta, entrar (correo o Google) y administrar usuarios.
import { ErrorDeNegocio } from '../dominio/errores.js';
import { ROLES, exigirAdmin, exigirDueno } from '../dominio/permisos.js';
import { validarPasswordNueva } from '../dominio/reglas.js';

// Para no mandar diez correos si alguien presiona el boton diez veces.
const ESPERA_ENTRE_CORREOS_MS = 60 * 1000;

/**
 * @param {{ repos: import('../puertos/salida.js').Repositorios, tokens: import('../puertos/salida.js').Tokens,
 *           passwords: import('../puertos/salida.js').Passwords, identidad: import('../puertos/salida.js').ProveedorIdentidad,
 *           correo: import('../puertos/salida.js').Correo, frontUrl: string }} puertos
 */
export function crearCuentas({ repos, tokens, passwords, identidad, correo, frontUrl }) {
  const sesionDe = (usuario) => ({ token: tokens.crear(usuario), usuario });
  const ultimoCorreo = new Map();

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

    // ---------- recuperar la contraseña ----------

    // Manda un enlace para elegir contraseña nueva. Responde igual exista o no la cuenta,
    // para no revelar que correos estan registrados.
    async solicitarRecuperacion({ email }) {
      const usuario = await repos.usuarios.porEmail(String(email ?? '').trim().toLowerCase()) ?? await repos.usuarios.porEmail(email);
      if (!usuario) return true;
      const ahora = Date.now();
      if (ahora - (ultimoCorreo.get(usuario.id) ?? 0) < ESPERA_ENTRE_CORREOS_MS) return true;
      ultimoCorreo.set(usuario.id, ahora);

      // El token va despues del "#": el navegador no lo manda a ningun servidor ni queda en logs.
      const enlace = `${frontUrl}/restablecer#token=${tokens.crearRecuperacion(usuario)}`;
      try {
        await correo.enviar({
          para: usuario.email,
          nombre: usuario.nombre,
          asunto: 'Cambia tu contraseña de EnCaja Autopartes',
          texto:
            `Hola, ${usuario.nombre}:\n\nRecibimos una solicitud para cambiar la contraseña de tu cuenta de EnCaja Autopartes.\n` +
            `Para elegir una nueva, abre este enlace:\n\n${enlace}\n\n` +
            'El enlace vence en una hora y solo sirve una vez. Si no lo pediste, ignora este correo: tu contraseña no cambia.',
          html:
            `<p>Hola, ${escapar(usuario.nombre)}:</p>` +
            '<p>Recibimos una solicitud para cambiar la contraseña de tu cuenta de EnCaja Autopartes.</p>' +
            `<p><a href="${enlace}">Elegir una contraseña nueva</a></p>` +
            '<p>El enlace vence en una hora y solo sirve una vez. Si no lo pediste, ignora este correo: tu contraseña no cambia.</p>',
        });
      } catch (error) {
        // Se registra pero no se avisa al navegador: un error solo cuando la cuenta existe la delataria.
        console.error('[cuentas] No se pudo mandar el correo de recuperacion:', error.message);
      }
      return true;
    },

    // Con el enlace del correo se elige la contraseña nueva y se entra de una vez.
    async restablecerPassword({ token, password }) {
      const invalido = 'El enlace para cambiar tu contraseña no es válido o ya venció. Pide uno nuevo.';
      const datos = tokens.leerRecuperacion(token);
      const usuario = datos && (await repos.usuarios.porId(datos.usuarioId));
      if (!usuario || tokens.huellaDe(usuario) !== datos.huella) throw new ErrorDeNegocio(invalido);
      validarPasswordNueva(password);
      const actualizado = await repos.usuarios.cambiarPassword(usuario.id, await passwords.cifrar(password));
      return sesionDe(actualizado);
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

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
