// Traduce los errores del dominio al lenguaje de GraphQL (extensions.code).
// El dominio solo dice "NoAutenticado" o "Prohibido"; aqui se decide como se ve en la respuesta.
import { unwrapResolverError } from '@apollo/server/errors';
import { ErrorDeNegocio, NoAutenticado, Prohibido } from '../../../dominio/errores.js';

const FALLA_INTERNA = 'Algo falló en el servidor. Intenta de nuevo en un momento.';

export function formatearError(formateado, error) {
  const original = unwrapResolverError(error);
  // Una falla que no es del negocio (la base no responde, falta una tabla...) se registra completa
  // en el servidor y al navegador solo le llega un mensaje generico.
  if (formateado.extensions?.code === 'INTERNAL_SERVER_ERROR' && !(original instanceof ErrorDeNegocio)) {
    console.error('[graphql] Falla interna:', original);
    return { ...formateado, message: FALLA_INTERNA };
  }
  const codigo =
    original instanceof NoAutenticado ? 'UNAUTHENTICATED' : original instanceof Prohibido ? 'FORBIDDEN' : null;
  if (!codigo) return formateado;
  return { ...formateado, extensions: { ...formateado.extensions, code: codigo } };
}
