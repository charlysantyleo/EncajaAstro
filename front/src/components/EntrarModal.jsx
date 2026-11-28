import { useState } from 'react';
import { Loader2 } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { API_URL, graphqlRequest } from '../graphql/client';
import { MUTATION_CREAR_CUENTA, MUTATION_INICIAR_SESION, MUTATION_SOLICITAR_RECUPERACION } from '../graphql/queries';
import Capa from './ui/Capa';
import CampoPassword from './ui/CampoPassword';
import { useT } from '../i18n/react';

// La ruta de OAuth vive en el mismo servidor que GraphQL: http://localhost:4000/auth/google
const URL_GOOGLE = API_URL.replace(/\/graphql$/, '/auth/google');

// Entrar o crear cuenta. Ambos caminos terminan igual: el backend regresa un JWT y se guarda en el store.
// Un tercer modo, "recuperar", pide un enlace por correo para elegir contraseña nueva (pagina /restablecer).
export default function EntrarModal() {
  const t = useT();
  const ir = useTienda((estado) => estado.ir);
  const iniciarSesion = useTienda((estado) => estado.iniciarSesion);
  const refrescar = useTienda((estado) => estado.refrescar);

  const [modo, setModo] = useState('entrar');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [enlaceEnviado, setEnlaceEnviado] = useState(false);

  const creando = modo === 'crear';
  // Se avisa en cuanto la confirmacion deja de coincidir, sin esperar al envio.
  const noCoinciden = creando && confirmacion !== '' && confirmacion !== password;
  const alternarVer = () => setVerPassword((valor) => !valor);

  function cambiarModo() {
    setModo(creando ? 'entrar' : 'crear');
    setConfirmacion('');
    setError(null);
  }

  function irA(nuevo) {
    setModo(nuevo);
    setConfirmacion('');
    setError(null);
    setEnlaceEnviado(false);
    setEnviando(false);
  }

  async function pedirEnlace(evento) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await graphqlRequest(MUTATION_SOLICITAR_RECUPERACION, { email });
      setEnlaceEnviado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (modo === 'recuperar') {
    return (
      <Capa titulo={t('cuenta.recuperarContrasena')} onCerrar={() => ir('cerrarModal')}>
        <h3>{t('cuenta.recuperarContrasena')}</h3>
        {enlaceEnviado ? (
          <>
            <p style={{ margin: 0 }} role="status">
              {t('cuenta.siHayCuenta')} <strong>{email}</strong>{t('cuenta.teMandamosEnlace')}
            </p>
            <p className="apagado" style={{ margin: 0 }}>
              {t('cuenta.revisaCorreo')}
            </p>
            <button className="btn btn-primario btn-bloque" type="button" onClick={() => irA('entrar')}>
              {t('cuenta.volverEntrar')}
            </button>
          </>
        ) : (
          <>
            <p className="apagado" style={{ margin: 0 }}>
              {t('cuenta.recuperarTexto')}
            </p>
            <form className="formulario" onSubmit={pedirEnlace}>
              <div className="campo">
                <label htmlFor="recuperar-email">{t('cuenta.correo')}</label>
                <input id="recuperar-email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {error && <p className="error" role="alert">{error}</p>}
              <button className="btn btn-primario btn-bloque" type="submit" disabled={enviando}>
                {enviando && <Loader2 size={18} className="girar" />}
                {t('cuenta.mandarmeEnlace')}
              </button>
            </form>
            <button className="btn btn-texto" type="button" onClick={() => irA('entrar')}>
              {t('cuenta.yaMeAcorde')}
            </button>
          </>
        )}
      </Capa>
    );
  }

  async function manejarEnviar(evento) {
    evento.preventDefault();
    if (creando && confirmacion !== password) return;
    setEnviando(true);
    setError(null);
    try {
      const datos = creando
        ? (await graphqlRequest(MUTATION_CREAR_CUENTA, { nombre, email, password })).crearCuenta
        : (await graphqlRequest(MUTATION_INICIAR_SESION, { email, password })).iniciarSesion;
      iniciarSesion(datos);
      refrescar();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <Capa titulo={creando ? t('cuenta.crearCuenta') : t('comun.entrar')} onCerrar={() => ir('cerrarModal')}>
      <h3>{creando ? t('cuenta.crearCuenta') : t('comun.entrar')}</h3>
      <p className="apagado" style={{ margin: 0 }}>
        {t('cuenta.paraQueSirve')}
      </p>

      <a className="btn btn-secundario btn-bloque btn-google" href={URL_GOOGLE}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.9 6.2C12.5 13.6 17.8 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
          <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C1 16.5 0 20.1 0 24s1 7.5 2.7 10.8l7.8-6.2z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z" />
        </svg>
        {t('cuenta.continuarGoogle')}
      </a>

      <div className="separador" role="presentation">
        <span>{t('cuenta.oConCorreo')}</span>
      </div>

      <form className="formulario" onSubmit={manejarEnviar}>
        {creando && (
          <div className="campo">
            <label htmlFor="entrar-nombre">{t('cuenta.nombre')}</label>
            <input id="entrar-nombre" className="input" required autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
        )}
        <div className="campo">
          <label htmlFor="entrar-email">{t('cuenta.correo')}</label>
          <input id="entrar-email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <CampoPassword
          id="entrar-password"
          etiqueta={t('cuenta.contrasena')}
          ayuda={creando ? t('cuenta.minimo8') : null}
          required
          minLength={creando ? 8 : undefined}
          autoComplete={creando ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          visible={verPassword}
          onAlternar={alternarVer}
        />
        {creando && (
          <CampoPassword
            id="entrar-confirmacion"
            etiqueta={t('cuenta.confirmarContrasena')}
            error={noCoinciden ? t('cuenta.contrasenasNoCoinciden') : null}
            required
            autoComplete="new-password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            visible={verPassword}
            onAlternar={alternarVer}
          />
        )}

        {!creando && (
          <button className="btn btn-texto" type="button" style={{ alignSelf: 'flex-start', marginTop: -12 }} onClick={() => irA('recuperar')}>
            {t('cuenta.olvidasteContrasena')}
          </button>
        )}

        {error && <p className="error" role="alert">{error}</p>}

        <button className="btn btn-primario btn-bloque" type="submit" disabled={enviando || noCoinciden}>
          {enviando && <Loader2 size={18} className="girar" />}
          {creando ? t('cuenta.crearCuenta') : t('comun.entrar')}
        </button>
      </form>

      <button className="btn btn-texto" type="button" onClick={cambiarModo}>
        {creando ? t('cuenta.tienesCuentaEntra') : t('cuenta.noTienesCuenta')}
      </button>
    </Capa>
  );
}
