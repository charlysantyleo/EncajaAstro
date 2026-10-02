// Reglas de acceso. "actor" es quien hace la peticion: { id, nombre, email, rol } o null si es invitado.
import { NoAutenticado, Prohibido } from './errores.js';

export const ROLES = { CLIENTE: 'CLIENTE', TALLER: 'TALLER', ADMIN: 'ADMIN' };

export function esAdmin(actor) {
  return actor?.rol === ROLES.ADMIN;
}

export function exigirSesion(actor) {
  if (!actor) throw new NoAutenticado();
  return actor;
}

export function exigirAdmin(actor) {
  exigirSesion(actor);
  if (!esAdmin(actor)) throw new Prohibido('Solo un administrador puede hacer esto');
}

export function esDuenoOAdmin(actor, usuarioIdDelRecurso) {
  return esAdmin(actor) || (actor != null && String(actor.id) === String(usuarioIdDelRecurso));
}

// El recurso (vehiculo, pedido, usuario...) debe ser del actor, o el actor debe ser admin.
export function exigirDueno(actor, usuarioIdDelRecurso) {
  exigirSesion(actor);
  if (!esDuenoOAdmin(actor, usuarioIdDelRecurso)) throw new Prohibido('Esto pertenece a otro usuario');
}

// Un cliente solo puede consultar lo suyo; el admin puede filtrar por cualquier usuario.
export function usuarioParaFiltrar(actor, usuarioIdPedido) {
  exigirSesion(actor);
  return esAdmin(actor) ? usuarioIdPedido : actor.id;
}
