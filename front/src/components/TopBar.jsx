import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, ChevronsUpDown, LogIn, LogOut, Moon, Receipt, Search, Sun, Warehouse } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { leerParametros, rutaActual } from '../lib/rutas';
import { cambiarTema, temaActual } from '../lib/tema';

export default function TopBar() {
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const carrito = useTienda((estado) => estado.carrito);
  const ir = useTienda((estado) => estado.ir);
  const sesion = useTienda((estado) => estado.sesion);
  const cerrarSesion = useTienda((estado) => estado.cerrarSesion);

  const [busqueda, setBusqueda] = useState(() => leerParametros().q);
  const [tema, setTema] = useState(() => temaActual());
  const campo = useRef(null);
  const ruta = rutaActual();

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

  return (
    <header className="cabecera">
      <div className="rejilla cabecera-fila">
        <button className="marca" onClick={() => ir('irAHome')} aria-label="EnCaja Autopartes, inicio">
          <span className="marca-cuadro" aria-hidden="true" />
          <span className="marca-texto">EnCaja</span>
          <span className="marca-sub">Autopartes</span>
        </button>

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
          <button
            className={enGarage ? 'cab-enlace activo' : 'cab-enlace'}
            aria-current={enGarage ? 'page' : undefined}
            aria-label="Garage"
            onClick={() => ir('irAGarage')}
          >
            <Warehouse />
            <span>Garage</span>
          </button>

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

          <button className="cab-enlace" onClick={() => ir('irACarrito')} aria-label={`Nota, ${totalItems} piezas`}>
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
          </button>

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
