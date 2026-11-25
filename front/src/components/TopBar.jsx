import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, ChartBar, ChevronsUpDown, Globe, LogIn, LogOut, Moon, Receipt, Search, Sun, Warehouse } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { esBusqueda, leerParametros, rutas, rutasPara } from '../lib/rutas';
import { useIdioma, useRutas, useT } from '../i18n/react';
import { NOMBRE_IDIOMA } from '../i18n/idiomas';
import { cambiarTema, temaActual } from '../lib/tema';
import { graphqlRequest } from '../graphql/client';
import { QUERY_YO } from '../graphql/queries';
import { comoIsla } from './ui/Isla';

// Isla client:load con HTML generado en el build: la barra se ve antes de que cargue React.
// `ruta` la pasa Astro (la conoce al construir la pagina). Lo que solo sabe el navegador
// (busqueda en la URL, tema, sesion y nota guardadas) se completa al hidratar.
// `alternos`: { es, en } con la misma pagina en cada idioma (selector de idioma); sin ella, el inicio del otro.
function TopBar({ ruta = '/', alternos = null }) {
  const idioma = useIdioma();
  const t = useT();
  const r = useRutas();
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const carrito = useTienda((estado) => estado.carrito);
  const ir = useTienda((estado) => estado.ir);
  const sesion = useTienda((estado) => estado.sesion);
  const cerrarSesion = useTienda((estado) => estado.cerrarSesion);
  const actualizarUsuario = useTienda((estado) => estado.actualizarUsuario);

  const [busqueda, setBusqueda] = useState('');
  const [tema, setTema] = useState('claro');
  const [consulta, setConsulta] = useState('');
  const campo = useRef(null);

  useEffect(() => {
    setBusqueda(leerParametros().q);
    setTema(temaActual());
    // En la busqueda, el selector de idioma conserva lo buscado (?q=).
    if (esBusqueda(ruta)) setConsulta(window.location.search);
  }, [ruta]);

  // El rol vive en el servidor: si el admin lo cambio (o la cuenta ya no existe), la sesion local se pone al dia.
  const hayToken = Boolean(sesion?.token);
  useEffect(() => {
    if (!hayToken) return;
    graphqlRequest(QUERY_YO)
      .then(({ yo }) => (yo ? actualizarUsuario(yo) : cerrarSesion()))
      .catch(() => {});
  }, [hayToken, actualizarUsuario, cerrarSesion]);

  const totalItems = carrito.reduce((suma, item) => suma + item.cantidad, 0);

  // Lectores de pantalla: cuando cambia la nota (no al cargar la pagina) se anuncia cuantas piezas lleva.
  const [anuncioNota, setAnuncioNota] = useState('');
  const piezasAnteriores = useRef(null);
  useEffect(() => {
    if (piezasAnteriores.current !== null && piezasAnteriores.current !== totalItems) {
      setAnuncioNota(totalItems === 1 ? t('Tu nota lleva 1 pieza') : t('Tu nota lleva {n} piezas', { n: totalItems }));
    }
    piezasAnteriores.current = totalItems;
  }, [totalItems, t]);

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
  const otroIdioma = idioma === 'en' ? 'es' : 'en';
  const enOtroIdioma = (alternos?.[otroIdioma] ?? rutasPara(otroIdioma).home) + consulta;

  return (
    <header className="cabecera">
      <div className="rejilla cabecera-fila">
        <a className="marca" href={r.home} aria-label={t('EnCaja Autopartes, inicio')}>
          <span className="marca-logo" aria-hidden="true" />
        </a>

        {/* action/name: antes de hidratar (client:idle) la busqueda funciona como formulario normal: /categoria?q=... */}
        <form className="buscador" role="search" action={r.busqueda('').split('?')[0]} method="get" onSubmit={manejarBusqueda}>
          <Search size={18} />
          <input
            ref={campo}
            className="input"
            type="search"
            name="q"
            value={busqueda}
            aria-label={t('Buscar refacciones')}
            placeholder={t('Pieza o número de parte')}
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

        <nav className="cab-acciones" aria-label={t('Cuenta y navegación')}>
          {esPersonal && (
            <a
              className={enPanel ? 'cab-enlace activo' : 'cab-enlace'}
              aria-current={enPanel ? 'page' : undefined}
              aria-label={t('Panel de administración')}
              href={rutas.admin}
            >
              <ChartBar />
              <span>{t('Panel')}</span>
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
            aria-label={vehiculoActivo ? t('Vehículo activo: {auto}. Cambiar', { auto: `${vehiculoActivo.marca} ${vehiculoActivo.modelo} ${vehiculoActivo.anio}` }) : t('Elegir vehículo')}
          >
            <Car />
            <span>
              {vehiculoActivo ? (
                <>
                  {vehiculoActivo.modelo}
                  <span className="placa-anio mono"> {vehiculoActivo.anio}</span>
                </>
              ) : (
                t('Elegir vehículo')
              )}
            </span>
            <ChevronsUpDown size={14} />
          </button>

          <span className="solo-lectores" aria-live="polite">
            {anuncioNota}
          </span>
          <a className="cab-enlace" href={r.carrito} aria-label={t('Nota, {n} piezas', { n: totalItems })}>
            <Receipt />
            <span>{t('Nota')}</span>
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
              <button className="btn-icono" onClick={cerrarSesion} aria-label={t('Cerrar sesión')} title={t('Cerrar sesión')}>
                <LogOut />
              </button>
            </span>
          ) : (
            <button className="cab-enlace" onClick={() => ir('abrirEntrar')} aria-label={t('Entrar')}>
              <LogIn />
              <span>{t('Entrar')}</span>
            </button>
          )}

          <button
            className="btn-icono"
            onClick={alternarTema}
            aria-label={tema === 'oscuro' ? t('Cambiar a modo claro') : t('Cambiar a modo oscuro')}
            title={tema === 'oscuro' ? t('Modo claro') : t('Modo oscuro')}
          >
            {tema === 'oscuro' ? <Sun /> : <Moon />}
          </button>

          {/* Selector de idioma: la misma pagina en el otro idioma (hreflang/lang para lectores y buscadores). */}
          <a
            className="cab-enlace idioma"
            href={enOtroIdioma}
            hrefLang={otroIdioma}
            lang={otroIdioma}
            // El nombre accesible incluye el codigo visible (WCAG 2.5.3): "English (EN)" / "Español (ES)".
            aria-label={`${NOMBRE_IDIOMA[otroIdioma]} (${otroIdioma.toUpperCase()})`}
            title={otroIdioma === 'en' ? 'Read this page in English' : 'Ver esta página en español'}
          >
            <Globe />
            <span className="idioma-codigo">{otroIdioma.toUpperCase()}</span>
          </a>
        </nav>
      </div>
    </header>
  );
}

export default comoIsla(TopBar);
