import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTienda } from '../store/useTienda';
import { API_URL, graphqlRequest } from '../graphql/client';
import { MUTATION_CREAR_CUENTA, MUTATION_INICIAR_SESION } from '../graphql/queries';
import Capa from './ui/Capa';

// La ruta de OAuth vive en el mismo servidor que GraphQL: http://localhost:4000/auth/google
const URL_GOOGLE = API_URL.replace(/\/graphql$/, '/auth/google');

// Entrar o crear cuenta. Ambos caminos terminan igual: el backend regresa un JWT y se guarda en el store.
export default function EntrarModal() {
  const ir = useTienda((estado) => estado.ir);
  const iniciarSesion = useTienda((estado) => estado.iniciarSesion);
  const refrescar = useTienda((estado) => estado.refrescar);

  const [modo, setModo] = useState('entrar');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const creando = modo === 'crear';

  async function manejarEnviar(evento) {
    evento.preventDefault();
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
    <Capa titulo={creando ? 'Crear cuenta' : 'Entrar'} onCerrar={() => ir('cerrarModal')}>
      <h3>{creando ? 'Crear cuenta' : 'Entrar'}</h3>
      <p className="apagado" style={{ margin: 0 }}>
        Tu cuenta guarda tu garage y la bitácora de cada vehículo. Para comprar no necesitas cuenta.
      </p>

      <a className="btn btn-secundario btn-bloque btn-google" href={URL_GOOGLE}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.9 6.2C12.5 13.6 17.8 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
          <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C1 16.5 0 20.1 0 24s1 7.5 2.7 10.8l7.8-6.2z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z" />
        </svg>
        Continuar con Google
      </a>

      <div className="separador" role="presentation">
        <span>o con tu correo</span>
      </div>

      <form className="formulario" onSubmit={manejarEnviar}>
        {creando && (
          <div className="campo">
            <label htmlFor="entrar-nombre">Nombre</label>
            <input id="entrar-nombre" className="input" required autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
        )}
        <div className="campo">
          <label htmlFor="entrar-email">Correo</label>
          <input id="entrar-email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="entrar-password">Contraseña</label>
          <input
            id="entrar-password"
            className="input"
            type="password"
            required
            minLength={creando ? 8 : undefined}
            autoComplete={creando ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {creando && <span className="apagado" style={{ fontSize: 12.5 }}>Mínimo 8 caracteres.</span>}
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        <button className="btn btn-primario btn-bloque" type="submit" disabled={enviando}>
          {enviando && <Loader2 size={18} className="girar" />}
          {creando ? 'Crear cuenta' : 'Entrar'}
        </button>
      </form>

      <button className="btn btn-texto" type="button" onClick={() => { setModo(creando ? 'entrar' : 'crear'); setError(null); }}>
        {creando ? '¿Ya tienes cuenta? Entra' : '¿No tienes cuenta? Créala'}
      </button>
    </Capa>
  );
}
