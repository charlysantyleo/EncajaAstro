import { useEffect, useState } from 'react';
import { Loader2 } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { graphqlRequest } from '../graphql/client';
import { QUERY_YO } from '../graphql/queries';
import { navegar, rutas } from '../lib/rutas';

// Aqui regresa el backend despues de Google: /entrar#token=... o /entrar#error=...
// Con el token se pregunta "yo" al servidor (que lo verifica) y se guarda la sesion.
export default function EntrarView() {
  const iniciarSesion = useTienda((estado) => estado.iniciarSesion);
  const ir = useTienda((estado) => estado.ir);
  const [error, setError] = useState(null);

  useEffect(() => {
    const datos = new URLSearchParams(window.location.hash.slice(1));
    // Se borra el token de la barra de direcciones en cuanto se lee.
    window.history.replaceState(null, '', window.location.pathname);

    const token = datos.get('token');
    if (!token) {
      setError(datos.get('error') ?? 'No llegó ningún inicio de sesión.');
      return;
    }

    graphqlRequest(QUERY_YO, {}, { token })
      .then(({ yo }) => {
        if (!yo) throw new Error('El servidor no reconoció la sesión.');
        iniciarSesion({ token, usuario: yo });
        navegar(rutas.garage);
      })
      .catch((err) => setError(err.message));
  }, [iniciarSesion]);

  return (
    <div className="contenedor-medio">
      {error ? (
        <div className="vacio">
          <h2>No pudimos iniciar sesión</h2>
          <p className="apagado">{error}</p>
          <button className="btn btn-primario" onClick={() => ir('abrirEntrar')}>
            Intentar de nuevo
          </button>
        </div>
      ) : (
        <div className="vacio" role="status">
          <h2>Entrando…</h2>
          <p className="apagado" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Loader2 size={18} className="girar" /> Confirmando tu cuenta de Google.
          </p>
        </div>
      )}
    </div>
  );
}
