import { useEffect, useRef, useState } from 'react';
import { estaConectado, obtenerClienteSuscripciones } from '../graphql/subscriptionClient';

// Se suscribe a una operacion GraphQL por WebSocket mientras el componente este montado.
// onDato recibe `data` de cada mensaje. Regresa el estado de la conexion para mostrarlo:
// 'conectando', 'en-vivo', 'sin-conexion' o 'sin-permiso' (el servidor rechazo la suscripcion).
export function useSuscripcion(query, onDato, { activa = true } = {}) {
  const [estado, setEstado] = useState('conectando');
  const ultimoOnDato = useRef(onDato);
  ultimoOnDato.current = onDato;

  useEffect(() => {
    if (!activa) return undefined;
    const cliente = obtenerClienteSuscripciones();
    if (!cliente) return undefined;
    if (estaConectado()) setEstado('en-vivo');

    const quitarConectado = cliente.on('connected', () => setEstado((e) => (e === 'sin-permiso' ? e : 'en-vivo')));
    const quitarCerrado = cliente.on('closed', () => setEstado((e) => (e === 'sin-permiso' ? e : 'sin-conexion')));
    const cancelar = cliente.subscribe(
      { query },
      {
        next: (mensaje) => {
          if (mensaje.errors?.length) {
            setEstado('sin-permiso');
            return;
          }
          if (mensaje.data) ultimoOnDato.current(mensaje.data);
        },
        error: () => setEstado('sin-permiso'),
        complete: () => {},
      }
    );
    return () => {
      cancelar();
      quitarConectado();
      quitarCerrado();
    };
  }, [query, activa]);

  return estado;
}
