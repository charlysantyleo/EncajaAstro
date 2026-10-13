import { useCallback, useEffect, useState } from 'react';
import { graphqlRequest } from '../graphql/client';
import { useEnNavegador } from './useEnNavegador';

export function useGraphQLQuery(query, variables, { skip = false, version = 0 } = {}) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(!skip);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);

  const variablesClave = JSON.stringify(variables ?? {});
  const enNavegador = useEnNavegador();

  useEffect(() => {
    // Mientras se hidrata el HTML del build, el store aun no trae lo guardado (vehiculo activo, sesion):
    // se espera al estado real para no pedir dos veces. Entre tanto se queda en "cargando".
    if (!enNavegador) return undefined;
    if (skip) {
      setCargando(false);
      return;
    }

    let sigueActivo = true;
    setCargando(true);
    setError(null);

    graphqlRequest(query, variables)
      .then((resultado) => {
        if (sigueActivo) setDatos(resultado);
      })
      .catch((err) => {
        if (sigueActivo) setError(err.message);
      })
      .finally(() => {
        if (sigueActivo) setCargando(false);
      });

    return () => {
      sigueActivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, variablesClave, skip, intento, version, enNavegador]);

  return { datos, cargando, error, recargar };
}
