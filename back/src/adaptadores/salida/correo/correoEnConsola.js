// Adaptador de salida para desarrollo: sin proveedor de correo configurado, el mensaje se escribe en la
// consola del servidor (ahi aparece, por ejemplo, el enlace para cambiar la contraseña).
// Nunca se regresa al navegador: solo lo ve quien tiene acceso a los logs del servidor.

/** @returns {import('../../../puertos/salida.js').Correo} */
export function crearCorreoEnConsola() {
  return {
    configurado: false,

    async enviar({ para, asunto, texto }) {
      console.log(`\n[correo sin proveedor] Para: ${para}\nAsunto: ${asunto}\n\n${texto}\n`);
    },
  };
}
