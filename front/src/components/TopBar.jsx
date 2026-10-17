import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, ChartBar, ChevronsUpDown, LogIn, LogOut, Moon, Receipt, Search, Sun, Warehouse } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { leerParametros, rutas } from '../lib/rutas';
import { cambiarTema, temaActual } from '../lib/tema';
import { graphqlRequest } from '../graphql/client';
import { QUERY_YO } from '../graphql/queries';
import { comoIsla } from './ui/Isla';

// Isla client:load con HTML generado en el build: la barra se ve antes de que cargue React.
// `ruta` la pasa Astro (la conoce al construir la pagina). Lo que solo sabe el navegador
// (busqueda en la URL, tema, sesion y nota guardadas) se completa al hidratar.
function TopBar({ ruta = '/' }) {
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const carrito = useTienda((estado) => estado.carrito);
  const ir = useTienda((estado) => estado.ir);
  const sesion = useTienda((estado) => estado.sesion);
  const cerrarSesion = useTienda((estado) => estado.cerrarSesion);
  const actualizarUsuario = useTienda((estado) => estado.actualizarUsuario);

  const [busqueda, setBusqueda] = useState('');
  const [tema, setTema] = useState('claro');
  const campo = useRef(null);

  useEffect(() => {
    setBusqueda(leerParametros().q);
    setTema(temaActual());
  }, []);

  // El rol vive en el servidor: si el admin lo cambio (o la cuenta ya no existe), la sesion local se pone al dia.
  const hayToken = Boolean(sesion?.token);
  useEffect(() => {
    if (!hayToken) return;
    graphqlRequest(QUERY_YO)
      .then(({ yo }) => (yo ? actualizarUsuario(yo) : cerrarSesion()))
      .catch(() => {});
  }, [hayToken, actualizarUsuario, cerrarSesion]);

  const totalItems = carrito.reduce((suma, item) => suma + item.cantidad, 0);

  // "/" enfoca el buscador (atajo de mostrador para quien ya sabe el numero de parte).
  useEffect(() => {
    function tecla(evento) {
      const escribiendo = /input|textarea|select/i.test(document.activeElement?.tagName ?? '');
      if (evento.key === '/' && !escribiendo) {
        evento.preventDefault();
        campo.current?.focus();
      }
    }
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  function alternarTema() {
    const nuevo = tema === 'oscuro' ? 'claro' : 'oscuro';
    cambiarTema(nuevo);
    setTema(nuevo);
  }

  function manejarBusqueda(evento) {
    evento.preventDefault();
    ir('buscar', { texto: busqueda.trim() });
  }

  const enGarage = ruta.startsWith('/garage') || ruta.startsWith('/vehiculo');
  const enPanel = ruta.startsWith('/admin');
  // El panel es para el personal: EMPLEADO ve mostrador y pedidos; ADMIN, todo.
  const esPersonal = sesion?.usuario.rol === 'ADMIN' || sesion?.usuario.rol === 'EMPLEADO';

  return (
    <header className="cabecera">
      <div className="rejilla cabecera-fila">
        <a className="marca" href={rutas.home} aria-label="EnCaja Autopartes, inicio">
          <span className="marca-logo" aria-hidden="true" />
        </a>

        <form className="buscador" role="search" onSubmit={manejarBusqueda}>
          <Search size={18} />
          <input
            ref={campo}
            className="input"
            type="search"
            value={busqueda}
            aria-label="Buscar refacciones"
            placeholder="Pieza o número de parte"
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
          <AnimatePresence>
            {!busqueda && (
              <motion.kbd className="buscador-tecla" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                /
              </motion.kbd>
            )}
          </AnimatePresence>
        </form>

        <nav className="cab-acciones" aria-label="Cuenta y navegación">
          {esPersonal && (
            <a
              className={enPanel ? 'cab-enlace activo' : 'cab-enlace'}
              aria-current={enPanel ? 'page' : undefined}
              aria-label="Panel de administración"
              href={rutas.admin}
            >
              <ChartBar />
              <span>Panel</span>
            </a>
          )}

          <a
            className={enGarage ? 'cab-enlace activo' : 'cab-enlace'}
            aria-current={enGarage ? 'page' : undefined}
            aria-label="Garage"
            href={rutas.garage}
          >
            <Warehouse />
            <span>Garage</span>
          </a>

          <button
            className={vehiculoActivo ? 'cab-enlace placa' : 'cab-enlace placa placa-vacia'}
            onClick={() => ir('abrirSelectorVehiculo')}
            aria-label={vehiculoActivo ? `Vehículo activo: ${vehiculoActivo.marca} ${vehiculoActivo.modelo} ${vehiculoActivo.anio}. Cambiar` : 'Elegir vehículo'}
          >
            <Car />
            <span>
              {vehiculoActivo ? (
                <>
                  {vehiculoActivo.modelo}
                  <span className="placa-anio mono"> {vehiculoActivo.anio}</span>
                </>
              ) : (
                'Elegir vehículo'
              )}
            </span>
            <ChevronsUpDown size={14} />
          </button>

          <a className="cab-enlace" href={rutas.carrito} aria-label={`Nota, ${totalItems} piezas`}>
            <Receipt />
            <span>Nota</span>
            <AnimatePresence initial={false} mode="popLayout">
              {totalItems > 0 && (
                <motion.span
                  key={totalItems}
                  className="insignia mono"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                >
                  {totalItems}
                </motion.span>
              )}
            </AnimatePresence>
          </a>

          {sesion ? (
            <span className="cuenta">
              <span className="cuenta-nombre" title={sesion.usuario.email}>
                {sesion.usuario.nombre.split(' ')[0]}
              </span>
              <button className="btn-icono" onClick={cerrarSesion} aria-label="Cerrar sesión" title="Cerrar sesión">
                <LogOut />
              </button>
            </span>
          ) : (
            <button className="cab-enlace" onClick={() => ir('abrirEntrar')} aria-label="Entrar">
              <LogIn />
              <span>Entrar</span>
            </button>
          )}

          <button
            className="btn-icono"
            onClick={alternarTema}
            aria-label={tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'}
          >
            {tema === 'oscuro' ? <Sun /> : <Moon />}
          </button>
        </nav>
      </div>
    </header>
  );
}

export default comoIsla(TopBar);
