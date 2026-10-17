import { useTienda } from '../../store/useTienda';
import { rutas } from '../../lib/rutas';

// Isla client:only que decide si se muestra una parte del panel segun el rol de la sesion.
// El contenido (children) es HTML que Astro ya genero; esta isla solo lo deja pasar o no.
// Es una comodidad de interfaz, no la seguridad: el servidor vuelve a exigir el rol en cada consulta.
// `silencioso`: sin permiso no muestra nada (para secciones que solo ve el ADMIN dentro de una pagina del personal).
export default function PuertaAdmin({ roles = ['ADMIN', 'EMPLEADO'], silencioso = false, children }) {
  const sesion = useTienda((estado) => estado.sesion);
  const ir = useTienda((estado) => estado.ir);

  if (roles.includes(sesion?.usuario.rol)) return children;
  if (silencioso) return null;

  return (
    <div className="contenedor-medio">
      <div className="vacio">
        <h2>Panel de administración</h2>
        {sesion ? (
          <>
            <p className="apagado">Tu cuenta ({sesion.usuario.email}) no tiene permiso para esta parte del panel.</p>
            <a className="btn btn-primario" href={rutas.home}>
              Ir al catálogo
            </a>
          </>
        ) : (
          <>
            <p className="apagado">Entra con una cuenta del personal de la tienda para ver el panel.</p>
            <button className="btn btn-primario" onClick={() => ir('abrirEntrar')}>
              Entrar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
