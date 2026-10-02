import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, ChevronsUpDown, LogIn, LogOut, Receipt, Search, UserRound, Warehouse } from 'lucide-react';
import { useTienda } from '../store/useTienda';
import { leerParametros, rutaActual } from '../lib/rutas';

export default function TopBar() {
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const carrito = useTienda((estado) => estado.carrito);
  const ir = useTienda((estado) => estado.ir);
  const sesion = useTienda((estado) => estado.sesion);
  const cerrarSesion = useTienda((estado) => estado.cerrarSesion);

  const [busqueda, setBusqueda] = useState(() => leerParametros().q);
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

  function manejarBusqueda(evento) {
    evento.preventDefault();
    ir('buscar', { texto: busqueda.trim() });
  }

  return (
    <header className="cabecera">
      <button className="marca" onClick={() => ir('irAHome')} aria-label="EnCaja Autopartes, inicio">
        <span className="marca-logo">EC</span>
        <span className="marca-texto">
          EnCaja
          <small>AUTOPARTES</small>
        </span>
      </button>

      <form className="buscador" role="search" onSubmit={manejarBusqueda}>
        <Search size={18} />
        <input
          ref={campo}
          className="input"
          type="search"
          value={busqueda}
          aria-label="Buscar refacciones"
          placeholder="Balatas, filtros, número de parte…"
          onChange={(evento) => setBusqueda(evento.target.value)}
        />
        <AnimatePresence>
          {!busqueda && (
            <motion.kbd
              className="buscador-tecla"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              /
            </motion.kbd>
          )}
        </AnimatePresence>
      </form>

      <div className="cab-acciones">
        {sesion ? (
          <span className="cuenta">
            <span className="cuenta-nombre" title={sesion.usuario.email}>
              <UserRound size={18} />
              <span>{sesion.usuario.nombre.split(' ')[0]}</span>
            </span>
            <button className="btn-icono cuenta-salir" onClick={cerrarSesion} aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut size={17} />
            </button>
          </span>
        ) : (
          <button className="cab-enlace" onClick={() => ir('abrirEntrar')}>
            <LogIn size={18} />
            <span>Entrar</span>
          </button>
        )}

        <button
          className={ruta.startsWith('/garage') || ruta.startsWith('/vehiculo') ? 'cab-enlace activo' : 'cab-enlace'}
          onClick={() => ir('irAGarage')}
        >
          <Warehouse size={18} />
          <span>Mi garage</span>
        </button>

        <button
          className={vehiculoActivo ? 'placa' : 'placa placa-vacia'}
          onClick={() => ir('abrirSelectorVehiculo')}
          aria-label={vehiculoActivo ? 'Cambiar vehículo activo' : 'Elegir vehículo'}
        >
          <Car size={18} />
          {vehiculoActivo ? (
            <>
              <span>
                <span className="placa-marca">{vehiculoActivo.marca} </span>
                {vehiculoActivo.modelo}
                <span className="placa-anio"> {vehiculoActivo.anio}</span>
              </span>
              <span className="placa-cambiar">Cambiar</span>
            </>
          ) : (
            'Elegir vehículo'
          )}
          {vehiculoActivo && <ChevronsUpDown size={14} />}
        </button>

        <motion.button className="btn-nota" aria-label={`Nota, ${totalItems} piezas`} onClick={() => ir('irACarrito')} whileTap={{ scale: 0.95 }}>
          <Receipt size={18} />
          <span className="btn-nota-texto">Nota</span>
          <AnimatePresence initial={false}>
            {totalItems > 0 && (
              <motion.span
                key={totalItems}
                className="insignia"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 600, damping: 18 }}
              >
                {totalItems}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </header>
  );
}
