import { graphqlRequest } from '../graphql/client';
import { MUTATION_REGISTRAR_ACTIVIDAD } from '../graphql/queries';

// Le cuenta al servidor lo que solo pasa en el navegador (abrir una pieza, agregarla a la nota) para las
// graficas del panel. No se espera ni se avisa si falla: medir nunca debe estorbar a quien esta comprando.
export function anotarActividad(tipo, productoId, cantidad) {
  graphqlRequest(MUTATION_REGISTRAR_ACTIVIDAD, { tipo, productoId, cantidad: cantidad ?? null }).catch(() => {});
}
