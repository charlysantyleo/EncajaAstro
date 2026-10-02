// Adaptador de salida: implementa el puerto Passwords con bcrypt. Nunca se guarda la contraseña, solo su hash.
import bcrypt from 'bcryptjs';

/** @returns {import('../../../puertos/salida.js').Passwords} */
export function crearPasswordsBcrypt({ rondas = 10 } = {}) {
  return {
    cifrar: (password) => bcrypt.hash(password, rondas),
    comparar: (password, hash) => bcrypt.compare(password, hash),
  };
}
