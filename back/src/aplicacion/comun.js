import { ErrorDeNegocio } from '../dominio/errores.js';
import { exigirDueno } from '../dominio/permisos.js';

// Busca un vehiculo y comprueba que sea del actor (o que el actor sea admin).
// Lo usan el garage y los pedidos.
export async function vehiculoPropio(repos, actor, vehiculoId) {
  const vehiculo = await repos.vehiculos.porId(vehiculoId);
  if (!vehiculo) throw new ErrorDeNegocio(`No existe un vehiculo con id ${vehiculoId}`);
  exigirDueno(actor, vehiculo.usuarioId);
  return vehiculo;
}
