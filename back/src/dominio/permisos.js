// Reglas de acceso. "actor" es quien hace la peticion: { id, nombre, email, rol } o null si es invitado.
import { NoAutenticado, Prohibido } from './errores.js';

// Que puede hacer cada cuenta (el invitado, sin cuenta, solo compra y ve su pedido con el enlace):
//   CLIENTE   compra, garage y bitacora de sus vehiculos, direcciones guardadas, sus pedidos
//   TALLER    lo mismo que CLIENTE, con precio de mayoreo (descuento de taller en los ajustes)
//   EMPLEADO  lo de CLIENTE + mostrador: cobra pagos en mostrador, ve todos los pedidos y los marca
//             enviados o entregados. No toca catalogo, precios, usuarios ni ajustes.
//   ADMIN     todo: lo de EMPLEADO + catalogo (productos, fotos, existencias, categorias,
//             compatibilidades), usuarios y sus roles, y los ajustes de la tienda
export const ROLES = { CLIENTE: 'CLIENTE', TALLER: 'TALLER', EMPLEADO: 'EMPLEADO', ADMIN: 'ADMIN' };

export function esAdmin(actor) {
  return actor?.rol === ROLES.ADMIN;
}

// Personal de la tienda: quien atiende el mostrador y los pedidos.
export function esPersonal(actor) {
  return actor?.rol === ROLES.EMPLEADO || actor?.rol === ROLES.ADMIN;
}

export function exigirSesion(actor) {
  if (!actor) throw new NoAutenticado();
  return actor;
}

export function exigirAdmin(actor) {
  exigirSesion(actor);
  if (!esAdmin(actor)) throw new Prohibido('Solo un administrador puede hacer esto');
}

export function exigirPersonal(actor) {
  exigirSesion(actor);
  if (!esPersonal(actor)) throw new Prohibido('Solo el personal de la tienda puede hacer esto');
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
