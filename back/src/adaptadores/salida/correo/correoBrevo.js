// Adaptador de salida: implementa el puerto Correo con la API HTTP de Brevo (correos transaccionales).
// Es HTTP y no SMTP a proposito: varios hostings gratuitos bloquean los puertos de SMTP.
// El remitente debe estar verificado en la cuenta de Brevo (Senders, domains & dedicated IPs).

/** @returns {import('../../../puertos/salida.js').Correo} */
export function crearCorreoBrevo({ apiKey, remitente, nombreRemitente }) {
  return {
    configurado: true,

    async enviar({ para, nombre, asunto, texto, html }) {
      const respuesta = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: remitente, name: nombreRemitente },
          to: [{ email: para, ...(nombre ? { name: nombre } : {}) }],
          subject: asunto,
          textContent: texto,
          htmlContent: html,
        }),
      });
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({}));
        throw new Error(`Brevo respondió ${respuesta.status}: ${datos.message ?? 'sin detalle'}`);
      }
    },
  };
}
