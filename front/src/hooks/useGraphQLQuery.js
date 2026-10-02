import { useCallback, useEffect, useState } from 'react';
import { graphqlRequest } from '../graphql/client';

export function useGraphQLQuery(query, variables, { skip = false, version = 0 } = {}) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(!skip);
  const [error, setError] = useState(null);
  const [intento, setIntento] = useState(0);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);

  const variablesClave = JSON.stringify(variables ?? {});

  useEffect(() => {
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
  }, [query, variablesClave, skip, intento, version]);

  return { datos, cargando, error, recargar };
}
