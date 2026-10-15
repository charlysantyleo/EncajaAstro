// Adaptador de salida: implementa el puerto Tokens con JSON Web Tokens (libreria jsonwebtoken).
import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';

// Huella corta de la contraseña actual. Va dentro del token de recuperacion: en cuanto la contraseña
// cambia, la huella deja de coincidir y el enlace ya no sirve (un solo uso, sin guardar nada en la base).
const huella = (usuario) => createHash('sha256').update(usuario.passwordHash ?? 'sin-contraseña').digest('hex').slice(0, 16);

/** @returns {import('../../../puertos/salida.js').Tokens} */
export function crearTokensJwt({ secreto, duracion = '7d' }) {
  return {
    // Firma { sub, nombre, email, rol } con el secreto; si alguien cambia los datos, la firma ya no coincide.
    crear: (usuario) =>
      jwt.sign(
        { sub: String(usuario.id), nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
        secreto,
        { expiresIn: duracion }
      ),

    // "Bearer <token>" -> actor. Si no hay token, es invalido o ya vencio: null (la peticion sigue como invitado).
    leer(encabezado) {
      if (!encabezado?.startsWith('Bearer ')) return null;
      try {
        const datos = jwt.verify(encabezado.slice(7), secreto);
        // Los tokens con proposito (state de Google, recuperar contraseña) no son sesiones.
        if (datos.proposito) return null;
        return { id: datos.sub, nombre: datos.nombre, email: datos.email, rol: datos.rol };
      } catch {
        return null;
      }
    },

    // "state" de OAuth: un JWT de 10 minutos. Al volver de Google comprobamos que el viaje lo empezamos nosotros.
    crearState: () => jwt.sign({ proposito: 'oauth-google' }, secreto, { expiresIn: '10m' }),
    verificarState: (state) => {
      jwt.verify(state, secreto);
    },

    // Enlace para cambiar la contraseña: dura una hora y solo sirve mientras la contraseña no cambie.
    crearRecuperacion: (usuario) =>
      jwt.sign({ sub: String(usuario.id), proposito: 'recuperar', huella: huella(usuario) }, secreto, { expiresIn: '1h' }),
    leerRecuperacion(token) {
      try {
        const datos = jwt.verify(token, secreto);
        return datos.proposito === 'recuperar' ? { usuarioId: datos.sub, huella: datos.huella } : null;
      } catch {
        return null;
      }
    },
    huellaDe: huella,
  };
}
