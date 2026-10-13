import { useTienda } from '../../store/useTienda';
import { rutas } from '../../lib/rutas';

// Isla client:only que decide si se muestra el panel: solo con sesion de ADMIN.
// El contenido (children) es HTML que Astro ya genero; esta isla solo lo deja pasar o no.
// Es una comodidad de interfaz, no la seguridad: cuando el panel pida datos, el servidor
// debe exigir el rol en cada consulta (exigirAdmin), como ya hace con productos y usuarios.
export default function PuertaAdmin({ children }) {
  const sesion = useTienda((estado) => estado.sesion);
  const ir = useTienda((estado) => estado.ir);

  if (sesion?.usuario.rol === 'ADMIN') return children;

  return (
    <div className="contenedor-medio">
      <div className="vacio">
        <h2>Panel de administración</h2>
        {sesion ? (
          <>
            <p className="apagado">Tu cuenta ({sesion.usuario.email}) no tiene permiso de administración.</p>
            <a className="btn btn-primario" href={rutas.home}>
              Ir al catálogo
            </a>
          </>
        ) : (
          <>
            <p className="apagado">Entra con una cuenta de administración para ver el panel.</p>
            <button className="btn btn-primario" onClick={() => ir('abrirEntrar')}>
              Entrar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
