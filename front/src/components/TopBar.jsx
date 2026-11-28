import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, ChartBar, ChevronsUpDown, Globe, LogIn, LogOut, Moon, Receipt, Search, Sun, Warehouse } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { esBusqueda, leerParametros, rutas, rutasPara } from '../lib/rutas';
import { useIdioma, useRutas, useT } from '../i18n/react';
import { IDIOMAS, datos } from '../i18n';
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
  const menuIdiomas = useRef(null);

  // El menu de idiomas se cierra con Escape o al hacer clic fuera.
  useEffect(() => {
    const cerrar = (evento) => {
      const menu = menuIdiomas.current;
      if (!menu?.open) return;
      if (evento.type === 'keydown' ? evento.key === 'Escape' : !menu.contains(evento.target)) menu.open = false;
    };
    document.addEventListener('click', cerrar);
    document.addEventListener('keydown', cerrar);
    return () => {
      document.removeEventListener('click', cerrar);
      document.removeEventListener('keydown', cerrar);
    };
  }, []);

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
      setAnuncioNota(totalItems === 1 ? t('barra.anuncioUnaPieza') : t('barra.anuncioPiezas', { n: totalItems }));
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
  // La misma pagina en cada idioma de astro.config.mjs; si no existe en otro idioma (cuenta, pago), su inicio.
  const enIdioma = (codigo) => (alternos?.[codigo] ?? rutasPara(codigo).home) + consulta;

  return (
    <header className="cabecera">
      <div className="rejilla cabecera-fila">
        <a className="marca" href={r.home} aria-label={t('barra.inicio')}>
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
            aria-label={t('barra.buscar')}
            placeholder={t('barra.buscarEjemplo')}
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

        <nav className="cab-acciones" aria-label={t('barra.navegacion')}>
          {esPersonal && (
            <a
              className={enPanel ? 'cab-enlace activo' : 'cab-enlace'}
              aria-current={enPanel ? 'page' : undefined}
              aria-label={t('barra.panelAdministracion')}
              href={rutas.admin}
            >
              <ChartBar />
              <span>{t('barra.panel')}</span>
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
            aria-label={vehiculoActivo ? t('barra.vehiculoActivo', { auto: `${vehiculoActivo.marca} ${vehiculoActivo.modelo} ${vehiculoActivo.anio}` }) : t('barra.elegirVehiculo')}
          >
            <Car />
            <span>
              {vehiculoActivo ? (
                <>
                  {vehiculoActivo.modelo}
                  <span className="placa-anio mono"> {vehiculoActivo.anio}</span>
                </>
              ) : (
                t('barra.elegirVehiculo')
              )}
            </span>
            <ChevronsUpDown size={14} />
          </button>

          <span className="solo-lectores" aria-live="polite">
            {anuncioNota}
          </span>
          <a className="cab-enlace" href={r.carrito} aria-label={t('barra.notaConPiezas', { n: totalItems })}>
            <Receipt />
            <span>{t('comun.nota')}</span>
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
              <button className="btn-icono" onClick={cerrarSesion} aria-label={t('barra.cerrarSesion')} title={t('barra.cerrarSesion')}>
                <LogOut />
              </button>
            </span>
          ) : (
            <button className="cab-enlace" onClick={() => ir('abrirEntrar')} aria-label={t('comun.entrar')}>
              <LogIn />
              <span>{t('comun.entrar')}</span>
            </button>
          )}

          <button
            className="btn-icono"
            onClick={alternarTema}
            aria-label={tema === 'oscuro' ? t('barra.cambiarModoClaro') : t('barra.cambiarModoOscuro')}
            title={tema === 'oscuro' ? t('barra.modoClaro') : t('barra.modoOscuro')}
          >
            {tema === 'oscuro' ? <Sun /> : <Moon />}
          </button>

          {/* Selector de idioma: todos los idiomas de astro.config.mjs, cada uno con la misma pagina en su idioma.
              <details> funciona antes de hidratar (sin JavaScript); hreflang/lang para lectores y buscadores. */}
          <details className="idiomas" ref={menuIdiomas}>
            {/* El nombre accesible incluye el codigo visible (WCAG 2.5.3): "Idioma: Español (ES)". */}
            <summary className="cab-enlace idioma" aria-label={t('barra.idioma', { idioma: `${datos(idioma).idioma.nombre} (${idioma.toUpperCase()})` })}>
              <Globe />
              <span className="idioma-codigo">{idioma.toUpperCase()}</span>
            </summary>
            <ul className="idiomas-lista">
              {IDIOMAS.map((codigo) => (
                <li key={codigo}>
                  <a href={enIdioma(codigo)} hrefLang={codigo} lang={codigo} aria-current={codigo === idioma ? 'true' : undefined}>
                    {datos(codigo).idioma.nombre}
                    <span className="mono">{codigo.toUpperCase()}</span>
                  </a>
                </li>
              ))}
            </ul>
          </details>
        </nav>
      </div>
    </header>
  );
}

export default comoIsla(TopBar);
