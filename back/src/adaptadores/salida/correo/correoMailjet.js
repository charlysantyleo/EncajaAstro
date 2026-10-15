// Adaptador de salida: implementa el puerto Correo con la API HTTP de Mailjet (Send API v3.1).
// Es HTTP y no SMTP a proposito: el plan gratuito de Render bloquea los puertos de SMTP.
// El remitente debe estar verificado en Mailjet (Account Settings -> Senders & Domains).

/** @returns {import('../../../puertos/salida.js').Correo} */
export function crearCorreoMailjet({ mailjetApiKey, mailjetSecretKey, remitente, nombreRemitente }) {
  const credenciales = Buffer.from(`${mailjetApiKey}:${mailjetSecretKey}`).toString('base64');

  return {
    configurado: true,

    async enviar({ para, nombre, asunto, texto, html }) {
      const respuesta = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: { Authorization: `Basic ${credenciales}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Messages: [
            {
              From: { Email: remitente, Name: nombreRemitente },
              To: [{ Email: para, ...(nombre ? { Name: nombre } : {}) }],
              Subject: asunto,
              TextPart: texto,
              HTMLPart: html,
            },
          ],
        }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      const mensaje = datos.Messages?.[0];
      if (!respuesta.ok || mensaje?.Status !== 'success') {
        const detalle = mensaje?.Errors?.[0]?.ErrorMessage ?? datos.ErrorMessage ?? 'sin detalle';
        throw new Error(`Mailjet respondió ${respuesta.status}: ${detalle}`);
      }
    },
  };
}
