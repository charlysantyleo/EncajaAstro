// Adaptador de entrada HTTP para OAuth2: dos rutas de Express que delegan en el caso de uso de cuentas.
import express from 'express';

export function crearRutasGoogle({ cuentas }, { frontUrl }) {
  const rutas = express.Router();

  // El token viaja despues del "#" para que no quede en logs del servidor ni en el historial de peticiones.
  const regresarAlFront = (res, datos) => res.redirect(`${frontUrl}/entrar#${new URLSearchParams(datos)}`);

  // Paso 1: mandar al usuario a la pantalla de Google.
  rutas.get('/auth/google', (req, res) => {
    const url = cuentas.urlDeEntradaExterna();
    if (!url) return regresarAlFront(res, { error: 'El inicio con Google no está configurado en el servidor' });
    return res.redirect(url);
  });

  // Paso 2: Google regresa aqui con ?code=...&state=...
  rutas.get('/auth/google/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;
      if (error) throw new Error('Cancelaste el inicio de sesión con Google');
      const token = await cuentas.entrarConProveedor({ codigo: code, state });
      return regresarAlFront(res, { token });
    } catch (err) {
      return regresarAlFront(res, { error: err.message || 'No se pudo iniciar sesión con Google' });
    }
  });

  return rutas;
}
