import { useTienda } from '../../store/useTienda';
import { rutas } from '../../lib/rutas';

// Secciones del panel. El EMPLEADO solo ve las de mostrador; el ADMIN, todas.
const SECCIONES = [
  { ruta: rutas.admin, nombre: 'Mostrador', roles: ['ADMIN', 'EMPLEADO'] },
  { ruta: rutas.adminPedidos, nombre: 'Pedidos', roles: ['ADMIN', 'EMPLEADO'] },
  { ruta: rutas.adminProductos, nombre: 'Productos', roles: ['ADMIN'] },
  { ruta: rutas.adminVehiculos, nombre: 'Vehículos', roles: ['ADMIN'] },
  { ruta: rutas.adminUsuarios, nombre: 'Usuarios', roles: ['ADMIN'] },
  { ruta: rutas.adminAjustes, nombre: 'Ajustes', roles: ['ADMIN'] },
];

export default function MenuPanel({ actual }) {
  const rol = useTienda((estado) => estado.sesion?.usuario.rol);
  const visibles = SECCIONES.filter((seccion) => seccion.roles.includes(rol));
  if (visibles.length === 0) return null;

  return (
    <nav className="filtros panel-menu" aria-label="Secciones del panel">
      {visibles.map((seccion) => (
        <a
          key={seccion.ruta}
          href={seccion.ruta}
          className={seccion.ruta === actual ? 'chip activo' : 'chip'}
          aria-current={seccion.ruta === actual ? 'page' : undefined}
        >
          {seccion.nombre}
        </a>
      ))}
    </nav>
  );
}
