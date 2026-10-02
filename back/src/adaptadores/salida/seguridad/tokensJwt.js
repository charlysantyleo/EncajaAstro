// Adaptador de salida: implementa el puerto Tokens con JSON Web Tokens (libreria jsonwebtoken).
import jwt from 'jsonwebtoken';

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
  };
}
