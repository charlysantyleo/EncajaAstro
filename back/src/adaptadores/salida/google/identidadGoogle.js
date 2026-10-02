// Adaptador de salida: implementa el puerto ProveedorIdentidad con OAuth2 de Google
// (flujo "authorization code"). Solo habla con Google; no sabe nada de usuarios ni de la base.

/** @returns {import('../../../puertos/salida.js').ProveedorIdentidad} */
export function crearIdentidadGoogle({ clientId, clientSecret, redirectUri }) {
  return {
    configurado: Boolean(clientId && clientSecret),

    // A donde mandamos al usuario para que inicie sesion en Google.
    urlDeAutorizacion(state) {
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        prompt: 'select_account',
      });
      return url.toString();
    },

    async perfilDesdeCodigo(codigo) {
      // Cambiamos el codigo por un access token (servidor a servidor, con el secreto).
      const respuestaToken = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: codigo,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      const token = await respuestaToken.json();
      if (!respuestaToken.ok) throw new Error('Google rechazó el código de acceso');

      // Con el access token pedimos el perfil.
      const respuestaPerfil = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      const perfil = await respuestaPerfil.json();
      if (!respuestaPerfil.ok) throw new Error('Google no confirmó tu correo');

      return { email: perfil.email, nombre: perfil.name ?? null, emailVerificado: Boolean(perfil.email_verified) };
    },
  };
}
