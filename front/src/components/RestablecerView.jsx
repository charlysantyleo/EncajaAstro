import { useEffect, useState } from 'react';
import { Loader2 } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { graphqlRequest } from '../graphql/client';
import { MUTATION_RESTABLECER_PASSWORD } from '../graphql/queries';
import { rutas } from '../lib/rutas';
import CampoPassword from './ui/CampoPassword';
import { comoIsla } from './ui/Isla';

// Aqui llega el enlace del correo: /restablecer#token=...
// El token va despues del "#" para que no viaje a ningun servidor; se lee y se borra de la barra de direcciones.
function RestablecerView() {
  const iniciarSesion = useTienda((estado) => estado.iniciarSesion);
  const ir = useTienda((estado) => estado.ir);

  const [token, setToken] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '');
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const noCoinciden = confirmacion !== '' && confirmacion !== password;
  const alternarVer = () => setVerPassword((valor) => !valor);

  async function manejarEnviar(evento) {
    evento.preventDefault();
    if (confirmacion !== password) return;
    setEnviando(true);
    setError(null);
    try {
      const { restablecerPassword } = await graphqlRequest(MUTATION_RESTABLECER_PASSWORD, { token, password });
      iniciarSesion(restablecerPassword);
      setListo(true);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  if (token === null) return null;

  if (!token) {
    return (
      <div className="contenedor-medio">
        <div className="vacio">
          <h2>Este enlace está incompleto</h2>
          <p className="apagado">Ábrelo tal como llegó en el correo, o pide uno nuevo desde “Entrar”.</p>
          <button className="btn btn-primario" onClick={() => ir('abrirEntrar')}>
            Entrar
          </button>
        </div>
      </div>
    );
  }

  if (listo) {
    return (
      <div className="contenedor-medio">
        <div className="vacio" role="status">
          <h2>Listo, ya cambiaste tu contraseña</h2>
          <p className="apagado">Ya entraste con tu cuenta. La próxima vez usa tu contraseña nueva.</p>
          <a className="btn btn-primario" href={rutas.home}>
            Ir al catálogo
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="contenedor-medio">
      <div className="vacio">
        <h2>Elige una contraseña nueva</h2>
        <form className="formulario" style={{ width: 'min(420px, 100%)' }} onSubmit={manejarEnviar}>
          <CampoPassword
            id="restablecer-password"
            etiqueta="Contraseña nueva"
            ayuda="Mínimo 8 caracteres."
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            visible={verPassword}
            onAlternar={alternarVer}
          />
          <CampoPassword
            id="restablecer-confirmacion"
            etiqueta="Confirmar contraseña"
            error={noCoinciden ? 'Las contraseñas no coinciden.' : null}
            required
            autoComplete="new-password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            visible={verPassword}
            onAlternar={alternarVer}
          />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primario btn-bloque" type="submit" disabled={enviando || noCoinciden}>
            {enviando && <Loader2 size={18} className="girar" />}
            Guardar contraseña
          </button>
        </form>
      </div>
    </div>
  );
}

export default comoIsla(RestablecerView);
