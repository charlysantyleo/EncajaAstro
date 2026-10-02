// Traduce los errores del dominio al lenguaje de GraphQL (extensions.code).
// El dominio solo dice "NoAutenticado" o "Prohibido"; aqui se decide como se ve en la respuesta.
import { unwrapResolverError } from '@apollo/server/errors';
import { NoAutenticado, Prohibido } from '../../../dominio/errores.js';

export function formatearError(formateado, error) {
  const original = unwrapResolverError(error);
  const codigo =
    original instanceof NoAutenticado ? 'UNAUTHENTICATED' : original instanceof Prohibido ? 'FORBIDDEN' : null;
  if (!codigo) return formateado;
  return { ...formateado, extensions: { ...formateado.extensions, code: codigo } };
}
