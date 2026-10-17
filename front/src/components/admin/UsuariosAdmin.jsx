import { useMemo, useState } from 'react';
import { Search } from '../ui/Iconos';
import { useTienda } from '../../store/useTienda';
import { graphqlRequest } from '../../graphql/client';
import { MUTATION_CAMBIAR_ROL, QUERY_USUARIOS_PANEL } from '../../graphql/queries';
import { useGraphQLQuery } from '../../hooks/useGraphQLQuery';
import { Cargando, ErrorConReintento } from '../EstadoCarga';
import { comoIsla } from '../ui/Isla';

// Lo que puede hacer cada rol (la regla real vive en back/src/dominio/permisos.js).
export const ROLES = [
  ['CLIENTE', 'Cliente', 'Compra, garage y bitácora de sus vehículos, direcciones guardadas y sus pedidos.'],
  ['TALLER', 'Taller', 'Lo mismo que un cliente, con precio de mayoreo (el descuento se define en Ajustes).'],
  ['EMPLEADO', 'Empleado', 'Mostrador: cobra pagos al recoger, ve todos los pedidos y los marca enviados o entregados.'],
  ['ADMIN', 'Administrador', 'Todo: lo del empleado, el catálogo, las fotos, las existencias, los usuarios y los ajustes.'],
];
const NOMBRE_DE_ROL = Object.fromEntries(ROLES.map(([clave, nombre]) => [clave, nombre]));

// Cuentas de la tienda y su rol. El administrador no puede cambiarse el suyo (asi nunca se queda la tienda sin admin).
function UsuariosAdmin() {
  const yo = useTienda((estado) => estado.sesion?.usuario.id);
  const { datos, cargando, error, recargar } = useGraphQLQuery(QUERY_USUARIOS_PANEL);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('TODOS');
  const [roles, setRoles] = useState({});
  const [guardando, setGuardando] = useState(null);
  const [aviso, setAviso] = useState(null);

  const usuarios = useMemo(() => (datos?.usuarios ?? []).map((u) => (roles[u.id] ? { ...u, rol: roles[u.id] } : u)), [datos, roles]);
  const texto = busqueda.trim().toLowerCase();
  const visibles = usuarios.filter(
    (u) => (filtro === 'TODOS' || u.rol === filtro) && (!texto || u.nombre.toLowerCase().includes(texto) || u.email.toLowerCase().includes(texto))
  );

  async function cambiarRol(usuario, rol) {
    setGuardando(usuario.id);
    setAviso(null);
    try {
      const { cambiarRol: cambiado } = await graphqlRequest(MUTATION_CAMBIAR_ROL, { usuarioId: usuario.id, rol });
      setRoles((anteriores) => ({ ...anteriores, [usuario.id]: cambiado.rol }));
      setAviso({ tipo: 'listo', texto: `${usuario.nombre} ahora es ${NOMBRE_DE_ROL[cambiado.rol].toLowerCase()}. Aplica desde su siguiente acción.` });
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message });
    } finally {
      setGuardando(null);
    }
  }

  if (cargando) return <Cargando filas={6} alto={48} />;
  if (error) return <ErrorConReintento mensaje="No se pudieron cargar los usuarios." onReintentar={recargar} />;

  return (
    <>
      <section className="hoja admin-seccion" aria-labelledby="roles-titulo">
        <h4 id="roles-titulo">Qué puede hacer cada rol</h4>
        <dl className="roles">
          {ROLES.map(([clave, nombre, descripcion]) => (
            <div key={clave}>
              <dt>{nombre}</dt>
              <dd className="apagado">{descripcion}</dd>
            </div>
          ))}
        </dl>
        <p className="apagado" style={{ margin: 0 }}>
          Quien compra sin cuenta solo puede comprar y ver su pedido con el enlace de su compra.
        </p>
      </section>

      <section className="hoja admin-seccion" aria-label="Usuarios">
        <div className="hoja-titulo">
          <div className="buscador admin-buscador">
            <Search size={18} />
            <input className="input" type="search" placeholder="Buscar por nombre o correo" aria-label="Buscar usuarios" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <div className="filtros" style={{ marginBottom: 0 }} role="group" aria-label="Filtrar por rol">
            {[['TODOS', 'Todos'], ...ROLES.map(([clave, nombre]) => [clave, nombre])].map(([clave, nombre]) => (
              <button key={clave} type="button" className={filtro === clave ? 'chip activo' : 'chip'} aria-pressed={filtro === clave} onClick={() => setFiltro(clave)}>
                {nombre}
              </button>
            ))}
          </div>
        </div>

        {aviso && (
          <p className={aviso.tipo === 'error' ? 'error' : 'admin-listo'} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
            {aviso.texto}
          </p>
        )}

        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((usuario) => {
                const soyYo = String(usuario.id) === String(yo);
                return (
                  <tr key={usuario.id}>
                    <td>
                      {usuario.nombre}
                      {soyYo && <span className="apagado"> (tú)</span>}
                    </td>
                    <td>{usuario.email}</td>
                    <td>
                      <select
                        className="input tabla-select"
                        aria-label={`Rol de ${usuario.nombre}`}
                        value={usuario.rol}
                        disabled={soyYo || guardando === usuario.id}
                        title={soyYo ? 'No puedes cambiar tu propio rol' : undefined}
                        onChange={(evento) => cambiarRol(usuario, evento.target.value)}
                      >
                        {ROLES.map(([clave, nombre]) => (
                          <option key={clave} value={clave}>
                            {nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visibles.length === 0 && <p className="apagado">Ninguna cuenta coincide.</p>}
        </div>
      </section>
    </>
  );
}

export default comoIsla(UsuariosAdmin);
